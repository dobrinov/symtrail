import { Repo, SYNC_TABLES, SyncTable } from "../db/repo";
import { PushChanges, PullResponse, PushResponse } from "../api/types";
import { LOCAL_ONLY } from "../config";

interface SyncApi {
  syncPush(changes: PushChanges): Promise<PushResponse>;
  syncPull(since: number): Promise<PullResponse>;
}

// Columns sent to the server per table (matches backend SYNC_ATTRIBUTES).
const PUSH_COLUMNS: Record<SyncTable, string[]> = {
  profiles: ["name", "sex", "color", "birth_date", "condition"],
  symptom_types: ["label", "icon", "group_name", "builtin"],
  medication_types: ["label", "brand", "form", "strength", "default_dose", "color", "kind", "builtin"],
  entries: ["profile_id", "entry_type", "recorded_at", "symptom_type_id", "severity", "temp_c", "medication_type_id", "dose", "reminder_at", "note"],
};

export class SyncClient {
  private running = false;
  public lastSyncedAt: string | null = null;

  constructor(
    private repo: Repo,
    private api: SyncApi,
    /** Called when the server rejects our token (401): clear token, route to auth. */
    private onUnauthorized: () => void = () => {},
  ) {}

  /** Push dirty + deletes, then pull. Returns true on success, false on any failure (silent). */
  async syncNow(): Promise<boolean> {
    if (LOCAL_ONLY) return false; // backend disabled: nothing to push/pull
    if (this.running) return false;
    this.running = true;
    try {
      await this.push();
      await this.pullOnly();
      this.lastSyncedAt = new Date().toISOString();
      return true;
    } catch (e) {
      if ((e as { status?: number }).status === 401) this.onUnauthorized();
      return false; // offline / server error: retry on next trigger
    } finally {
      this.running = false;
    }
  }

  private async push(): Promise<void> {
    const changes: PushChanges = {};
    let any = false;
    for (const table of SYNC_TABLES) {
      const updated = this.repo.db.all<Record<string, unknown>>(
        `SELECT * FROM ${table} WHERE dirty = 1 AND pending_delete = 0`
      ).map((row) => {
        const rec: Record<string, unknown> = { id: row.id, client_updated_at: row.client_updated_at };
        for (const c of PUSH_COLUMNS[table]) {
          let v = row[c];
          if (c === "builtin") v = !!v;
          rec[c] = v ?? null;
        }
        return rec;
      });
      const deleted = this.repo.db.all<{ id: string }>(
        `SELECT id FROM ${table} WHERE pending_delete = 1`
      ).map((r) => r.id);
      if (updated.length || deleted.length) {
        changes[table] = { updated, deleted };
        any = true;
      }
    }
    if (!any) return;

    const res = await this.api.syncPush(changes);
    const accepted = new Set(res.accepted);
    const rejected = new Map(res.rejected.map((r) => [r.id, r.reason]));
    let hadStale = false;
    for (const table of SYNC_TABLES) {
      const tc = changes[table];
      if (!tc) continue;
      for (const rec of tc.updated ?? []) {
        const id = rec.id as string;
        if (accepted.has(id) || rejected.has(id)) {
          // accepted → synced; stale/invalid → stop retrying (pull brings the winner)
          this.repo.db.run(`UPDATE ${table} SET dirty = 0 WHERE id = ? AND client_updated_at = ?`, [id, rec.client_updated_at]);
          if (rejected.get(id) === "stale") hadStale = true;
          if (rejected.get(id) === "invalid") console.warn(`[sync] ${table}/${id} rejected as invalid`);
        }
      }
      for (const id of tc.deleted ?? []) {
        if (accepted.has(id)) this.repo.hardDelete(table, id);
      }
    }
    // A stale rejection does NOT bump server_version on the backend, so a
    // cursor-based pull would never re-deliver the winning row. Reset the
    // cursor so the next pull replays everything (upserts are idempotent)
    // and the local loser gets overwritten by the server's winner.
    if (hadStale) this.repo.setMeta("cursor", "0");
  }

  async pullOnly(): Promise<void> {
    const since = Number(this.repo.getMeta("cursor") ?? "0");
    const res = await this.api.syncPull(since);
    for (const table of SYNC_TABLES) {
      const tc = res.changes[table];
      if (!tc) continue;
      for (const rec of tc.updated) this.repo.upsertFromServer(table, rec);
      for (const id of tc.deleted) {
        // A locally dirty row survives an incoming tombstone: the next push
        // resurrects it server-side (matching the backend's LWW semantics,
        // where an update clears deleted_at).
        const local = this.repo.db.get<{ dirty: number }>(
          `SELECT dirty FROM ${table} WHERE id = ?`, [id],
        );
        if (local?.dirty === 1) continue;
        this.repo.hardDelete(table, id);
      }
    }
    this.repo.setMeta("cursor", String(res.cursor));
  }
}
