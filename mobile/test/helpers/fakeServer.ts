import { PullResponse, PushChanges, PushResponse } from "../../src/api/types";

type Row = Record<string, unknown> & { id: string; client_updated_at: string; server_version: number; deleted_at: string | null };
const TABLES = ["profiles", "symptom_types", "medication_types", "entries"] as const;

export class FakeServer {
  version = 0;
  tables: Record<string, Map<string, Row>> = Object.fromEntries(TABLES.map((t) => [t, new Map()]));

  push(changes: PushChanges): PushResponse {
    const accepted: string[] = [];
    const rejected: { id: string; reason: string }[] = [];
    for (const t of TABLES) {
      for (const rec of changes[t]?.updated ?? []) {
        const id = rec.id as string;
        const existing = this.tables[t].get(id);
        const incoming = rec.client_updated_at as string;
        if (existing && existing.client_updated_at > incoming) { rejected.push({ id, reason: "stale" }); continue; }
        if (existing && existing.client_updated_at === incoming) { accepted.push(id); continue; }
        this.tables[t].set(id, { ...(existing ?? {}), ...rec, id, client_updated_at: incoming, server_version: ++this.version, deleted_at: null } as Row);
        accepted.push(id);
      }
      for (const id of changes[t]?.deleted ?? []) {
        const existing = this.tables[t].get(id);
        if (existing) { existing.deleted_at = "2026-01-01T00:00:00Z"; existing.server_version = ++this.version; }
        accepted.push(id);
      }
    }
    return { accepted, rejected };
  }

  pull(since: number): PullResponse {
    const changes: PullResponse["changes"] = {};
    for (const t of TABLES) {
      const rows = [...this.tables[t].values()].filter((r) => r.server_version > since);
      changes[t] = {
        updated: rows.filter((r) => !r.deleted_at).map(({ server_version, deleted_at, ...rest }) => rest),
        deleted: rows.filter((r) => r.deleted_at).map((r) => r.id),
      };
    }
    return { changes, cursor: this.version };
  }
}
