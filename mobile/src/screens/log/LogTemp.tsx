// LogTemp — slider (35–42 °C, step 0.1) with live severity + stepper buttons,
// canonical °C, when picker. Port of the prototype's LogTemp/TempStepper.
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Repo } from "../../db/repo";
import { Button } from "../../design/Button";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { SeverityChip } from "../../design/SeverityChip";
import { TOKENS } from "../../design/tokens";
import { SEVERITY, formatTemp, tempToSeverity } from "../../domain/severity";
import { DateTimeField } from "./DateTimeField";

const MIN = 35;
const MAX = 42;

function clamp(v: number): number {
  return Math.round(Math.max(MIN, Math.min(MAX, v)) * 10) / 10;
}

export function LogTemp({
  repo,
  profileId,
  onSaved,
  initialDate,
  tempUnit = "c",
  editEntryId,
}: {
  repo: Repo;
  profileId: string;
  onSaved: () => void;
  initialDate?: string;
  tempUnit?: "c" | "f";
  editEntryId?: string;
}): React.JSX.Element {
  const existing = useMemo(() => (editEntryId ? repo.getEntry(editEntryId) : null), [editEntryId, repo]);
  const [tempC, setTempC] = useState<number>(existing?.tempC ?? 37.0);
  const [at, setAt] = useState<string>(existing?.recordedAt ?? initialDate ?? new Date().toISOString());

  const sevKey = tempToSeverity(tempC);
  const sev = SEVERITY[sevKey];
  const trackColor = sevKey === "none" ? TOKENS.balance : sev.dot;

  const save = () => {
    if (existing) repo.updateEntry(existing.id, { tempC, recordedAt: at });
    else repo.createEntry({ profileId, entryType: "temp", tempC, recordedAt: at });
    onSaved();
  };

  return (
    <View>
      <Card pad={22} style={styles.card}>
        <View style={styles.stepperRow}>
          <PressableScale onPress={() => setTempC(clamp(tempC - 0.1))} style={styles.stepBtn}>
            <View style={styles.minus} />
          </PressableScale>
          <View style={styles.readout}>
            <Text style={[styles.value, { color: sevKey === "none" ? TOKENS.anchor : sev.dot }]}>
              {formatTemp(tempC, tempUnit)}
            </Text>
            <View style={styles.chip}>
              <SeverityChip level={sevKey} />
            </View>
          </View>
          <PressableScale onPress={() => setTempC(clamp(tempC + 0.1))} style={styles.stepBtn}>
            <Icon name="plus" size={22} color={TOKENS.balance} sw={2.4} />
          </PressableScale>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={MIN}
          maximumValue={MAX}
          step={0.1}
          value={tempC}
          onValueChange={(v) => setTempC(clamp(v))}
          minimumTrackTintColor={trackColor}
          maximumTrackTintColor={TOKENS.lavender}
        />
        <View style={styles.scale}>
          <Text style={styles.scaleText}>{formatTemp(MIN, tempUnit)}</Text>
          <Text style={styles.scaleText}>{formatTemp(MAX, tempUnit)}</Text>
        </View>
      </Card>

      <View style={styles.when}>
        <DateTimeField value={at} onChange={setAt} />
      </View>

      <Button onPress={save}>Save</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18, alignItems: "center" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 22 },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: TOKENS.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  minus: { width: 18, height: 3, borderRadius: 2, backgroundColor: TOKENS.balance },
  readout: { alignItems: "center", minWidth: 150 },
  value: { fontSize: 48, fontFamily: "Sora_700Bold", letterSpacing: -1 },
  chip: { marginTop: 8 },
  slider: { width: "100%", height: 40, marginTop: 14 },
  scale: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  scaleText: { fontSize: 11.5, fontFamily: "Sora_600SemiBold", color: TOKENS.grey },
  when: { marginBottom: 20 },
});
