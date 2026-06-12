// Minimal SQLite surface used by the app. Production: expo-sqlite.
// Tests: better-sqlite3 (same SQL dialect).
export interface DbAdapter {
  exec(sql: string): void;
  run(sql: string, params?: unknown[]): void;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
}

import type { SQLiteDatabase } from "expo-sqlite";
export function expoAdapter(db: SQLiteDatabase): DbAdapter {
  return {
    exec: (sql) => db.execSync(sql),
    run: (sql, params = []) => { db.runSync(sql, params as never[]); },
    all: (sql, params = []) => db.getAllSync(sql, params as never[]) as never,
    get: (sql, params = []) => (db.getFirstSync(sql, params as never[]) ?? undefined) as never,
  };
}
