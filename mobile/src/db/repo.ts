import { DbAdapter } from "./adapter";
import { emitTableChange } from "./events";

export type SyncTable = "profiles" | "symptom_types" | "medication_types" | "entries";
export const SYNC_TABLES: SyncTable[] = ["profiles", "symptom_types", "medication_types", "entries"];

export interface Profile { id: string; name: string; sex: string | null; color: string | null; birthDate: string | null; condition: string | null; }
export interface SymptomType { id: string; label: string; icon: string | null; groupName: string | null; builtin: boolean; }
export interface MedicationType { id: string; label: string; brand: string | null; form: string | null; strength: string | null; defaultDose: string | null; color: string | null; kind: string | null; builtin: boolean; }
export interface Entry {
  id: string; profileId: string; entryType: "symptom" | "temp" | "med" | "note";
  recordedAt: string; symptomTypeId: string | null; severity: string | null;
  tempC: number | null; medicationTypeId: string | null; dose: string | null;
  reminderAt: string | null; note: string | null;
}

export interface MedEntryRow { entry: Entry; label: string; color: string | null; strength: string | null; }

const ALIVE = "pending_delete = 0 AND deleted_at IS NULL";

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// better-sqlite3 rejects booleans; SQLite stores them as 0/1 anyway.
function toSqlValue(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

// The server serializes temp_c as a JSON string ("38.5").
function fromServerValue(column: string, value: unknown): unknown {
  if (column === "temp_c" && typeof value === "string") return parseFloat(value);
  return toSqlValue(value);
}

type Row = Record<string, unknown>;

function mapProfile(r: Row): Profile {
  return {
    id: r.id as string,
    name: r.name as string,
    sex: (r.sex as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    birthDate: (r.birth_date as string | null) ?? null,
    condition: (r.condition as string | null) ?? null,
  };
}

function mapSymptomType(r: Row): SymptomType {
  return {
    id: r.id as string,
    label: r.label as string,
    icon: (r.icon as string | null) ?? null,
    groupName: (r.group_name as string | null) ?? null,
    builtin: !!r.builtin,
  };
}

function mapMedicationType(r: Row): MedicationType {
  return {
    id: r.id as string,
    label: r.label as string,
    brand: (r.brand as string | null) ?? null,
    form: (r.form as string | null) ?? null,
    strength: (r.strength as string | null) ?? null,
    defaultDose: (r.default_dose as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    kind: (r.kind as string | null) ?? null,
    builtin: !!r.builtin,
  };
}

function mapEntry(r: Row): Entry {
  return {
    id: r.id as string,
    profileId: r.profile_id as string,
    entryType: r.entry_type as Entry["entryType"],
    recordedAt: r.recorded_at as string,
    symptomTypeId: (r.symptom_type_id as string | null) ?? null,
    severity: (r.severity as string | null) ?? null,
    tempC: (r.temp_c as number | null) ?? null,
    medicationTypeId: (r.medication_type_id as string | null) ?? null,
    dose: (r.dose as string | null) ?? null,
    reminderAt: (r.reminder_at as string | null) ?? null,
    note: (r.note as string | null) ?? null,
  };
}

export class Repo {
  constructor(
    public db: DbAdapter,
    private nowIso: () => string = () => new Date().toISOString(),
    private newId: () => string = () => require("expo-crypto").randomUUID(),
  ) {}

  // ----- profiles -----

  createProfile(p: { name: string; sex?: string | null; color?: string | null; birthDate?: string | null; condition?: string | null }): Profile {
    const id = this.newId();
    this.db.run(
      "INSERT INTO profiles (id, name, sex, color, birth_date, condition, client_updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [id, p.name, p.sex ?? null, p.color ?? null, p.birthDate ?? null, p.condition ?? null, this.nowIso()],
    );
    emitTableChange("profiles");
    return this.getProfile(id)!;
  }

  updateProfile(id: string, patch: Partial<Omit<Profile, "id">>): void {
    this.mutate("profiles", id, patch);
    emitTableChange("profiles");
  }

  getProfile(id: string): Profile | null {
    const r = this.db.get(`SELECT * FROM profiles WHERE id = ? AND ${ALIVE}`, [id]);
    return r ? mapProfile(r) : null;
  }

  listProfiles(): Profile[] {
    return this.db.all(`SELECT * FROM profiles WHERE ${ALIVE} ORDER BY rowid`).map(mapProfile);
  }

  // Marks the profile AND its entries pending_delete so the next sync push
  // tombstones both. The backend deletes children-first via association order
  // and would reject orphaned entries / FK; locally we mark both up front.
  deleteProfileCascade(profileId: string): void {
    this.db.run(`UPDATE entries SET pending_delete = 1 WHERE profile_id = ?`, [profileId]);
    this.db.run(`UPDATE profiles SET pending_delete = 1 WHERE id = ?`, [profileId]);
    emitTableChange("entries");
    emitTableChange("profiles");
  }

  // ----- catalogues -----

  createSymptomType(p: { label: string; icon?: string | null; groupName?: string | null }): SymptomType {
    const id = this.newId();
    this.db.run(
      "INSERT INTO symptom_types (id, label, icon, group_name, builtin, client_updated_at, dirty) VALUES (?, ?, ?, ?, 0, ?, 1)",
      [id, p.label, p.icon ?? null, p.groupName ?? null, this.nowIso()],
    );
    emitTableChange("symptom_types");
    const r = this.db.get("SELECT * FROM symptom_types WHERE id = ?", [id]);
    return mapSymptomType(r!);
  }

  createMedicationType(p: { label: string; brand?: string | null; form?: string | null; strength?: string | null; defaultDose?: string | null; color?: string | null; kind?: string | null }): MedicationType {
    const id = this.newId();
    this.db.run(
      "INSERT INTO medication_types (id, label, brand, form, strength, default_dose, color, kind, builtin, client_updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)",
      [id, p.label, p.brand ?? null, p.form ?? null, p.strength ?? null, p.defaultDose ?? null, p.color ?? null, p.kind ?? null, this.nowIso()],
    );
    emitTableChange("medication_types");
    const r = this.db.get("SELECT * FROM medication_types WHERE id = ?", [id]);
    return mapMedicationType(r!);
  }

  listSymptomTypes(): SymptomType[] {
    return this.db.all(`SELECT * FROM symptom_types WHERE ${ALIVE} ORDER BY rowid`).map(mapSymptomType);
  }

  listMedicationTypes(): MedicationType[] {
    return this.db.all(`SELECT * FROM medication_types WHERE ${ALIVE} ORDER BY rowid`).map(mapMedicationType);
  }

  // ----- entries -----

  createEntry(p: {
    profileId: string; entryType: Entry["entryType"]; recordedAt: string;
    symptomTypeId?: string | null; severity?: string | null; tempC?: number | null;
    medicationTypeId?: string | null; dose?: string | null; reminderAt?: string | null; note?: string | null;
  }): Entry {
    const id = this.newId();
    this.db.run(
      `INSERT INTO entries (id, profile_id, entry_type, recorded_at, symptom_type_id, severity, temp_c, medication_type_id, dose, reminder_at, note, client_updated_at, dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, p.profileId, p.entryType, p.recordedAt,
        p.symptomTypeId ?? null, p.severity ?? null, p.tempC ?? null,
        p.medicationTypeId ?? null, p.dose ?? null, p.reminderAt ?? null, p.note ?? null,
        this.nowIso(),
      ],
    );
    emitTableChange("entries");
    return this.getEntry(id)!;
  }

  updateEntry(id: string, patch: Partial<Omit<Entry, "id">>): void {
    this.mutate("entries", id, patch);
    emitTableChange("entries");
  }

  getEntry(id: string): Entry | null {
    const r = this.db.get(`SELECT * FROM entries WHERE id = ? AND ${ALIVE}`, [id]);
    return r ? mapEntry(r) : null;
  }

  listEntries(profileId: string): Entry[] {
    return this.db
      .all(`SELECT * FROM entries WHERE profile_id = ? AND ${ALIVE} ORDER BY recorded_at DESC`, [profileId])
      .map(mapEntry);
  }

  // Med entries for the profile joined to medication_types for label/colour/
  // strength (newest first). LEFT JOIN so an entry whose type was deleted still
  // shows with a "Medication" fallback.
  listMedEntries(profileId: string): MedEntryRow[] {
    const rows = this.db.all<Row>(
      `SELECT e.*, m.label AS m_label, m.color AS m_color, m.strength AS m_strength
       FROM entries e LEFT JOIN medication_types m ON m.id = e.medication_type_id
       WHERE e.profile_id = ? AND e.entry_type = 'med' AND e.pending_delete = 0 AND e.deleted_at IS NULL
       ORDER BY e.recorded_at DESC`,
      [profileId],
    );
    return rows.map((r) => ({
      entry: mapEntry(r),
      label: (r.m_label as string | null) ?? "Medication",
      color: (r.m_color as string | null) ?? null,
      strength: (r.m_strength as string | null) ?? null,
    }));
  }

  // ----- sync plumbing -----

  deleteRecord(table: SyncTable, id: string): void {
    this.db.run(`UPDATE ${table} SET pending_delete = 1 WHERE id = ?`, [id]);
    emitTableChange(table);
  }

  upsertFromServer(table: SyncTable, record: Record<string, unknown>): void {
    const existing = this.db.get<{ dirty: number; pending_delete: number }>(
      `SELECT dirty, pending_delete FROM ${table} WHERE id = ?`, [record.id],
    );
    // Unpushed local edit or delete wins until pushed (push resolves via LWW).
    if (existing && (existing.dirty === 1 || existing.pending_delete === 1)) return;

    // Whitelist against the local schema: a newer server may send columns an
    // older app doesn't know yet, and an unknown column would error the INSERT
    // and break sync for everyone on the old version.
    const known = new Set(
      this.db.all<{ name: string }>(`PRAGMA table_info(${table})`).map((r) => r.name),
    );
    const merged: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      if (v === undefined || !known.has(k)) continue;
      merged[k] = fromServerValue(k, v);
    }
    merged.dirty = 0;
    merged.pending_delete = 0;
    merged.deleted_at = merged.deleted_at ?? null;

    const cols = Object.keys(merged);
    const placeholders = cols.map(() => "?").join(", ");
    const updates = cols.filter((c) => c !== "id").map((c) => `${c} = excluded.${c}`).join(", ");
    this.db.run(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`,
      cols.map((c) => merged[c]),
    );
    emitTableChange(table);
  }

  hardDelete(table: SyncTable, id: string): void {
    this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    emitTableChange(table);
  }

  getMeta(key: string): string | null {
    const r = this.db.get<{ value: string }>("SELECT value FROM sync_meta WHERE key = ?", [key]);
    return r?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.run(
      "INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  }

  wipeAll(): void {
    for (const table of SYNC_TABLES) this.db.run(`DELETE FROM ${table}`);
    this.db.run("DELETE FROM sync_meta");
    this.db.run("DELETE FROM reminder_notifications");
    for (const table of SYNC_TABLES) emitTableChange(table);
  }

  // Builds a partial UPDATE: undefined values are skipped (so partial patches
  // work), explicit null clears a column. Restamps client_updated_at + dirty.
  private mutate(table: SyncTable, id: string, patch: Record<string, unknown>): void {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      sets.push(`${camelToSnake(k)} = ?`);
      values.push(toSqlValue(v));
    }
    sets.push("client_updated_at = ?", "dirty = 1");
    values.push(this.nextStamp(table, id), id);
    this.db.run(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`, values);
  }

  // Hybrid-logical-clock stamp: an edit must outrank the timestamp this device
  // has already seen on the row, or a device with a lagging wall clock would
  // have its own newest edit rejected as "stale" by the server's LWW.
  private nextStamp(table: SyncTable, id: string): string {
    const now = this.nowIso();
    const row = this.db.get<{ client_updated_at: string }>(
      `SELECT client_updated_at FROM ${table} WHERE id = ?`, [id],
    );
    const prev = row ? Date.parse(row.client_updated_at) : NaN;
    if (Number.isNaN(prev) || Date.parse(now) > prev) return now;
    return new Date(prev + 1).toISOString();
  }
}
