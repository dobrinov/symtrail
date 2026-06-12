// Button — primary / dark / secondary / danger / ghost, per docs/prototype/components.jsx.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PressableScale } from "./PressableScale";
import { TOKENS } from "./tokens";

type Variant = "primary" | "dark" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: TOKENS.yellow, fg: TOKENS.anchor },
  dark: { bg: TOKENS.anchor, fg: TOKENS.white },
  secondary: { bg: TOKENS.calm, fg: TOKENS.anchor },
  danger: { bg: "#E1542E", fg: TOKENS.white },
  ghost: { bg: "transparent", fg: TOKENS.approach },
};

export function Button({
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  full = true,
  children,
}: {
  onPress: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  disabled?: boolean;
  full?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  // prototype: disabled primary swaps to lavender bg + white text, plus 0.6 opacity
  const bg = disabled && variant === "primary" ? TOKENS.lavender : VARIANTS[variant].bg;
  const fg = disabled && variant === "primary" ? TOKENS.white : VARIANTS[variant].fg;
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor: bg },
        full ? styles.full : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text style={[styles.label, { color: fg }]}>{children}</Text>
      ) : (
        children
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "auto",
  },
  full: {
    width: "100%",
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 17,
    fontFamily: "Sora_700Bold",
    letterSpacing: -0.2,
  },
});
