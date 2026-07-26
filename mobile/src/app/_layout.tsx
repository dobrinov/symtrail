import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { AppServicesProvider, useServices, setCachedToken, getCachedToken } from "../AppServices";
import { ThemeProvider, useTheme, useTokens } from "../design/theme";
import { useQuery } from "../db/useQuery";
import { resolveRoute } from "../session/routing";
import { LOCAL_ONLY } from "../config";
import { seedBuiltinCatalogues } from "../db/builtinCatalogue";
import { I18nProvider, resolveLanguage } from "../i18n";

function AuthGateAndSync({ children }: { children: React.ReactNode }) {
  const { session, sync, repo } = useServices();
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Reactive: re-runs when profiles change (e.g. the first one is added during
  // onboarding, or the last one is deleted), so the gate re-evaluates.
  const profileCount = useQuery(["profiles"], () => repo.listProfiles().length);

  useEffect(() => {
    // LOCAL_ONLY: no backend — seed the built-in catalogues locally (the server
    // normally supplies them on first sync) and skip the token/sync handshake.
    if (LOCAL_ONLY) {
      seedBuiltinCatalogues(repo);
      setReady(true);
      return;
    }
    session.getToken().then((token) => {
      setCachedToken(token);
      setReady(true);
      if (token) sync.syncNow();
    });
  }, []);

  // foreground sync trigger
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && getCachedToken()) sync.syncNow();
    });
    return () => sub.remove();
  }, []);

  // route guard — re-evaluated on navigation and whenever the profile count
  // changes. Zero-profile authed users are forced into onboarding.
  useEffect(() => {
    if (!ready) return;
    const target = resolveRoute(LOCAL_ONLY || !!getCachedToken(), profileCount, segments[0]);
    if (target) router.replace(target as Parameters<typeof router.replace>[0]);
  }, [ready, segments, profileCount]);

  if (!ready) return null;
  return <>{children}</>;
}

// Reads the persisted appearance preference (reactive via sync_meta) and
// mounts the ThemeProvider above everything that renders UI.
function ThemedApp({ children }: { children: React.ReactNode }) {
  const { session } = useServices();
  const preference = useQuery(["sync_meta"], () => session.themePreference());
  return <ThemeProvider preference={preference}>{children}</ThemeProvider>;
}

// Reads the persisted UI language (reactive via sync_meta) and mounts the
// I18nProvider so every screen re-renders in the chosen language. With no
// stored preference the device locale decides (falling back to English).
function LocalizedApp({ children }: { children: React.ReactNode }) {
  const { session } = useServices();
  const language = useQuery(["sync_meta"], () => resolveLanguage(session.language()));
  return <I18nProvider language={language}>{children}</I18nProvider>;
}

// Screen views: expo-router doesn't expose the NavigationContainer, so route
// changes are captured manually from the pathname (a no-op without an
// analytics key — see src/analytics).
function ScreenTracker() {
  const { analytics } = useServices();
  const pathname = usePathname();
  useEffect(() => {
    analytics.screen(pathname);
  }, [pathname, analytics]);
  return null;
}

// Inside the provider: themed status bar + navigator background so pushed
// screens never flash the wrong colour behind their own backgrounds.
function ThemedChrome() {
  const { scheme } = useTheme();
  const t = useTokens();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.canvas } }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <AppServicesProvider>
      <ThemedApp>
        <LocalizedApp>
          <AuthGateAndSync>
            <ScreenTracker />
            <ThemedChrome />
          </AuthGateAndSync>
        </LocalizedApp>
      </ThemedApp>
    </AppServicesProvider>
  );
}
