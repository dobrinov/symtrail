// shared.tsx — common auth-screen pieces ported from docs/prototype/screens-auth.jsx
// ("centered" variant): logo block, Card-styled input field, inline error, link text.
import React, { useState } from "react";
import { KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon } from "../../design/Icon";
import { themedStyles, useTheme, useTokens } from "../../design/theme";

export const ERROR_RED = "#E1542E";

// Symtrail brand colours (heart + cross identity)
const LOGO_NAVY = "#16335B";
const LOGO_PINK = "#F49AC1";
const LOGO_BLUE = "#54C5E8";

export function LogoMark({ size = 84 }: { size?: number }): React.JSX.Element {
  const h = Math.round((size * 112) / 120);
  return (
    <Svg width={size} height={h} viewBox="0 0 120 112" fill="none">
      <Path
        d="M60 100 C 28 79, 12 58, 12 38 C 12 23, 23 13, 36 13 C 47 13, 55 20, 60 30 C 65 20, 73 13, 84 13 C 97 13, 108 23, 108 38 C 108 58, 92 79, 60 100 Z"
        fill={LOGO_PINK}
        stroke={LOGO_NAVY}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Path
        d="M52 34 H68 V40 H74 V56 H68 V62 H52 V56 H46 V40 H52 Z"
        fill={LOGO_BLUE}
        stroke={LOGO_NAVY}
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LogoBlock({ markSize = 84, tagline }: { markSize?: number; tagline?: string }): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.logoBlock}>
      <LogoMark size={markSize} />
      <View style={styles.wordmarkBlock}>
        <Text style={[styles.wordmark, { fontSize: Math.round(markSize * 0.4) }]}>SYMTRAIL</Text>
        <Text style={styles.since}>SINCE 2026</Text>
      </View>
      {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
    </View>
  );
}

export function AuthField({
  icon,
  placeholder,
  value,
  onChangeText,
  secure = false,
  keyboardType,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { scheme } = useTheme();
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[styles.field, focus ? styles.fieldFocus : null]}>
      <Icon name={icon} size={20} color={focus ? t.balance : t.approach} sw={1.9} />
      <TextInput
          keyboardAppearance={scheme}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={t.grey}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        secureTextEntry={secure && !show}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
      {secure ? (
        <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
          <Icon name={show ? "eyeoff" : "eye"} size={19} color={t.grey} sw={1.9} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }): React.JSX.Element | null {
  const styles = useStyles();
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function LinkText({
  onPress,
  color,
  children,
}: {
  onPress: () => void;
  color?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const styles = useStyles();
  return (
    <Text onPress={onPress} suppressHighlighting style={[styles.link, color ? { color } : null]}>
      {children}
    </Text>
  );
}

// Device name for the auth endpoints; expo-device may be unavailable at runtime.
export function deviceNameOrDefault(): string {
  try {
    return require("expo-device").deviceName ?? "iPhone";
  } catch {
    return "iPhone";
  }
}

const useStyles = themedStyles((t) => StyleSheet.create({
  logoBlock: {
    alignItems: "center",
    gap: 14,
  },
  wordmarkBlock: {
    alignItems: "center",
    gap: 5,
  },
  wordmark: {
    fontFamily: "Sora_800ExtraBold",
    letterSpacing: 1.5,
    color: LOGO_NAVY,
  },
  since: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
    letterSpacing: 5,
    color: LOGO_PINK,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Sora_400Regular",
    color: t.grey,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    marginTop: 4,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    backgroundColor: t.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: t.lavender,
  },
  fieldFocus: {
    borderColor: t.yellow,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Sora_400Regular",
    color: t.anchor,
    letterSpacing: -0.2,
    paddingVertical: 0,
  },
  error: {
    color: ERROR_RED,
    fontSize: 13.5,
    fontFamily: "Sora_600SemiBold",
    textAlign: "center",
    lineHeight: 19,
  },
  link: {
    color: t.yellow,
    fontSize: 14.5,
    fontFamily: "Sora_700Bold",
  },
}));
