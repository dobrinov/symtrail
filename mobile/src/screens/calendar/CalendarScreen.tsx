// CalendarScreen — month grid with a severity heat-map, day-detail list,
// add-to-day logging, month paging, and PFAPA flare-window dotting.
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Entry, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { cycleStats, deriveFlares } from "../../domain/flares";
import { SEVERITY_ORDER, SeverityKey, tempToSeverity } from "../../domain/severity";
import { DayDetail } from "./DayDetail";
import { MonthGrid } from "./MonthGrid";

const DAY_MS = 86400000;

// Max severity logged on a given day. The whole app buckets days in UTC
// (flares.ts dayOf uses Date.UTC; entries are stored as ISO UTC strings), so
// `dayIso` ("YYYY-MM-DD") is matched against the UTC date prefix of recordedAt.
// Only temp + symptom entries colour a day; med/note do not.
export function daySeverity(entries: Entry[], dayIso: string): SeverityKey {
  let maxIdx = 0;
  for (const e of entries) {
    if (!e.recordedAt.startsWith(dayIso)) continue;
    const s: SeverityKey =
      e.entryType === "temp" ? tempToSeverity(e.tempC) :
      e.entryType === "symptom" ? ((e.severity as SeverityKey) ?? "none") : "none";
    maxIdx = Math.max(maxIdx, SEVERITY_ORDER.indexOf(s));
  }
  return SEVERITY_ORDER[maxIdx];
}

// Zero-padded "YYYY-MM-DD" for a calendar day, formatted WITHOUT timezone
// conversion so it lines up with the UTC date prefix daySeverity matches on.
// (Building a Date and reading local getters would drift near midnight.)
function dayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Today's key in UTC, to match the UTC day keying used throughout.
function todayKeyUtc(now: Date): string {
  return dayKey(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// All UTC day keys inside [windowStart, windowEnd] inclusive.
function windowDayKeys(start: Date, end: Date): Set<string> {
  const keys = new Set<string>();
  const from = Math.floor(start.getTime() / DAY_MS);
  const to = Math.floor(end.getTime() / DAY_MS);
  for (let d = from; d <= to; d++) {
    const dt = new Date(d * DAY_MS);
    keys.add(dayKey(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  }
  return keys;
}

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarScreen(props: {
  repo: Repo;
  profileId: string;
  onAddToDay: (dayIso: string) => void;
  onOpenEntry: (entryId: string) => void;
}): React.JSX.Element {
  const { repo, profileId } = props;
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todayIso = todayKeyUtc(now);

  const [view, setView] = useState(() => ({ year: now.getUTCFullYear(), month: now.getUTCMonth() }));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayIso);

  const data = useQuery(["entries", "profiles", "symptom_types"], () => {
    const profile = repo.getProfile(profileId);
    const entries = profile ? repo.listEntries(profile.id) : [];
    return { profile, entries, symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])) };
  });
  const { profile, entries, symptomTypes } = data;
  if (!profile) return <View style={styles.screen} />;

  // PFAPA predicted flare window → dotted days.
  let windowDays: Set<string> | undefined;
  if (profile.condition === "PFAPA") {
    const flareEntries = entries.map((e) => ({
      entryType: e.entryType,
      recordedAt: e.recordedAt,
      tempC: e.tempC,
      symptomKeyIsFever: e.symptomTypeId != null && symptomTypes.get(e.symptomTypeId)?.icon === "fever",
    }));
    const cycle = cycleStats(deriveFlares(flareEntries), now);
    if (cycle) windowDays = windowDayKeys(cycle.windowStart, cycle.windowEnd);
  }

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
    >
      <View style={styles.header}>
        <PressableScale onPress={goPrev} style={styles.chev}>
          <Icon name="chevL" size={22} color={TOKENS.balance} sw={2.4} />
        </PressableScale>
        <Text style={styles.monthLabel}>
          {MONTH_LABELS[view.month]} {view.year}
        </Text>
        <PressableScale onPress={goNext} style={styles.chev}>
          <Icon name="chevR" size={22} color={TOKENS.balance} sw={2.4} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <MonthGrid
          year={view.year}
          month={view.month}
          entries={entries}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          windowDays={windowDays}
          todayIso={todayIso}
        />

        {selectedDay ? (
          <DayDetail
            repo={repo}
            entries={entries}
            dayIso={selectedDay}
            onOpenEntry={props.onOpenEntry}
            onAddToDay={props.onAddToDay}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TOKENS.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  chev: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TOKENS.white,
  },
  monthLabel: {
    fontSize: 19,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.3,
  },
  body: { paddingHorizontal: 20 },
});
