// SettingsSheet — language dropdown (select-style field expanding into the
// option list), temperature-unit chooser (°C / °F two-card picker) and
// appearance chooser (Light / Dark / Automatic). On select it sets the local
// value immediately; the temp unit is then best-effort synced to the server.
// Language and appearance are device-local and never synced.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { ThemePreference, themedStyles, useTokens } from "../../design/theme";
import { LANGUAGE_CODES, LanguageCode, LOCALES, useT } from "../../i18n";

export function SettingsSheet({
  unit,
  setTempUnit,
  updateSettings,
  theme,
  setTheme,
  language,
  setLanguage,
}: {
  unit: "c" | "f";
  setTempUnit: (u: "c" | "f") => void;
  updateSettings: (s: { temp_unit: "c" | "f" }) => Promise<unknown>;
  theme: ThemePreference;
  setTheme: (p: ThemePreference) => void;
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const [langOpen, setLangOpen] = useState(false);

  const UNIT_OPTIONS: { k: "c" | "f"; label: string; symbol: string }[] = [
    { k: "c", label: s.celsius, symbol: "°C" },
    { k: "f", label: s.fahrenheit, symbol: "°F" },
  ];
  const THEME_OPTIONS: { k: ThemePreference; label: string; icon: string }[] = [
    { k: "light", label: s.lightTheme, icon: "sun" },
    { k: "dark", label: s.darkTheme, icon: "moon" },
    { k: "system", label: s.autoTheme, icon: "phone" },
  ];

  const pick = (u: "c" | "f") => {
    setTempUnit(u); // immediate local change so the UI never waits on the network
    // best-effort: ignore failures so offline doesn't break the preference
    void Promise.resolve(updateSettings({ temp_unit: u })).catch(() => {});
  };

  return (
    <View>
      <Text style={styles.label}>{s.languageLabel}</Text>
      <PressableScale
        onPress={() => setLangOpen((v) => !v)}
        style={[styles.langField, langOpen && styles.langFieldOpen]}
        testID="language-field"
      >
        <Text style={styles.langValue}>{LOCALES[language].languageName}</Text>
        <Icon name={langOpen ? "chevD" : "chevR"} size={17} color={t.grey} sw={2.2} />
      </PressableScale>
      {langOpen ? (
        <View style={styles.langList}>
          {LANGUAGE_CODES.map((code, i) => {
            const on = language === code;
            return (
              <PressableScale
                key={code}
                onPress={() => {
                  setLanguage(code);
                  setLangOpen(false);
                }}
                style={[styles.langRow, i < LANGUAGE_CODES.length - 1 && styles.langRowBorder]}
                testID={`lang-${code}`}
              >
                <Text style={[styles.langRowText, on && styles.langRowTextOn]}>
                  {LOCALES[code].languageName}
                </Text>
                {on ? <Icon name="check" size={18} color={t.yellow} sw={2.6} /> : null}
              </PressableScale>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.caption}>{s.languageCaption}</Text>

      <Text style={[styles.label, styles.sectionGap]}>{s.tempUnitLabel}</Text>
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
      <Text style={styles.caption}>{s.tempUnitCaption}</Text>

      <Text style={[styles.label, styles.sectionGap]}>{s.appearanceLabel}</Text>
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
      <Text style={styles.caption}>{s.appearanceCaption}</Text>
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
  langField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    marginBottom: 8,
  },
  langFieldOpen: { borderColor: t.approach },
  langValue: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: t.anchor },
  langList: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
    backgroundColor: t.white,
    marginBottom: 8,
    overflow: "hidden",
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  langRowBorder: { borderBottomWidth: 1, borderBottomColor: t.calm },
  langRowText: { fontSize: 15, fontFamily: "Sora_600SemiBold", color: t.balance },
  langRowTextOn: { color: t.anchor, fontFamily: "Sora_700Bold" },
  caption: {
    fontSize: 12.5,
    color: t.grey,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    lineHeight: 18,
  },
}));
