// Card — white rounded card with soft shadow, per docs/prototype/components.jsx.
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { TOKENS } from "./tokens";

export function Card({
  pad = 18,
  style,
  children,
}: {
  pad?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}): React.JSX.Element {
  return <View style={[styles.card, { padding: pad }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: TOKENS.white,
    borderRadius: 22,
    // prototype: 0 1px 2px rgba(12,9,23,0.04), 0 6px 20px rgba(12,9,23,0.05)
    shadowColor: TOKENS.anchor,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
