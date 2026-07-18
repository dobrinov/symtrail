// SignUpScreen — styled after docs/prototype/screens-auth.jsx (sign-up).
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiClient } from "../../api/client";
import { AccountJson } from "../../api/types";
import { Button } from "../../design/Button";
import { themedStyles } from "../../design/theme";
import { AuthField, ErrorText, LinkText, LogoMark, deviceNameOrDefault } from "./shared";

export function SignUpScreen(props: {
  api: Pick<ApiClient, "signup">;
  sessionSignedIn: (token: string, account: AccountJson) => Promise<void>;
  onSignedIn: (token: string) => void;
  goToSignIn: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await props.api.signup(email.trim(), password, deviceNameOrDefault());
      await props.sessionSignedIn(res.token, res.account);
      props.onSignedIn(res.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <View style={styles.header}>
        <LogoMark size={52} />
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.caption}>One account for the whole family. Add each person once you’re in.</Text>
      </View>
      <View style={styles.form}>
        <AuthField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AuthField icon="lock" placeholder="Password" value={password} onChangeText={setPassword} secure />
        <ErrorText>{error}</ErrorText>
        <Button onPress={submit} disabled={submitting}>
          Sign up
        </Button>
      </View>
      <View style={styles.spacer} />
      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Already have an account? </Text>
        <LinkText onPress={props.goToSignIn}>Sign in</LinkText>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.canvas,
    paddingHorizontal: 24,
  },
  spacer: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 27,
    fontFamily: "Sora_800ExtraBold",
    color: t.anchor,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  caption: {
    fontSize: 14.5,
    fontFamily: "Sora_400Regular",
    color: t.grey,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
  },
  form: {
    marginTop: 24,
    gap: 14,
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
    color: t.grey,
  },
}));
