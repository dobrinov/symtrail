import { makeTestDb } from "../helpers/testDb";
import { migrate, SCHEMA_VERSION } from "../../src/db/schema";

test("migrate creates all tables and stamps user_version", () => {
  const db = makeTestDb();
  migrate(db);
  const tables = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).map((r) => r.name);
  for (const t of ["profiles", "symptom_types", "medication_types", "entries", "sync_meta", "reminder_notifications"]) {
    expect(tables).toContain(t);
  }
  const v = db.all<{ user_version: number }>("PRAGMA user_version")[0];
  expect(v.user_version).toBe(SCHEMA_VERSION);
});

test("migrate is idempotent", () => {
  const db = makeTestDb();
  migrate(db);
  migrate(db); // second run must not throw
  expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
});
