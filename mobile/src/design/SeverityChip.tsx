// SeverityChip — pill showing the severity label, per docs/prototype/components.jsx.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SEVERITY, SeverityKey } from "../domain/severity";

export function SeverityChip({
  level,
  small = false,
}: {
  level: SeverityKey;
  small?: boolean;
}): React.JSX.Element {
  const s = SEVERITY[level];
  const fontSize = small ? 11 : 12.5;
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: s.color,
          paddingVertical: small ? 2 : 3,
          paddingHorizontal: small ? 8 : 10,
        },
      ]}
    >
      <Text
        style={[styles.label, { color: s.text, fontSize, lineHeight: fontSize * 1.3 }]}
      >
        {s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: "Sora_600SemiBold",
    letterSpacing: 0.1,
  },
});
