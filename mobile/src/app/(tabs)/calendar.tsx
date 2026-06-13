// Calendar route — hosts CalendarScreen, wired to the active profile and the
// log sheet (add-to-day → openLog with a preset date, tap entry → openEntry).
import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { TOKENS } from "../../design/tokens";
import { CalendarScreen } from "../../screens/calendar/CalendarScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

// dayIso is a UTC "YYYY-MM-DD". Combine it with the current wall-clock
// time-of-day (in UTC, to match the app's UTC day bucketing) so the new entry's
// recordedAt prefix is exactly dayIso — landing it on the tapped calendar day.
function dayIsoAtNow(dayIso: string): string {
  const now = new Date();
  const ts = Date.UTC(
    Number(dayIso.slice(0, 4)),
    Number(dayIso.slice(5, 7)) - 1,
    Number(dayIso.slice(8, 10)),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  );
  return new Date(ts).toISOString();
}

export default function Calendar(): React.JSX.Element {
  const { repo, sync, session } = useServices();
  const { openLog, openEntry, openFlare } = useLogSheet();
  const [profileId] = useActiveProfile(repo);
  const [refreshing, setRefreshing] = useState(false);
  // Subscribe to sync_meta so a unit change re-renders this route.
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());

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
        <CalendarScreen
          repo={repo}
          profileId={profileId}
          onAddToDay={(dayIso) => openLog(dayIsoAtNow(dayIso))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.canvas },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, fontFamily: "Sora_600SemiBold", color: TOKENS.grey },
});
