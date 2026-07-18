// Calendar route — hosts CalendarScreen, wired to the active profile and the
// log sheet (add-to-day → openLog with a preset date, tap entry → openEntry).
// The month/list view mode lives here so other tabs can deep-link into list
// mode via the `view` search param (Today's "View all" pushes ?view=list&ts=…;
// ts makes repeat pushes distinct so the effect re-fires).
import React, { useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { themedStyles } from "../../design/theme";
import { useT } from "../../i18n";
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
  const styles = useStyles();
  const s = useT();
  const { repo, sync, session } = useServices();
  const { openLog, openEntry, openFlare } = useLogSheet();
  const [profileId] = useActiveProfile(repo);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"month" | "list">("month");
  // Subscribe to sync_meta so a unit change re-renders this route.
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());

  const params = useLocalSearchParams<{ view?: string; ts?: string }>();
  useEffect(() => {
    if (params.view === "list" || params.view === "month") setMode(params.view);
  }, [params.view, params.ts]);

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
          mode={mode}
          onModeChange={setMode}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{s.addPersonToStart}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, fontFamily: "Sora_600SemiBold", color: t.grey },
}));
