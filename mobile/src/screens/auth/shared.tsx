// shared.tsx — common auth-screen pieces ported from docs/prototype/screens-auth.jsx
// ("centered" variant): logo block, Card-styled input field, inline error, link text.
import React, { useState } from "react";
import { Image, KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Icon } from "../../design/Icon";
import { themedStyles, useTheme, useTokens } from "../../design/theme";

export const ERROR_RED = "#E1542E";

// Brand blue from the app icon / splash screen (assets/images/logo-mark.png).
const LOGO_BLUE = "#208AEF";
const LOGO_MARK = require("../../../assets/images/logo-mark.png");

export function LogoMark({ size = 84 }: { size?: number }): React.JSX.Element {
  return (
    <Image
      source={LOGO_MARK}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
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
    color: t.anchor,
  },
  since: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
    letterSpacing: 5,
    color: LOGO_BLUE,
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
