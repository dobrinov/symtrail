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
import { themedStyles, useTokens } from "../../design/theme";
import { SEVERITY, cToF, fToC, formatTemp, tempToSeverity } from "../../domain/severity";
import { useT } from "../../i18n";
import { DateTimeField } from "./DateTimeField";

// Canonical Celsius bounds; the entry always stores °C.
const MIN_C = 35;
const MAX_C = 42;

// Round a Celsius value to the stored 0.1° precision, clamped to the °C range.
function clampC(c: number): number {
  return Math.round(Math.max(MIN_C, Math.min(MAX_C, c)) * 10) / 10;
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
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const existing = useMemo(() => (editEntryId ? repo.getEntry(editEntryId) : null), [editEntryId, repo]);
  // State is ALWAYS canonical °C; the slider/stepper convert to/from the
  // display unit so the user sees and adjusts °F when that's their preference.
  const [tempC, setTempC] = useState<number>(existing?.tempC ?? 37.0);
  const [at, setAt] = useState<string>(existing?.recordedAt ?? initialDate ?? new Date().toISOString());

  const sevKey = tempToSeverity(tempC);
  const sev = SEVERITY[sevKey];
  const trackColor = sevKey === "none" ? t.balance : sev.dot;

  // Display-unit slider config (°F mode converts the °C bounds/value/step;
  // °C mode passes through). onValueChange always maps back to canonical °C.
  const isF = tempUnit === "f";
  const sliderMin = isF ? cToF(MIN_C) : MIN_C;
  const sliderMax = isF ? cToF(MAX_C) : MAX_C;
  const sliderStep = isF ? 0.2 : 0.1; // 0.1°C ≈ 0.18°F → 0.2°F display step
  const sliderValue = isF ? cToF(tempC) : tempC;
  const fromDisplay = (v: number): number => clampC(isF ? fToC(v) : v);
  // Step in the DISPLAY unit, then map back to °C so the on-screen number
  // moves by a clean increment (0.1°C / 0.2°F).
  const stepUp = () => setTempC(fromDisplay(sliderValue + sliderStep));
  const stepDown = () => setTempC(fromDisplay(sliderValue - sliderStep));

  const save = () => {
    if (existing) repo.updateEntry(existing.id, { tempC, recordedAt: at });
    else repo.createEntry({ profileId, entryType: "temp", tempC, recordedAt: at });
    onSaved();
  };

  return (
    <View>
      <Card pad={22} style={styles.card}>
        <View style={styles.stepperRow}>
          <PressableScale onPress={stepDown} style={styles.stepBtn}>
            <View style={styles.minus} />
          </PressableScale>
          <View style={styles.readout}>
            <Text style={[styles.value, { color: sevKey === "none" ? t.anchor : sev.dot }]}>
              {formatTemp(tempC, tempUnit)}
            </Text>
            <View style={styles.chip}>
              <SeverityChip level={sevKey} />
            </View>
          </View>
          <PressableScale onPress={stepUp} style={styles.stepBtn}>
            <Icon name="plus" size={22} color={t.balance} sw={2.4} />
          </PressableScale>
        </View>
        <Slider
          testID="temp-slider"
          style={styles.slider}
          minimumValue={sliderMin}
          maximumValue={sliderMax}
          step={sliderStep}
          value={sliderValue}
          onValueChange={(v) => setTempC(fromDisplay(v))}
          minimumTrackTintColor={trackColor}
          maximumTrackTintColor={t.lavender}
        />
        <View style={styles.scale}>
          <Text style={styles.scaleText}>{formatTemp(MIN_C, tempUnit)}</Text>
          <Text style={styles.scaleText}>{formatTemp(MAX_C, tempUnit)}</Text>
        </View>
      </Card>

      <View style={styles.when}>
        <DateTimeField value={at} onChange={setAt} />
      </View>

      <Button onPress={save}>{s.save}</Button>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  card: { marginBottom: 18, alignItems: "center" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 22 },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: t.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  minus: { width: 18, height: 3, borderRadius: 2, backgroundColor: t.balance },
  readout: { alignItems: "center", minWidth: 150 },
  value: { fontSize: 48, fontFamily: "Sora_700Bold", letterSpacing: -1 },
  chip: { marginTop: 8 },
  slider: { width: "100%", height: 40, marginTop: 14 },
  scale: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  scaleText: { fontSize: 11.5, fontFamily: "Sora_600SemiBold", color: t.grey },
  when: { marginBottom: 20 },
}));
