// LogChooser — three option cards (Symptom / Temperature / Medication), plus
// an "Adding to <date>" caption when forDate is set. Port of the prototype's
// LogChooser.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTokens } from "../../design/theme";
import { Tokens } from "../../design/tokens";

type LogType = "symptom" | "temp" | "med";

const options = (t: Tokens): { k: LogType; label: string; sub: string; icon: string; color: string }[] => [
  { k: "symptom", label: "Symptom", sub: "Fever, throat, pain…", icon: "rash", color: t.approach },
  { k: "temp", label: "Temperature", sub: "Record a reading", icon: "fever", color: "#F2802E" },
  { k: "med", label: "Medication", sub: "A dose you gave", icon: "syrup", color: t.yellow },
];

export function LogChooser({
  onPick,
  forDate,
}: {
  onPick: (mode: LogType) => void;
  forDate?: string;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  return (
    <View style={styles.root}>
      {forDate ? (
        <View style={styles.caption}>
          <Icon name="calendar" size={17} color={t.balance} sw={2} />
          <Text style={styles.captionText}>
            Adding to{" "}
            {new Date(forDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}
          </Text>
        </View>
      ) : null}
      {options(t).map((o) => (
        <PressableScale key={o.k} onPress={() => onPick(o.k)}>
          <Card pad={16} style={styles.card}>
            <View style={[styles.glyph, { backgroundColor: o.color + "22" }]}>
              <Icon name={o.icon} size={27} color={o.color === t.yellow ? "#C7841A" : o.color} sw={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{o.label}</Text>
              <Text style={styles.sub}>{o.sub}</Text>
            </View>
            <Icon name="chevR" size={20} color={t.grey} sw={2} />
          </Card>
        </PressableScale>
      ))}
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: { gap: 11 },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: t.calm,
    marginBottom: 3,
  },
  captionText: { fontSize: 13.5, fontFamily: "Sora_600SemiBold", color: t.balance },
  card: { flexDirection: "row", alignItems: "center", gap: 15 },
  glyph: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 17, fontFamily: "Sora_700Bold", color: t.anchor, letterSpacing: -0.2 },
  sub: { fontSize: 13, color: t.grey },
}));
