// SignInScreen — centered variant from docs/prototype/screens-auth.jsx.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { ApiClient } from "../../api/client";
import { AccountJson } from "../../api/types";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { TOKENS } from "../../design/tokens";
import { AuthField, ErrorText, LinkText, LogoBlock, deviceNameOrDefault } from "./shared";

export function SignInScreen(props: {
  api: Pick<ApiClient, "signin" | "signinApple">;
  sessionSignedIn: (token: string, account: AccountJson) => Promise<void>;
  onSignedIn: (token: string) => void;
  goToSignUp: () => void;
  goToReset: () => void;
}): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dormant until Developer Program enrollment sets extra.appleSignInEnabled.
  const appleEnabled = Constants.expoConfig?.extra?.appleSignInEnabled === true;

  async function finish(token: string, account: AccountJson) {
    await props.sessionSignedIn(token, account);
    props.onSignedIn(token);
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await props.api.signin(email.trim(), password, deviceNameOrDefault());
      await finish(res.token, res.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitApple() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const Apple = require("expo-apple-authentication");
      const cred = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      });
      if (!cred.identityToken) throw new Error("Apple sign-in was cancelled");
      const res = await props.api.signinApple(cred.identityToken, deviceNameOrDefault());
      await finish(res.token, res.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <LogoBlock tagline="Track symptoms, flares & medications for everyone in your family." />
      <View style={styles.form}>
        <AuthField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AuthField icon="lock" placeholder="Password" value={password} onChangeText={setPassword} secure />
        <View style={styles.forgotRow}>
          <LinkText onPress={props.goToReset} color={TOKENS.balance}>
            Forgot password?
          </LinkText>
        </View>
        <ErrorText>{error}</ErrorText>
        <Button onPress={submit} disabled={submitting}>
          Sign in
        </Button>
        {appleEnabled ? (
          <Button
            variant="dark"
            onPress={submitApple}
            disabled={submitting}
            icon={<Icon name="apple" size={19} color={TOKENS.white} />}
          >
            Continue with Apple
          </Button>
        ) : null}
      </View>
      <View style={styles.spacer} />
      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>New here? </Text>
        <LinkText onPress={props.goToSignUp}>Create account</LinkText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TOKENS.canvas,
    paddingHorizontal: 24,
  },
  spacer: {
    flex: 1,
  },
  form: {
    marginTop: 30,
    gap: 14,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -6,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 14,
    paddingBottom: 22,
  },
  bottomText: {
    fontSize: 14.5,
    fontFamily: "Sora_400Regular",
    color: TOKENS.grey,
  },
});
