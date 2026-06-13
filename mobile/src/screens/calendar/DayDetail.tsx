// DayDetail — entries logged on the selected calendar day (newest first),
// plus an "add to this day" action. Entry-row styling mirrors TodayScreen's
// (no shared row component exists yet; a local row keeps it simple).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";
import { formatTemp, SEVERITY, SeverityKey, tempToSeverity } from "../../domain/severity";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

// dayIso is "YYYY-MM-DD" → a friendly heading via the UTC date.
function dayHeading(dayIso: string): string {
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export function DayDetail(props: {
  repo: Repo;
  entries: Entry[];
  dayIso: string;
  onOpenEntry: (id: string) => void;
  onAddToDay: (dayIso: string) => void;
}): React.JSX.Element {
  const { repo, entries, dayIso } = props;

  const lookups = useQuery(["symptom_types", "medication_types"], () => ({
    symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
    medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
  }));

  // entries arrive newest-first (listEntries ORDER BY recorded_at DESC).
  const days = entries.filter((e) => e.recordedAt.startsWith(dayIso));

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{dayHeading(dayIso)}</Text>

      {days.length === 0 ? (
        <Card pad={22} style={{ alignItems: "center" }}>
          <Text style={styles.emptyText}>Nothing logged this day.</Text>
        </Card>
      ) : (
        <Card pad={14}>
          {days.map((e, i) => (
            <Row
              key={e.id}
              entry={e}
              symptomTypes={lookups.symptomTypes}
              medTypes={lookups.medTypes}
              last={i === days.length - 1}
              onPress={() => props.onOpenEntry(e.id)}
            />
          ))}
        </Card>
      )}

      <PressableScale onPress={() => props.onAddToDay(dayIso)} style={styles.addBtn}>
        <Icon name="plus" size={18} color={TOKENS.white} sw={2.4} />
        <Text style={styles.addLabel}>Add to this day</Text>
      </PressableScale>
    </View>
  );
}

function Row({
  entry,
  symptomTypes,
  medTypes,
  last,
  onPress,
}: {
  entry: Entry;
  symptomTypes: Map<string, { label: string; icon: string | null }>;
  medTypes: Map<string, { label: string; form: string | null; color: string | null }>;
  last: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const st = entry.symptomTypeId ? symptomTypes.get(entry.symptomTypeId) : undefined;
  const mt = entry.medicationTypeId ? medTypes.get(entry.medicationTypeId) : undefined;

  let title: string;
  let glyphIcon: string;
  let glyphBg: string;
  let glyphColor: string;
  if (entry.entryType === "temp") {
    const sev = SEVERITY[tempToSeverity(entry.tempC)];
    title = entry.tempC != null ? formatTemp(entry.tempC, "c") : "Temperature";
    glyphIcon = "fever";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.key === "none" ? TOKENS.balance : sev.dot;
  } else if (entry.entryType === "med") {
    const name = mt?.label ?? "Medication";
    title = entry.dose ? `${name} · ${entry.dose}` : name;
    glyphIcon = mt?.form === "tablet" ? "tablet" : mt?.form === "drops" ? "drops" : "syrup";
    glyphBg = (mt?.color ?? TOKENS.balance) + "22";
    glyphColor = mt?.color ?? TOKENS.balance;
  } else if (entry.entryType === "note") {
    title = entry.note ?? "Note";
    glyphIcon = "note";
    glyphBg = TOKENS.calm;
    glyphColor = TOKENS.grey;
  } else {
    const sev = SEVERITY[(entry.severity ?? "mild") as SeverityKey];
    title = st?.label ?? "Symptom";
    glyphIcon = st?.icon ?? "note";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.dot;
  }

  return (
    <PressableScale onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.glyph, { backgroundColor: glyphBg }]}>
        <Icon name={glyphIcon} size={21} color={glyphColor} sw={1.9} />
      </View>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.rowTime}>{fmtTime(entry.recordedAt)}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  heading: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  emptyText: { fontSize: 15, color: TOKENS.grey },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: TOKENS.calm },
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
    letterSpacing: -0.2,
  },
  rowTime: {
    fontSize: 12.5,
    color: TOKENS.grey,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: TOKENS.anchor,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: TOKENS.white,
    letterSpacing: -0.1,
  },
});
