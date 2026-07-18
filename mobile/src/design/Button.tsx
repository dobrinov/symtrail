// Button — primary / dark / secondary / danger / ghost, per docs/prototype/components.jsx.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PressableScale } from "./PressableScale";
import { themedStyles, useTokens } from "./theme";
import { Tokens } from "./tokens";

type Variant = "primary" | "dark" | "secondary" | "danger" | "ghost";

// "dark" deliberately swaps anchor/white so it inverts with the theme
// (light theme: dark button, dark theme: light button). Fixed backgrounds
// (yellow, danger red) take theme-independent ink via onYellow/onAccent.
const variants = (t: Tokens): Record<Variant, { bg: string; fg: string }> => ({
  primary: { bg: t.yellow, fg: t.onYellow },
  dark: { bg: t.anchor, fg: t.white },
  secondary: { bg: t.calm, fg: t.anchor },
  danger: { bg: "#E1542E", fg: t.onAccent },
  ghost: { bg: "transparent", fg: t.approach },
});

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
  const styles = useStyles();
  const t = useTokens();
  const VARIANTS = variants(t);
  // prototype: disabled primary swaps to lavender bg + white text, plus 0.6 opacity
  const bg = disabled && variant === "primary" ? t.lavender : VARIANTS[variant].bg;
  const fg = disabled && variant === "primary" ? t.onAccent : VARIANTS[variant].fg;
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

const useStyles = themedStyles((t) => StyleSheet.create({
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
}));
