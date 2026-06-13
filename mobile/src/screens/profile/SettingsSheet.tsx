// SettingsSheet — temperature-unit chooser (°C / °F two-card picker), port of
// the prototype's SettingsSheet (docs/prototype/app.jsx). On select it sets the
// local unit immediately, then best-effort syncs the preference to the server.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../design/Card";
import { PressableScale } from "../../design/PressableScale";
import { TOKENS } from "../../design/tokens";

const OPTIONS: { k: "c" | "f"; label: string; symbol: string }[] = [
  { k: "c", label: "Celsius", symbol: "°C" },
  { k: "f", label: "Fahrenheit", symbol: "°F" },
];

export function SettingsSheet({
  unit,
  setTempUnit,
  updateSettings,
}: {
  unit: "c" | "f";
  setTempUnit: (u: "c" | "f") => void;
  updateSettings: (s: { temp_unit: "c" | "f" }) => Promise<unknown>;
}): React.JSX.Element {
  const pick = (u: "c" | "f") => {
    setTempUnit(u); // immediate local change so the UI never waits on the network
    // best-effort: ignore failures so offline doesn't break the preference
    void Promise.resolve(updateSettings({ temp_unit: u })).catch(() => {});
  };

  return (
    <View>
      <Text style={styles.label}>Temperature unit</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const on = unit === o.k;
          return (
            <PressableScale key={o.k} onPress={() => pick(o.k)} style={styles.cardWrap}>
              <Card pad={16} style={[styles.card, on ? styles.cardOn : styles.cardOff]}>
                <Text style={[styles.symbol, { color: on ? TOKENS.anchor : TOKENS.grey }]}>
                  {o.symbol}
                </Text>
                <Text style={[styles.cardLabel, { color: on ? TOKENS.anchor : TOKENS.grey }]}>
                  {o.label}
                </Text>
              </Card>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.caption}>
        Applies everywhere temperatures appear — logging, calendar, flare charts and history.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 9,
    paddingLeft: 4,
  },
  row: { flexDirection: "row", gap: 9, marginBottom: 8 },
  cardWrap: { flex: 1 },
  card: { alignItems: "center", gap: 4 },
  cardOn: { borderWidth: 2, borderColor: TOKENS.yellow },
  cardOff: { borderWidth: 2, borderColor: "transparent" },
  symbol: { fontSize: 30, fontFamily: "Sora_700Bold", letterSpacing: -1 },
  cardLabel: { fontSize: 13.5, fontFamily: "Sora_600SemiBold" },
  caption: {
    fontSize: 12.5,
    color: TOKENS.grey,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    lineHeight: 18,
  },
});
