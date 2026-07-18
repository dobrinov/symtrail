// DayDetail — entries logged on the selected calendar day (newest first),
// plus an "add to this day" action.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTokens } from "../../design/theme";
import { Strings, useT } from "../../i18n";
import { EntryRow } from "../log/EntryRow";

// dayIso is "YYYY-MM-DD" → a friendly heading via the UTC date.
function dayHeading(dayIso: string, s: Strings): string {
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  return d.toLocaleDateString(s.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export function DayDetail(props: {
  repo: Repo;
  entries: Entry[];
  dayIso: string;
  tempUnit?: "c" | "f";
  onOpenEntry: (id: string) => void;
  onAddToDay: (dayIso: string) => void;
  onOpenFlare?: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const { repo, entries, dayIso, tempUnit = "c" } = props;

  const lookups = useQuery(["symptom_types", "medication_types"], () => ({
    symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
    medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
  }));

  // entries arrive newest-first (listEntries ORDER BY recorded_at DESC).
  const days = entries.filter((e) => e.recordedAt.startsWith(dayIso));

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{dayHeading(dayIso, s)}</Text>

      {days.length === 0 ? (
        <Card pad={22} style={{ alignItems: "center" }}>
          <Text style={styles.emptyText}>{s.nothingLoggedDay}</Text>
        </Card>
      ) : (
        <Card pad={14}>
          {days.map((e, i) => (
            <EntryRow
              key={e.id}
              entry={e}
              symptomTypes={lookups.symptomTypes}
              medTypes={lookups.medTypes}
              tempUnit={tempUnit}
              last={i === days.length - 1}
              onPress={() => props.onOpenEntry(e.id)}
            />
          ))}
        </Card>
      )}

      {props.onOpenFlare ? (
        <PressableScale onPress={props.onOpenFlare} style={styles.flareBtn}>
          <Icon name="trend" size={18} color={t.balance} sw={2.2} />
          <Text style={styles.flareLabel}>{s.viewThisFlare}</Text>
          <Icon name="chevR" size={18} color={t.grey} sw={2.2} />
        </PressableScale>
      ) : null}

      <PressableScale onPress={() => props.onAddToDay(dayIso)} style={styles.addBtn}>
        <Icon name="plus" size={18} color={t.white} sw={2.4} />
        <Text style={styles.addLabel}>{s.addToThisDay}</Text>
      </PressableScale>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  wrap: { marginTop: 4 },
  heading: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  emptyText: { fontSize: 15, color: t.grey },
  flareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: t.white,
  },
  flareLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
    letterSpacing: -0.1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: t.anchor,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: t.white,
    letterSpacing: -0.1,
  },
}));
