// EntryRow — shared list row for an entry (glyph, title, time). Used by the
// Today screen's Recent list and the search results list.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry, MedicationType, SymptomType } from "../../db/repo";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTokens } from "../../design/theme";
import { formatTemp, SEVERITY, SeverityKey, tempToSeverity } from "../../domain/severity";

export function fmtEntryTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

export function EntryRow({
  entry,
  symptomTypes,
  medTypes,
  tempUnit,
  last,
  onPress,
}: {
  entry: Entry;
  symptomTypes: Map<string, SymptomType>;
  medTypes: Map<string, MedicationType>;
  tempUnit: "c" | "f";
  last: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const st = entry.symptomTypeId ? symptomTypes.get(entry.symptomTypeId) : undefined;
  const mt = entry.medicationTypeId ? medTypes.get(entry.medicationTypeId) : undefined;

  let title: string;
  let glyphIcon: string;
  let glyphBg: string;
  let glyphColor: string;
  if (entry.entryType === "temp") {
    const sev = SEVERITY[tempToSeverity(entry.tempC)];
    title = entry.tempC != null ? formatTemp(entry.tempC, tempUnit) : "Temperature";
    glyphIcon = "fever";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.key === "none" ? t.balance : sev.dot;
  } else if (entry.entryType === "med") {
    const name = mt?.label ?? "Medication";
    title = entry.dose ? `${name} · ${entry.dose}` : name;
    glyphIcon = mt?.form === "tablet" ? "tablet" : mt?.form === "drops" ? "drops" : "syrup";
    glyphBg = (mt?.color ?? t.balance) + "22";
    glyphColor = mt?.color ?? t.balance;
  } else if (entry.entryType === "note") {
    title = entry.note ?? "Note";
    glyphIcon = "note";
    glyphBg = t.calm;
    glyphColor = t.grey;
  } else {
    const sev = SEVERITY[(entry.severity ?? "mild") as SeverityKey];
    title = st?.label ?? "Symptom";
    glyphIcon = st?.icon ?? "note";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.dot;
  }

  return (
    <PressableScale onPress={onPress} style={[styles.entryRow, !last && styles.entryRowBorder]}>
      <View style={[styles.entryGlyph, { backgroundColor: glyphBg }]}>
        <Icon name={glyphIcon} size={21} color={glyphColor} sw={1.9} />
      </View>
      <Text style={styles.entryTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.entryTime}>{fmtEntryTime(entry.recordedAt)}</Text>
    </PressableScale>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  entryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: t.calm,
  },
  entryGlyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  entryTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
    letterSpacing: -0.2,
  },
  entryTime: {
    fontSize: 12.5,
    color: t.grey,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
}));
