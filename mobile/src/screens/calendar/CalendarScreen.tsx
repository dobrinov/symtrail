// CalendarScreen — month grid with a severity heat-map, day-detail list,
// add-to-day logging, month paging, and PFAPA flare-window dotting. A
// calendar/list toggle switches to a full history list grouped by day, with
// a search/filter modal (FilterSheet) that narrows the list.
import React, { useState } from "react";
import { RefreshControlProps, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Entry, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { Sheet } from "../../design/Sheet";
import { themedStyles, useTokens } from "../../design/theme";
import { EMPTY_FILTERS, EntryFilters, filterEntries, filtersActive, summarizeFilters } from "../../domain/entryFilter";
import { cycleStats, deriveFlares, Flare } from "../../domain/flares";
import { EntryRow } from "../log/EntryRow";
import { DayDetail } from "./DayDetail";
import { FilterSheet } from "./FilterSheet";
import { MonthGrid } from "./MonthGrid";

const DAY_MS = 86400000;

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

// Friendly heading for a "YYYY-MM-DD" day bucket in the history list.
function relDay(dayIso: string, todayIso: string): string {
  const diff = Math.round((Date.parse(`${todayIso}T00:00:00.000Z`) - Date.parse(`${dayIso}T00:00:00.000Z`)) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  const opts: Intl.DateTimeFormatOptions =
    diff < 365
      ? { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }
      : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
  return d.toLocaleDateString("en-GB", opts);
}

// True if the UTC day "YYYY-MM-DD" falls within the flare's [onset, end] range.
function dayInFlare(dayIso: string, flare: Flare): boolean {
  const dayMs = Date.parse(`${dayIso}T00:00:00.000Z`);
  const startMs = Date.UTC(flare.onset.getUTCFullYear(), flare.onset.getUTCMonth(), flare.onset.getUTCDate());
  const endMs = Date.UTC(flare.end.getUTCFullYear(), flare.end.getUTCMonth(), flare.end.getUTCDate());
  return dayMs >= startMs && dayMs <= endMs;
}

export function CalendarScreen(props: {
  repo: Repo;
  profileId: string;
  onAddToDay: (dayIso: string) => void;
  onOpenEntry: (entryId: string) => void;
  onOpenFlare?: (flare: Flare) => void;
  tempUnit?: "c" | "f";
  refreshControl?: React.ReactElement<RefreshControlProps>;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { repo, profileId, tempUnit = "c" } = props;
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todayIso = todayKeyUtc(now);

  const [view, setView] = useState(() => ({ year: now.getUTCFullYear(), month: now.getUTCMonth() }));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayIso);
  const [mode, setMode] = useState<"month" | "list">("month");
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const data = useQuery(["entries", "profiles", "symptom_types", "medication_types", "sync_meta"], () => {
    const profile = repo.getProfile(profileId);
    const entries = profile ? repo.listEntries(profile.id) : [];
    return {
      profile,
      entries,
      symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
      medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
    };
  });
  const { profile, entries, symptomTypes, medTypes } = data;
  if (!profile) return <View style={styles.screen} />;

  // Derived flares power both the PFAPA window dots and the "open this flare"
  // affordance when a selected day lands inside a past flare.
  const flareEntries = entries.map((e) => ({
    entryType: e.entryType,
    recordedAt: e.recordedAt,
    tempC: e.tempC,
    symptomKeyIsFever: e.symptomTypeId != null && symptomTypes.get(e.symptomTypeId)?.icon === "fever",
  }));
  const flares = deriveFlares(flareEntries);

  // PFAPA predicted flare window → dotted days.
  let windowDays: Set<string> | undefined;
  if (profile.condition === "PFAPA") {
    const cycle = cycleStats(flares, now);
    if (cycle) windowDays = windowDayKeys(cycle.windowStart, cycle.windowEnd);
  }

  const selectedFlare = selectedDay ? flares.find((f) => dayInFlare(selectedDay, f)) ?? null : null;

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  // entries arrive newest-first; Map preserves insertion order → days newest-first.
  const active = filtersActive(filters);
  const listEntries = active ? filterEntries(entries, filters, symptomTypes, medTypes) : entries;
  const dayGroups = new Map<string, Entry[]>();
  for (const e of listEntries) {
    const k = e.recordedAt.slice(0, 10);
    const list = dayGroups.get(k) ?? [];
    list.push(e);
    dayGroups.set(k, list);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
      refreshControl={props.refreshControl}
    >
      {/* calendar / list toggle */}
      <View style={styles.modeRow}>
        <View style={styles.modeToggle}>
          <ModeButton icon="calendar" label="Calendar" on={mode === "month"} onPress={() => setMode("month")} />
          <ModeButton icon="list" label="List" on={mode === "list"} onPress={() => setMode("list")} />
        </View>
      </View>

      {mode === "month" ? (
        <>
          <View style={styles.header}>
            <PressableScale onPress={goPrev} style={styles.chev}>
              <Icon name="chevL" size={22} color={t.balance} sw={2.4} />
            </PressableScale>
            <Text style={styles.monthLabel}>
              {MONTH_LABELS[view.month]} {view.year}
            </Text>
            <PressableScale onPress={goNext} style={styles.chev}>
              <Icon name="chevR" size={22} color={t.balance} sw={2.4} />
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
                tempUnit={tempUnit}
                onOpenEntry={props.onOpenEntry}
                onAddToDay={props.onAddToDay}
                onOpenFlare={selectedFlare && props.onOpenFlare ? () => props.onOpenFlare!(selectedFlare) : undefined}
              />
            ) : null}
          </View>
        </>
      ) : (
        <View style={styles.body}>
          {/* search / filter bar */}
          <View style={styles.searchRow}>
            <PressableScale onPress={() => setFilterOpen(true)} style={styles.searchBar} testID="open-filters">
              <Icon name="search" size={18} color={active ? t.balance : t.grey} sw={2} />
              <Text style={[styles.searchText, active && styles.searchTextOn]} numberOfLines={1}>
                {active ? summarizeFilters(filters) : "Search & filter"}
              </Text>
            </PressableScale>
            {active ? (
              <PressableScale onPress={() => setFilters(EMPTY_FILTERS)} style={styles.searchClear} testID="clear-filters">
                <Icon name="close" size={17} color={t.balance} sw={2.2} />
              </PressableScale>
            ) : null}
          </View>

          {active ? (
            <Text style={styles.resultCount}>
              {listEntries.length === 0 ? "No results" : listEntries.length === 1 ? "1 result" : `${listEntries.length} results`}
            </Text>
          ) : null}

          {listEntries.length === 0 ? (
            <Card pad={22} style={{ alignItems: "center" }}>
              <Text style={styles.emptyText}>
                {active ? "Nothing matches these filters." : "Nothing logged yet."}
              </Text>
            </Card>
          ) : (
            <View style={styles.dayList}>
              {Array.from(dayGroups, ([day, rows]) => (
                <View key={day}>
                  <Text style={styles.dayHeading}>{relDay(day, todayIso)}</Text>
                  <Card pad={14}>
                    {rows.map((e, i) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        symptomTypes={symptomTypes}
                        medTypes={medTypes}
                        tempUnit={tempUnit}
                        last={i === rows.length - 1}
                        onPress={() => props.onOpenEntry(e.id)}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Search & filter">
        <FilterSheet filters={filters} onChange={setFilters} onDone={() => setFilterOpen(false)} />
      </Sheet>
    </ScrollView>
  );
}

function ModeButton({
  icon,
  label,
  on,
  onPress,
}: {
  icon: string;
  label: string;
  on: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  return (
    <PressableScale onPress={onPress} style={[styles.modeBtn, on && styles.modeBtnOn]}>
      <Icon name={icon} size={16} color={on ? t.anchor : t.grey} sw={2} />
      <Text style={[styles.modeText, on && styles.modeTextOn]}>{label}</Text>
    </PressableScale>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.canvas },
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
    backgroundColor: t.white,
  },
  monthLabel: {
    fontSize: 19,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.3,
  },
  body: { paddingHorizontal: 20 },
  modeRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: t.calm,
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 40,
    borderRadius: 11,
  },
  modeBtnOn: { backgroundColor: t.white },
  modeText: { fontSize: 13.5, fontFamily: "Sora_700Bold", color: t.grey },
  modeTextOn: { color: t.anchor },
  emptyText: { fontSize: 15, color: t.grey },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  searchText: { flex: 1, fontSize: 14.5, fontFamily: "Sora_600SemiBold", color: t.grey },
  searchTextOn: { color: t.anchor },
  searchClear: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dayList: { gap: 16 },
  dayHeading: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.balance,
    marginBottom: 8,
    paddingLeft: 4,
  },
}));
