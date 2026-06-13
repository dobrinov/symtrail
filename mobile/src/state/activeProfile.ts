import { useCallback } from "react";
import { emitTableChange } from "../db/events";
import { Repo } from "../db/repo";
import { useQuery } from "../db/useQuery";

/** Selected profile id, persisted in sync_meta; falls back to the first profile. */
export function useActiveProfile(repo: Repo): [string | null, (id: string) => void] {
  const effective = useQuery(["profiles", "sync_meta"], () => {
    const stored = repo.getMeta("active_profile");
    const profiles = repo.listProfiles();
    return stored && profiles.some((p) => p.id === stored) ? stored : profiles[0]?.id ?? null;
  });
  const set = useCallback(
    (next: string) => {
      repo.setMeta("active_profile", next);
      // setMeta doesn't emit; nudge watchers via the sync_meta channel
      emitTableChange("sync_meta");
    },
    [repo],
  );
  return [effective, set];
}
