// SettingsSheet — temperature-unit chooser (°C / °F two-card picker) and
// appearance chooser (Light / Dark / Automatic), port of the prototype's
// SettingsSheet (docs/prototype/app.jsx). On select it sets the local value
// immediately; the temp unit is then best-effort synced to the server.
// Appearance is device-local and never synced.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { ThemePreference, themedStyles, useTokens } from "../../design/theme";

const UNIT_OPTIONS: { k: "c" | "f"; label: string; symbol: string }[] = [
  { k: "c", label: "Celsius", symbol: "°C" },
  { k: "f", label: "Fahrenheit", symbol: "°F" },
];

const THEME_OPTIONS: { k: ThemePreference; label: string; icon: string }[] = [
  { k: "light", label: "Light", icon: "sun" },
  { k: "dark", label: "Dark", icon: "moon" },
  { k: "system", label: "Automatic", icon: "phone" },
];

export function SettingsSheet({
  unit,
  setTempUnit,
  updateSettings,
  theme,
  setTheme,
}: {
  unit: "c" | "f";
  setTempUnit: (u: "c" | "f") => void;
  updateSettings: (s: { temp_unit: "c" | "f" }) => Promise<unknown>;
  theme: ThemePreference;
  setTheme: (p: ThemePreference) => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const pick = (u: "c" | "f") => {
    setTempUnit(u); // immediate local change so the UI never waits on the network
    // best-effort: ignore failures so offline doesn't break the preference
    void Promise.resolve(updateSettings({ temp_unit: u })).catch(() => {});
  };

  return (
    <View>
      <Text style={styles.label}>Temperature unit</Text>
      <View style={styles.row}>
        {UNIT_OPTIONS.map((o) => {
          const on = unit === o.k;
          return (
            <PressableScale key={o.k} onPress={() => pick(o.k)} style={styles.cardWrap}>
              <Card pad={16} style={[styles.card, on ? styles.cardOn : styles.cardOff]}>
                <Text style={[styles.symbol, { color: on ? t.anchor : t.grey }]}>
                  {o.symbol}
                </Text>
                <Text style={[styles.cardLabel, { color: on ? t.anchor : t.grey }]}>
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

      <Text style={[styles.label, styles.sectionGap]}>Appearance</Text>
      <View style={styles.row}>
        {THEME_OPTIONS.map((o) => {
          const on = theme === o.k;
          return (
            <PressableScale key={o.k} onPress={() => setTheme(o.k)} style={styles.cardWrap}>
              <Card pad={14} style={[styles.card, on ? styles.cardOn : styles.cardOff]}>
                <Icon name={o.icon} size={24} color={on ? t.anchor : t.grey} sw={2} />
                <Text style={[styles.cardLabel, { color: on ? t.anchor : t.grey }]}>
                  {o.label}
                </Text>
              </Card>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.caption}>
        Automatic follows your phone&apos;s light or dark mode.
      </Text>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 9,
    paddingLeft: 4,
  },
  sectionGap: { marginTop: 18 },
  row: { flexDirection: "row", gap: 9, marginBottom: 8 },
  cardWrap: { flex: 1 },
  card: { alignItems: "center", gap: 4 },
  cardOn: { borderWidth: 2, borderColor: t.yellow },
  cardOff: { borderWidth: 2, borderColor: "transparent" },
  symbol: { fontSize: 30, fontFamily: "Sora_700Bold", letterSpacing: -1 },
  cardLabel: { fontSize: 13.5, fontFamily: "Sora_600SemiBold" },
  caption: {
    fontSize: 12.5,
    color: t.grey,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    lineHeight: 18,
  },
}));
