// Today route — hosts TodayScreen plus the profile-switcher sheet.
import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { Sheet } from "../../design/Sheet";
import { themedStyles } from "../../design/theme";
import { useT } from "../../i18n";
import { ProfileSwitcher } from "../../screens/today/ProfileSwitcher";
import { TodayScreen } from "../../screens/today/TodayScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

export default function Today(): React.JSX.Element {
  const styles = useStyles();
  const s = useT();
  const { repo, sync, session } = useServices();
  const router = useRouter();
  const { openEntry, openFlare } = useLogSheet();
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
          onOpenEntry={(id) => openEntry(id)}
          onOpenFlare={(flare) => openFlare(flare)}
          onViewAll={() => router.push(`/(tabs)/calendar?view=list&ts=${Date.now()}`)}
          tempUnit={tempUnit}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{s.addPersonToStart}</Text>
        </View>
      )}

      <Sheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} title={s.switchPerson}>
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

const useStyles = themedStyles((t) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: t.canvas,
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
    color: t.grey,
  },
}));
