import { DbAdapter } from "./adapter";

export const SCHEMA_VERSION = 1;

// Mirrors the server's syncable tables + local-only sync bookkeeping
// (dirty, pending_delete) + sync_meta + reminder bookkeeping.
const V1 = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sex TEXT,
  color TEXT,
  birth_date TEXT,
  condition TEXT,
  client_updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  pending_delete INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS symptom_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT,
  group_name TEXT,
  builtin INTEGER NOT NULL DEFAULT 0,
  client_updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  pending_delete INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS medication_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  brand TEXT,
  form TEXT,
  strength TEXT,
  default_dose TEXT,
  color TEXT,
  kind TEXT,
  builtin INTEGER NOT NULL DEFAULT 0,
  client_updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  pending_delete INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  symptom_type_id TEXT,
  severity TEXT,
  temp_c REAL,
  medication_type_id TEXT,
  dose TEXT,
  reminder_at TEXT,
  note TEXT,
  client_updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  pending_delete INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entries_profile_recorded ON entries (profile_id, recorded_at);
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reminder_notifications (
  entry_id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL
);
`;

export function migrate(db: DbAdapter): void {
  const row = db.all<{ user_version: number }>("PRAGMA user_version");
  const current = row[0]?.user_version ?? 0;
  if (current < 1) {
    db.exec(V1);
    db.exec("PRAGMA user_version = 1");
  }
  // future migrations: if (current < 2) { ... }
}
