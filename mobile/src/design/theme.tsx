// Theme context — resolves the user's appearance preference ("light" |
// "dark" | "system") against the OS colour scheme and serves the matching
// token palette. Components consume it via useTokens() for inline colours and
// themedStyles() for StyleSheets (built lazily, cached per scheme).
import React, { createContext, useContext, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { DARK, LIGHT, Tokens } from "./tokens";

export type ThemePreference = "light" | "dark" | "system";
export type ThemeScheme = "light" | "dark";

interface ThemeValue {
  scheme: ThemeScheme;
  tokens: Tokens;
}

// Light default so components render sensibly outside a provider (tests).
const ThemeContext = createContext<ThemeValue>({ scheme: "light", tokens: LIGHT });

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}): React.JSX.Element {
  const system = useColorScheme();
  const scheme: ThemeScheme =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  const value = useMemo<ThemeValue>(
    () => ({ scheme, tokens: scheme === "dark" ? DARK : LIGHT }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

export function useTokens(): Tokens {
  return useContext(ThemeContext).tokens;
}

/** Wraps a style factory into a hook; styles are created once per scheme. */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  make: (t: Tokens) => T,
): () => T {
  const cache: Partial<Record<ThemeScheme, T>> = {};
  return function useStyles(): T {
    const { scheme, tokens } = useTheme();
    let s = cache[scheme];
    if (!s) {
      s = make(tokens);
      cache[scheme] = s;
    }
    return s;
  };
}
