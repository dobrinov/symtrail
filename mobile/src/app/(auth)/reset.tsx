import React from "react";
import { useRouter } from "expo-router";
import { useServices } from "../../AppServices";
import { ResetScreen } from "../../screens/auth/ResetScreen";

export default function ResetRoute() {
  const services = useServices();
  const router = useRouter();
  return <ResetScreen api={services.api} goToSignIn={() => router.replace("/(auth)/sign-in")} />;
}
