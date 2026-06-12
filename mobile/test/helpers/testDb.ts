import Database from "better-sqlite3";
import { DbAdapter } from "../../src/db/adapter";

export function makeTestDb(): DbAdapter {
  const db = new Database(":memory:");
  return {
    exec: (sql) => { db.exec(sql); },
    run: (sql, params = []) => { db.prepare(sql).run(...(params as never[])); },
    all: (sql, params = []) => db.prepare(sql).all(...(params as never[])) as never,
    get: (sql, params = []) => db.prepare(sql).get(...(params as never[])) as never,
  };
}
