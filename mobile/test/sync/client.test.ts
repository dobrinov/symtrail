import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { SyncClient } from "../../src/sync/client";
import { FakeServer } from "../helpers/fakeServer";
import { PullResponse, PushChanges, PushResponse } from "../../src/api/types";

function device(server: FakeServer, idPrefix: string) {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  // Modern base: stamps must postdate the "ancient" 1999 timestamp used in the
  // stale-rejection test (a 1970-epoch base would make 1999 the newest write).
  let clock = Date.parse("2026-06-01T00:00:00.000Z");
  const repo = new Repo(db, () => new Date((clock += 1000)).toISOString(), () => `${idPrefix}-${++n}`);
  const api = {
    syncPush: async (changes: PushChanges): Promise<PushResponse> => server.push(changes),
    syncPull: async (since: number): Promise<PullResponse> => server.pull(since),
  };
  return { repo, sync: new SyncClient(repo, api) };
}

test("push uploads dirty rows and clears flags; pull stores cursor", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const p = a.repo.createProfile({ name: "Leo" });
  await a.sync.syncNow();
  expect(a.repo.db.get<{ dirty: number }>("SELECT dirty FROM profiles WHERE id = ?", [p.id])?.dirty).toBe(0);
  expect(Number(a.repo.getMeta("cursor"))).toBeGreaterThan(0);
  expect(server.tables.profiles.get(p.id)?.name).toBe("Leo");
});

test("two devices converge: create on A, edit on B, delete on A", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const b = device(server, "b");

  const p = a.repo.createProfile({ name: "Leo" });
  const e = a.repo.createEntry({ profileId: p.id, entryType: "temp", tempC: 38.5, recordedAt: "2026-06-10T07:45:00.000Z" });
  await a.sync.syncNow();
  await b.sync.syncNow();
  expect(b.repo.getProfile(p.id)?.name).toBe("Leo");
  expect(b.repo.getEntry(e.id)?.tempC).toBe(38.5);

  b.repo.updateEntry(e.id, { tempC: 38.9 });
  await b.sync.syncNow();
  await a.sync.syncNow();
  expect(a.repo.getEntry(e.id)?.tempC).toBe(38.9);

  a.repo.deleteRecord("entries", e.id);
  await a.sync.syncNow();
  await b.sync.syncNow();
  expect(b.repo.getEntry(e.id)).toBeNull();
});

test("pull skips locally dirty rows (unpushed edits win until pushed)", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const b = device(server, "b");
  const p = a.repo.createProfile({ name: "Leo" });
  await a.sync.syncNow();
  await b.sync.syncNow();

  b.repo.updateProfile(p.id, { name: "Leonardo (local)" });
  a.repo.updateProfile(p.id, { name: "Leo A" });
  await a.sync.syncNow();

  await b.sync.pullOnly();
  expect(b.repo.getProfile(p.id)?.name).toBe("Leonardo (local)");
});

test("stale rejection clears dirty and next pull delivers the winner", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const b = device(server, "b");
  const p = a.repo.createProfile({ name: "Leo" });
  await a.sync.syncNow();
  await b.sync.syncNow();

  b.repo.db.run("UPDATE profiles SET name = 'Old', dirty = 1, client_updated_at = '1999-01-01T00:00:00.000Z' WHERE id = ?", [p.id]);
  await b.sync.syncNow();
  expect(b.repo.db.get<{ dirty: number }>("SELECT dirty FROM profiles WHERE id = ?", [p.id])?.dirty).toBe(0);
  expect(b.repo.getProfile(p.id)?.name).toBe("Leo");
});

test("sync failure leaves dirty rows intact for retry", async () => {
  const a = device(new FakeServer(), "a");
  const failingApi = {
    syncPush: async () => { throw new Error("offline"); },
    syncPull: async () => { throw new Error("offline"); },
  };
  const sync = new SyncClient(a.repo, failingApi as never);
  const p = a.repo.createProfile({ name: "Leo" });
  await expect(sync.syncNow()).resolves.toBe(false);
  expect(a.repo.db.get<{ dirty: number }>("SELECT dirty FROM profiles WHERE id = ?", [p.id])?.dirty).toBe(1);
});

test("401 triggers the onUnauthorized callback", async () => {
  const a = device(new FakeServer(), "a");
  const unauthorizedApi = {
    syncPush: async () => { const e: any = new Error("Invalid or expired token"); e.status = 401; throw e; },
    syncPull: async () => { const e: any = new Error("Invalid or expired token"); e.status = 401; throw e; },
  };
  const onUnauthorized = jest.fn();
  const sync = new SyncClient(a.repo, unauthorizedApi as never, onUnauthorized);
  a.repo.createProfile({ name: "Leo" });
  await sync.syncNow();
  expect(onUnauthorized).toHaveBeenCalled();
});

test("pull does not resurrect an unpushed local delete", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const b = device(server, "b");
  const p = a.repo.createProfile({ name: "Leo" });
  await a.sync.syncNow();
  await b.sync.syncNow();

  // B deletes locally (offline); A edits and pushes the same profile.
  b.repo.deleteRecord("profiles", p.id);
  a.repo.updateProfile(p.id, { name: "Leo A" });
  await a.sync.syncNow();

  // B pulls without pushing first: the pending delete must survive.
  await b.sync.pullOnly();
  expect(b.repo.getProfile(p.id)).toBeNull();
  const row = b.repo.db.get<{ pending_delete: number }>(
    "SELECT pending_delete FROM profiles WHERE id = ?", [p.id]);
  expect(row?.pending_delete).toBe(1);
});

test("incoming tombstone does not destroy a locally dirty edit", async () => {
  const server = new FakeServer();
  const a = device(server, "a");
  const b = device(server, "b");
  const p = a.repo.createProfile({ name: "Leo" });
  await a.sync.syncNow();
  await b.sync.syncNow();

  // A deletes and pushes; B edits locally and pulls before pushing.
  a.repo.deleteRecord("profiles", p.id);
  await a.sync.syncNow();
  b.repo.updateProfile(p.id, { name: "Leo edited" });
  await b.sync.pullOnly();

  // B's dirty edit survives the tombstone; its next push resurrects server-side.
  expect(b.repo.getProfile(p.id)?.name).toBe("Leo edited");
  await b.sync.syncNow();
  expect(server.tables.profiles.get(p.id)?.deleted_at).toBeNull();
  expect(server.tables.profiles.get(p.id)?.name).toBe("Leo edited");
});
