import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts, Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { AppServicesProvider, useServices, setCachedToken, getCachedToken } from "../AppServices";

function AuthGateAndSync({ children }: { children: React.ReactNode }) {
  const { session, sync } = useServices();
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
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

  // route guard — re-evaluated on every navigation (segments change)
  useEffect(() => {
    if (!ready) return;
    const authed = !!getCachedToken();
    const inAuth = segments[0] === "(auth)";
    if (!authed && !inAuth) router.replace("/(auth)/sign-in");
    if (authed && inAuth) router.replace("/(tabs)");
  }, [ready, segments]);

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <AppServicesProvider>
      <AuthGateAndSync>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGateAndSync>
    </AppServicesProvider>
  );
}
