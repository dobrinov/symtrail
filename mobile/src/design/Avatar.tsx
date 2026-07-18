// Avatar — colored circle with the name's initial, per docs/prototype/components.jsx.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { themedStyles } from "./theme";

export function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}): React.JSX.Element {
  const styles = useStyles();
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initial: {
    color: t.onAccent,
    fontFamily: "Sora_700Bold",
    letterSpacing: 0.2,
  },
}));
