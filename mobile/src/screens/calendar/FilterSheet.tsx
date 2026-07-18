// FilterSheet — search criteria for the history list, rendered inside a
// bottom Sheet: free-text, entry-type and severity multi-select chips, and
// an optional from/to date range. Edits apply live to the filters object;
// "Show results" just closes, "Clear all" resets everything.
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Entry } from "../../db/repo";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTheme, useTokens } from "../../design/theme";
import { EMPTY_FILTERS, EntryFilters, filtersActive } from "../../domain/entryFilter";
import { SEVERITY, SeverityKey } from "../../domain/severity";

const TYPE_OPTIONS: { key: Entry["entryType"]; label: string }[] = [
  { key: "symptom", label: "Symptoms" },
  { key: "temp", label: "Temperature" },
  { key: "med", label: "Medication" },
  { key: "note", label: "Notes" },
];

const SEVERITY_OPTIONS: SeverityKey[] = ["mild", "moderate", "high", "severe"];

// The user picks a calendar date; keep its local Y/M/D as the day key.
function pickedDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDayChip(dayIso: string): string {
  return new Date(`${dayIso}T00:00:00.000Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function FilterSheet({
  filters,
  onChange,
  onDone,
}: {
  filters: EntryFilters;
  onChange: (f: EntryFilters) => void;
  onDone: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { scheme } = useTheme();
  const [iosPicker, setIosPicker] = useState<"from" | "to" | null>(null);

  const toggleType = (key: Entry["entryType"]) =>
    onChange({
      ...filters,
      types: filters.types.includes(key) ? filters.types.filter((k) => k !== key) : [...filters.types, key],
    });

  const toggleSev = (key: SeverityKey) =>
    onChange({
      ...filters,
      sevs: filters.sevs.includes(key) ? filters.sevs.filter((k) => k !== key) : [...filters.sevs, key],
    });

  const setDay = (which: "from" | "to", d: Date) =>
    onChange({ ...filters, [which]: pickedDayKey(d) });

  const openPicker = (which: "from" | "to") => {
    if (Platform.OS === "android") {
      const current = which === "from" ? filters.from : filters.to;
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

  const iosPickerValue = iosPicker === "from" ? filters.from : filters.to;

  return (
    <View>
      {/* free text */}
      <View style={styles.inputRow}>
        <Icon name="search" size={19} color={t.grey} sw={2} />
        <TextInput
          keyboardAppearance={scheme}
          style={styles.input}
          value={filters.q}
          onChangeText={(q) => onChange({ ...filters, q })}
          placeholder="Symptom, medication, note…"
          placeholderTextColor={t.grey}
          autoCorrect={false}
          returnKeyType="search"
        />
        {filters.q !== "" ? (
          <PressableScale onPress={() => onChange({ ...filters, q: "" })} style={styles.clearBtn}>
            <Icon name="close" size={16} color={t.grey} sw={2.2} />
          </PressableScale>
        ) : null}
      </View>

      {/* type filter */}
      <Text style={styles.filterLabel}>Type</Text>
      <View style={styles.chipRow}>
        {TYPE_OPTIONS.map((o) => {
          const on = filters.types.includes(o.key);
          return (
            <PressableScale key={o.key} onPress={() => toggleType(o.key)} style={[styles.chip, on && styles.chipOn]}>
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
          const on = filters.sevs.includes(key);
          return (
            <PressableScale
              key={key}
              onPress={() => toggleSev(key)}
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
        <DateChip label="From" value={filters.from} onPress={() => openPicker("from")} onClear={() => onChange({ ...filters, from: null })} />
        <DateChip label="To" value={filters.to} onPress={() => openPicker("to")} onClear={() => onChange({ ...filters, to: null })} />
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

      <View style={styles.actions}>
        <Button onPress={onDone}>Show results</Button>
        {filtersActive(filters) ? (
          <Button variant="secondary" onPress={() => onChange({ ...EMPTY_FILTERS })}>
            Clear all
          </Button>
        ) : null}
      </View>
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
  actions: { gap: 10, marginTop: 22 },
}));
