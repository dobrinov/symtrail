import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";

function setup() {
  const db = makeTestDb();
  migrate(db);
  return new Repo(db, () => "2026-06-11T10:00:00.000Z", () => "uuid-1");
}

test("createProfile stamps id, client_updated_at, dirty", () => {
  const repo = setup();
  const p = repo.createProfile({ name: "Leo", color: "#FEAE2E", sex: "male", birthDate: "2021-02-20", condition: "PFAPA" });
  expect(p.id).toBe("uuid-1");
  const row = repo.db.get<{ dirty: number; client_updated_at: string }>("SELECT dirty, client_updated_at FROM profiles WHERE id = ?", [p.id]);
  expect(row?.dirty).toBe(1);
  expect(row?.client_updated_at).toBe("2026-06-11T10:00:00.000Z");
});

test("createEntry + listEntries for a profile, newest first, hides deleted", () => {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, () => "2026-06-11T10:00:00.000Z", () => `uuid-${++n}`);
  const p = repo.createProfile({ name: "Leo" });
  const e1 = repo.createEntry({ profileId: p.id, entryType: "note", note: "first", recordedAt: "2026-06-10T08:00:00.000Z" });
  const e2 = repo.createEntry({ profileId: p.id, entryType: "temp", tempC: 38.5, recordedAt: "2026-06-11T08:00:00.000Z" });
  expect(repo.listEntries(p.id).map((e) => e.id)).toEqual([e2.id, e1.id]);
  repo.deleteRecord("entries", e2.id);
  expect(repo.listEntries(p.id).map((e) => e.id)).toEqual([e1.id]);
  const del = repo.db.get<{ pending_delete: number }>("SELECT pending_delete FROM entries WHERE id = ?", [e2.id]);
  expect(del?.pending_delete).toBe(1);
});

test("updateEntry restamps client_updated_at and dirty", () => {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, () => "2026-06-11T10:00:00.000Z", () => `uuid-${++n}`);
  const p = repo.createProfile({ name: "Leo" });
  const e = repo.createEntry({ profileId: p.id, entryType: "temp", tempC: 38.5, recordedAt: "2026-06-11T08:00:00.000Z" });
  repo.db.run("UPDATE entries SET dirty = 0 WHERE id = ?", [e.id]);
  repo.updateEntry(e.id, { tempC: 38.9 });
  const row = repo.db.get<{ temp_c: number; dirty: number }>("SELECT temp_c, dirty FROM entries WHERE id = ?", [e.id]);
  expect(row?.temp_c).toBe(38.9);
  expect(row?.dirty).toBe(1);
});

test("catalogue lists hide deleted and sort builtins by insertion", () => {
  const repo = setup();
  repo.upsertFromServer("symptom_types", { id: "s1", label: "Fever", icon: "fever", group_name: "PFAPA", builtin: true, client_updated_at: "2026-06-01T00:00:00Z" });
  repo.upsertFromServer("symptom_types", { id: "s2", label: "Cough", icon: "cough", group_name: "Infection", builtin: true, client_updated_at: "2026-06-01T00:00:00Z" });
  expect(repo.listSymptomTypes().map((s) => s.id)).toEqual(["s1", "s2"]);
});

test("upsertFromServer skips locally dirty rows", () => {
  const repo = setup();
  const p = repo.createProfile({ name: "Leo" }); // dirty = 1
  repo.upsertFromServer("profiles", { id: p.id, name: "Server Leo", client_updated_at: "2026-06-12T00:00:00Z" });
  expect(repo.getProfile(p.id)?.name).toBe("Leo"); // local unpushed edit wins
});

test("upsertFromServer parses temp_c strings from the server", () => {
  const repo = setup();
  repo.upsertFromServer("profiles", { id: "p1", name: "Leo", client_updated_at: "2026-06-01T00:00:00Z" });
  repo.upsertFromServer("entries", { id: "e1", profile_id: "p1", entry_type: "temp", temp_c: "38.5", recorded_at: "2026-06-10T08:00:00Z", client_updated_at: "2026-06-01T00:00:00Z" });
  expect(repo.getEntry("e1")?.tempC).toBe(38.5);
});

test("sync meta get/set roundtrip", () => {
  const repo = setup();
  expect(repo.getMeta("cursor")).toBeNull();
  repo.setMeta("cursor", "42");
  expect(repo.getMeta("cursor")).toBe("42");
});
