import { openDatabaseSync } from "expo-sqlite";
import { expoAdapter } from "./adapter";
import { migrate } from "./schema";
import { Repo } from "./repo";

let repo: Repo | null = null;
export function getRepo(): Repo {
  if (!repo) {
    const db = expoAdapter(openDatabaseSync("symtrail.db"));
    migrate(db);
    repo = new Repo(db);
  }
  return repo;
}
