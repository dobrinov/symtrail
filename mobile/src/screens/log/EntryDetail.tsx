// EntryDetail — read-only entry view with type-aware glyph/title/subtitle,
// severity card (symptoms), reminder card (meds), full date, edit + delete.
// Port of the prototype's EntryDetail.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry, Repo } from "../../db/repo";
import { Button } from "../../design/Button";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { SeverityChip } from "../../design/SeverityChip";
import { TOKENS } from "../../design/tokens";
import { SEVERITY, SeverityKey, formatTemp, tempToSeverity } from "../../domain/severity";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

export function EntryDetail({
  repo,
  entry,
  onEdit,
  onDelete,
  tempUnit = "c",
}: {
  repo: Repo;
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  tempUnit?: "c" | "f";
}): React.JSX.Element {
  const st = useMemo(
    () => (entry.symptomTypeId ? repo.listSymptomTypes().find((s) => s.id === entry.symptomTypeId) : undefined),
    [repo, entry.symptomTypeId],
  );
  const mt = useMemo(
    () => (entry.medicationTypeId ? repo.listMedicationTypes().find((m) => m.id === entry.medicationTypeId) : undefined),
    [repo, entry.medicationTypeId],
  );

  let title: string;
  let subtitle: string;
  let glyphIcon: string;
  let glyphBg: string;
  let glyphColor: string;

  if (entry.entryType === "temp") {
    const sev = SEVERITY[tempToSeverity(entry.tempC)];
    title = entry.tempC != null ? formatTemp(entry.tempC, tempUnit) : "Temperature";
    subtitle = "Temperature";
    glyphIcon = "fever";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.key === "none" ? TOKENS.balance : sev.dot;
  } else if (entry.entryType === "med") {
    title = mt?.label ?? "Medication";
    subtitle = entry.dose ?? "Medication";
    glyphIcon = mt?.form === "tablet" ? "tablet" : mt?.form === "drops" ? "drops" : "syrup";
    glyphBg = (mt?.color ?? TOKENS.balance) + "22";
    glyphColor = mt?.color ?? TOKENS.balance;
  } else if (entry.entryType === "note") {
    title = entry.note ?? "Note";
    subtitle = "Note";
    glyphIcon = "note";
    glyphBg = TOKENS.calm;
    glyphColor = TOKENS.grey;
  } else {
    const sev = SEVERITY[(entry.severity ?? "mild") as SeverityKey];
    title = st?.label ?? "Symptom";
    subtitle = sev.label;
    glyphIcon = st?.icon ?? "note";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.dot;
  }

  const fullDate = new Date(entry.recordedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View>
      <View style={styles.header}>
        <View style={[styles.glyph, { backgroundColor: glyphBg }]}>
          <Icon name={glyphIcon} size={28} color={glyphColor} sw={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle} · {fmtTime(entry.recordedAt)}
          </Text>
        </View>
      </View>

      {entry.entryType === "symptom" && entry.severity ? (
        <Card pad={16} style={styles.sevCard}>
          <Text style={styles.sevLabel}>Severity</Text>
          <SeverityChip level={entry.severity as SeverityKey} />
        </Card>
      ) : null}

      {entry.entryType === "med" && entry.note ? (
        <Card pad={16} style={styles.noteCard}>
          <Text style={styles.cardCaption}>Notes</Text>
          <Text style={styles.noteText}>{entry.note}</Text>
        </Card>
      ) : null}

      {entry.entryType === "med" && entry.reminderAt ? (
        <Card pad={14} style={styles.reminderCard}>
          <View style={styles.bellGlyph}>
            <Icon name="bell" size={19} color={TOKENS.balance} sw={1.9} />
          </View>
          <View>
            <Text style={styles.cardCaption}>Reminder</Text>
            <Text style={styles.reminderText}>
              {new Date(entry.reminderAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
              {fmtTime(entry.reminderAt)}
            </Text>
          </View>
        </Card>
      ) : null}

      <Text style={styles.fullDate}>{fullDate}</Text>

      <View style={styles.actions}>
        <Button onPress={onEdit} icon={<Icon name="edit" size={19} color={TOKENS.anchor} sw={2} />}>
          Edit entry
        </Button>
        <Button variant="danger" onPress={onDelete}>
          Delete entry
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 18 },
  glyph: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: 22, fontFamily: "Sora_700Bold", color: TOKENS.anchor, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: TOKENS.grey },
  sevCard: { marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sevLabel: { fontSize: 14.5, color: TOKENS.balance, fontFamily: "Sora_600SemiBold" },
  noteCard: { marginBottom: 14 },
  cardCaption: {
    fontSize: 12.5,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noteText: { fontSize: 15, color: TOKENS.anchor, lineHeight: 21 },
  reminderCard: { marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  bellGlyph: { width: 38, height: 38, borderRadius: 11, backgroundColor: TOKENS.calm, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  reminderText: { fontSize: 14.5, fontFamily: "Sora_600SemiBold", color: TOKENS.anchor },
  fullDate: { fontSize: 13, color: TOKENS.grey, textAlign: "center", marginBottom: 18 },
  actions: { gap: 10 },
});
