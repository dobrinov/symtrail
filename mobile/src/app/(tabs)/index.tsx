// Today route — hosts TodayScreen plus the profile-switcher sheet.
import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { Sheet } from "../../design/Sheet";
import { TOKENS } from "../../design/tokens";
import { ProfileSwitcher } from "../../screens/today/ProfileSwitcher";
import { TodayScreen } from "../../screens/today/TodayScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

export default function Today(): React.JSX.Element {
  const { repo, sync, session } = useServices();
  const router = useRouter();
  const { openLog, openEntry, openFlare } = useLogSheet();
  // Subscribe to sync_meta so a unit change re-renders this route.
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());
  const [profileId, setActiveProfile] = useActiveProfile(repo);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await sync.syncNow();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      {profileId ? (
        <TodayScreen
          repo={repo}
          profileId={profileId}
          onSwitchProfile={() => setSwitcherOpen(true)}
          onLog={() => openLog()}
          onOpenEntry={(id) => openEntry(id)}
          onOpenFlare={(flare) => openFlare(flare)}
          tempUnit={tempUnit}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add a person to get started</Text>
        </View>
      )}

      <Sheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Switch person">
        <ProfileSwitcher
          repo={repo}
          activeId={profileId}
          onPick={(id) => {
            setActiveProfile(id);
            setSwitcherOpen(false);
          }}
          onAddPerson={() => {
            setSwitcherOpen(false);
            router.push("/(tabs)/profile");
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.canvas,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.grey,
  },
});
