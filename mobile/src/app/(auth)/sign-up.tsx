import React from "react";
import { useRouter } from "expo-router";
import { useServices } from "../../AppServices";
import { useAuthNavigation } from "../../session/useAuthGate";
import { SignUpScreen } from "../../screens/auth/SignUpScreen";

export default function SignUpRoute() {
  const services = useServices();
  const { onSignedIn } = useAuthNavigation();
  const router = useRouter();
  return (
    <SignUpScreen
      api={services.api}
      sessionSignedIn={(token, account) => services.session.signedIn(token, account)}
      onSignedIn={(token) => {
        onSignedIn(token);
        services.sync.syncNow(); // initial since=0 pull seeds catalogues
      }}
      goToSignIn={() => router.replace("/(auth)/sign-in")}
    />
  );
}
