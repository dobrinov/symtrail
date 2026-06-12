import { useRouter } from "expo-router";
import { setCachedToken } from "../AppServices";

export function useAuthNavigation() {
  const router = useRouter();
  return {
    onSignedIn: (token: string) => { setCachedToken(token); router.replace("/(tabs)"); },
    onSignedOut: () => { setCachedToken(null); router.replace("/(auth)/sign-in"); },
  };
}
