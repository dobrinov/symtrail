import { SessionStore } from "../../src/session/store";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";

function makeStore() {
  const db = makeTestDb();
  migrate(db);
  const repo = new Repo(db, undefined, () => "id-1");
  const secure = new Map<string, string>();
  const store = new SessionStore(repo, {
    get: async (k) => secure.get(k) ?? null,
    set: async (k, v) => { secure.set(k, v); },
    delete: async (k) => { secure.delete(k); },
  });
  return { store, repo, secure };
}

test("signedIn persists token and account email", async () => {
  const { store, secure } = makeStore();
  await store.signedIn("tok", { id: 7, email: "a@b.com", settings: { temp_unit: "c" } });
  expect(secure.get("auth_token")).toBe("tok");
  expect(await store.getToken()).toBe("tok");
  expect(store.tempUnit()).toBe("c");
});

test("signing into a DIFFERENT account wipes local data; same account keeps it", async () => {
  const { store, repo } = makeStore();
  await store.signedIn("tok1", { id: 7, email: "a@b.com", settings: { temp_unit: "c" } });
  repo.createProfile({ name: "Leo" });
  await store.signedOut();
  expect(repo.listProfiles()).toHaveLength(1); // sign-out keeps data

  await store.signedIn("tok2", { id: 7, email: "a@b.com", settings: { temp_unit: "c" } });
  expect(repo.listProfiles()).toHaveLength(1); // same account resumes

  await store.signedIn("tok3", { id: 9, email: "other@b.com", settings: { temp_unit: "c" } });
  expect(repo.listProfiles()).toHaveLength(0); // different account wipes + will re-sync
  expect(repo.getMeta("cursor")).toBeNull();
});

test("setTempUnit updates the cached unit", () => {
  const { store } = makeStore();
  store.setTempUnit("f");
  expect(store.tempUnit()).toBe("f");
});
