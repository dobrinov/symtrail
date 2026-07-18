// Search route — pushed from the Today header. Hosts its own LogSheetProvider
// + LogSheetHost so tapping a result opens the same entry detail/edit sheets
// as everywhere else (the tabs' provider is scoped to the tabs layout).
import React from "react";
import { useRouter } from "expo-router";
import { useServices } from "../AppServices";
import { useQuery } from "../db/useQuery";
import { LogSheetHost } from "../screens/log/LogSheetHost";
import { SearchScreen } from "../screens/search/SearchScreen";
import { useActiveProfile } from "../state/activeProfile";
import { LogSheetProvider, useLogSheet } from "../state/LogSheetContext";

function SearchInner(): React.JSX.Element | null {
  const { repo, session } = useServices();
  const router = useRouter();
  const { openEntry } = useLogSheet();
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());
  const [profileId] = useActiveProfile(repo);
  if (!profileId) return null;
  return (
    <SearchScreen
      repo={repo}
      profileId={profileId}
      tempUnit={tempUnit}
      onBack={() => router.back()}
      onOpenEntry={(id) => openEntry(id)}
    />
  );
}

export default function Search(): React.JSX.Element {
  return (
    <LogSheetProvider>
      <SearchInner />
      <LogSheetHost />
    </LogSheetProvider>
  );
}
