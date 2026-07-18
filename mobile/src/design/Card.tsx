// Card — white rounded card with soft shadow, per docs/prototype/components.jsx.
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { themedStyles } from "./theme";

export function Card({
  pad = 18,
  style,
  children,
}: {
  pad?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = useStyles();
  return <View style={[styles.card, { padding: pad }, style]}>{children}</View>;
}

const useStyles = themedStyles((t) => StyleSheet.create({
  card: {
    backgroundColor: t.white,
    borderRadius: 22,
    // prototype: 0 1px 2px rgba(12,9,23,0.04), 0 6px 20px rgba(12,9,23,0.05)
    shadowColor: "#0C0917", // shadows stay dark in both themes
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
}));
