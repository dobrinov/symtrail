// SearchScreen — full-history search & filter over the active profile's
// entries: free-text (symptom / medication / note text), entry-type and
// severity filters, and an optional from/to date range. Results are grouped
// by day (newest first) and reuse the shared EntryRow.
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Entry, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTheme, useTokens } from "../../design/theme";
import { SEVERITY, SeverityKey, tempToSeverity } from "../../domain/severity";
import { EntryRow } from "../log/EntryRow";

const TYPE_OPTIONS: { key: Entry["entryType"]; label: string }[] = [
  { key: "symptom", label: "Symptoms" },
  { key: "temp", label: "Temperature" },
  { key: "med", label: "Medication" },
  { key: "note", label: "Notes" },
];

const SEVERITY_OPTIONS: SeverityKey[] = ["mild", "moderate", "high", "severe"];

// Severity of an entry for filtering: temps map through the fever bands,
// symptoms use their logged level, med/note entries have none.
function entrySeverity(e: Entry): SeverityKey {
  if (e.entryType === "temp") return tempToSeverity(e.tempC);
  if (e.entryType === "symptom") return (e.severity ?? "mild") as SeverityKey;
  return "none";
}

// Day buckets are the UTC date prefix of recordedAt, matching the rest of the
// app (calendar, meds, flares).
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function relDay(dayIso: string, now: Date): string {
  const todayKey = now.toISOString().slice(0, 10);
  const diff = Math.round((Date.parse(`${todayKey}T00:00:00.000Z`) - Date.parse(`${dayIso}T00:00:00.000Z`)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// The user picks a calendar date; keep its local Y/M/D as the day key.
function pickedDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDayChip(dayIso: string): string {
  return new Date(`${dayIso}T00:00:00.000Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function SearchScreen({
  repo,
  profileId,
  tempUnit,
  onBack,
  onOpenEntry,
}: {
  repo: Repo;
  profileId: string;
  tempUnit: "c" | "f";
  onBack: () => void;
  onOpenEntry: (entryId: string) => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();

  const [q, setQ] = useState("");
  const [types, setTypes] = useState<Entry["entryType"][]>([]);
  const [sevs, setSevs] = useState<SeverityKey[]>([]);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [iosPicker, setIosPicker] = useState<"from" | "to" | null>(null);

  const data = useQuery(["entries", "symptom_types", "medication_types"], () => ({
    entries: repo.listEntries(profileId),
    symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
    medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
  }));
  const { entries, symptomTypes, medTypes } = data;

  const toggle = <T,>(list: T[], set: (v: T[]) => void, key: T) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const setDay = (which: "from" | "to", d: Date) => {
    const key = pickedDayKey(d);
    if (which === "from") setFrom(key);
    else setTo(key);
  };

  const openPicker = (which: "from" | "to") => {
    if (Platform.OS === "android") {
      const current = which === "from" ? from : to;
      DateTimePickerAndroid.open({
        value: current ? new Date(`${current}T12:00:00`) : new Date(),
        mode: "date",
        onChange: (_e: DateTimePickerEvent, d?: Date) => {
          if (d) setDay(which, d);
        },
      });
    } else {
      setIosPicker(which);
    }
  };

  const ql = q.trim().toLowerCase();
  const results = entries.filter((e) => {
    if (types.length && !types.includes(e.entryType)) return false;
    if (sevs.length && !sevs.includes(entrySeverity(e))) return false;
    const day = dayKey(e.recordedAt);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (ql) {
      const st = e.symptomTypeId ? symptomTypes.get(e.symptomTypeId) : undefined;
      const mt = e.medicationTypeId ? medTypes.get(e.medicationTypeId) : undefined;
      const hay = [
        st?.label,
        mt?.label,
        mt?.brand,
        e.dose,
        e.note,
        e.entryType === "temp" ? "temperature" : null,
        e.entryType === "temp" && e.tempC != null ? e.tempC.toFixed(1) : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });

  // entries arrive newest-first; Map preserves insertion order → days newest-first.
  const groups = new Map<string, Entry[]>();
  for (const e of results) {
    const k = dayKey(e.recordedAt);
    const list = groups.get(k) ?? [];
    list.push(e);
    groups.set(k, list);
  }

  const filtersActive = q.trim() !== "" || types.length > 0 || sevs.length > 0 || from != null || to != null;
  const iosPickerValue = iosPicker === "from" ? from : to;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* header */}
      <View style={styles.header}>
        <PressableScale onPress={onBack} style={styles.backBtn}>
          <Icon name="chevL" size={20} color={t.anchor} sw={2.2} />
        </PressableScale>
        <Text style={styles.title}>Search</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.body}>
          {/* free text */}
          <View style={styles.inputRow}>
            <Icon name="search" size={19} color={t.grey} sw={2} />
            <TextInput
              style={styles.input}
              value={q}
              onChangeText={setQ}
              placeholder="Symptom, medication, note…"
              placeholderTextColor={t.grey}
              autoCorrect={false}
              returnKeyType="search"
            />
            {q !== "" ? (
              <PressableScale onPress={() => setQ("")} style={styles.clearBtn}>
                <Icon name="close" size={16} color={t.grey} sw={2.2} />
              </PressableScale>
            ) : null}
          </View>

          {/* type filter */}
          <Text style={styles.filterLabel}>Type</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((o) => {
              const on = types.includes(o.key);
              return (
                <PressableScale
                  key={o.key}
                  onPress={() => toggle(types, setTypes, o.key)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                </PressableScale>
              );
            })}
          </View>

          {/* severity filter */}
          <Text style={styles.filterLabel}>Severity</Text>
          <View style={styles.chipRow}>
            {SEVERITY_OPTIONS.map((key) => {
              const s = SEVERITY[key];
              const on = sevs.includes(key);
              return (
                <PressableScale
                  key={key}
                  onPress={() => toggle(sevs, setSevs, key)}
                  style={[styles.chip, on && { backgroundColor: s.color, borderColor: s.color }]}
                >
                  <View style={[styles.sevDot, { backgroundColor: s.dot }]} />
                  <Text style={[styles.chipText, on && { color: s.text }]}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </View>

          {/* date range */}
          <Text style={styles.filterLabel}>Date range</Text>
          <View style={styles.chipRow}>
            <DateChip label="From" value={from} onPress={() => openPicker("from")} onClear={() => setFrom(null)} />
            <DateChip label="To" value={to} onPress={() => openPicker("to")} onClear={() => setTo(null)} />
          </View>

          {iosPicker ? (
            <View>
              <DateTimePicker
                value={iosPickerValue ? new Date(`${iosPickerValue}T12:00:00`) : new Date()}
                mode="date"
                display="spinner"
                themeVariant={scheme}
                onChange={(_e: DateTimePickerEvent, d?: Date) => {
                  if (d) setDay(iosPicker, d);
                }}
              />
              <PressableScale onPress={() => setIosPicker(null)} style={styles.doneChip}>
                <Text style={styles.doneText}>Done</Text>
              </PressableScale>
            </View>
          ) : null}

          {/* results */}
          <Text style={styles.resultCount}>
            {results.length === 0 ? "No results" : results.length === 1 ? "1 result" : `${results.length} results`}
          </Text>
          {results.length === 0 ? (
            <Card pad={22} style={{ alignItems: "center" }}>
              <Text style={styles.emptyText}>
                {filtersActive ? "Nothing matches these filters." : "Nothing logged yet."}
              </Text>
            </Card>
          ) : (
            <View style={styles.dayList}>
              {Array.from(groups, ([day, rows]) => (
                <View key={day}>
                  <Text style={styles.dayHeading}>{relDay(day, now)}</Text>
                  <Card pad={14}>
                    {rows.map((e, i) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        symptomTypes={symptomTypes}
                        medTypes={medTypes}
                        tempUnit={tempUnit}
                        last={i === rows.length - 1}
                        onPress={() => onOpenEntry(e.id)}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// "From"/"To" chip: opens the picker; the small × clears just that bound.
function DateChip({
  label,
  value,
  onPress,
  onClear,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  onClear: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  return (
    <PressableScale onPress={onPress} style={[styles.chip, styles.dateChip, value != null && styles.chipOnSoft]}>
      <Icon name="calendar" size={15} color={value ? t.balance : t.grey} sw={2} />
      <Text style={[styles.chipText, value != null && { color: t.balance }]}>
        {value ? `${label} ${fmtDayChip(value)}` : label}
      </Text>
      {value != null ? (
        <PressableScale onPress={onClear} style={styles.clearBtn}>
          <Icon name="close" size={14} color={t.balance} sw={2.4} />
        </PressableScale>
      ) : null}
    </PressableScale>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.white,
    borderWidth: 1,
    borderColor: t.lavender,
  },
  title: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.5,
  },
  body: { paddingHorizontal: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  input: {
    flex: 1,
    fontSize: 15.5,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
    paddingVertical: 0,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    height: 38,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
  },
  chipOn: {
    backgroundColor: t.anchor,
    borderColor: t.anchor,
  },
  chipOnSoft: {
    borderColor: t.approach,
  },
  chipText: {
    fontSize: 13.5,
    fontFamily: "Sora_600SemiBold",
    color: t.balance,
  },
  chipTextOn: {
    color: t.white,
  },
  dateChip: {
    borderRadius: 14,
  },
  clearBtn: {
    padding: 6,
    margin: -6,
  },
  sevDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  doneChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    alignSelf: "flex-end",
  },
  doneText: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    color: t.balance,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: { fontSize: 15, color: t.grey },
  dayList: { gap: 16 },
  dayHeading: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.balance,
    marginBottom: 8,
    paddingLeft: 4,
  },
}));
