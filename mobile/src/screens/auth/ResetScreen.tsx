// ResetScreen — reset-code flow styled after docs/prototype/screens-auth.jsx (forgot).
// Three stages in one component: request → confirm → done.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ApiClient } from "../../api/client";
import { Button } from "../../design/Button";
import { Icon } from "../../design/Icon";
import { TOKENS } from "../../design/tokens";
import { AuthField, ErrorText, LinkText } from "./shared";

type Stage = "request" | "confirm" | "done";

export function ResetScreen(props: {
  api: Pick<ApiClient, "requestPasswordReset" | "confirmPasswordReset">;
  goToSignIn: () => void;
}): React.JSX.Element {
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function requestCode() {
    run(async () => {
      await props.api.requestPasswordReset(email.trim());
      setStage("confirm");
    });
  }

  function confirmReset() {
    run(async () => {
      await props.api.confirmPasswordReset(code.trim(), password);
      setStage("done");
    });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      {stage === "request" ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Icon name="lock" size={26} color={TOKENS.balance} sw={1.9} />
            </View>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.caption}>Enter the email for your account and we’ll send a reset code.</Text>
          </View>
          <View style={styles.form}>
            <AuthField icon="mail" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <ErrorText>{error}</ErrorText>
            <Button onPress={requestCode} disabled={submitting}>
              Send reset code
            </Button>
          </View>
        </>
      ) : stage === "confirm" ? (
        <>
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Icon name="mail" size={26} color={TOKENS.balance} sw={1.9} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.caption}>Enter the code we sent you and choose a new password.</Text>
          </View>
          <View style={styles.form}>
            <AuthField icon="note" placeholder="Reset code" value={code} onChangeText={setCode} />
            <AuthField icon="lock" placeholder="New password" value={password} onChangeText={setPassword} secure />
            <ErrorText>{error}</ErrorText>
            <Button onPress={confirmReset} disabled={submitting}>
              Set new password
            </Button>
          </View>
        </>
      ) : (
        <View style={styles.header}>
          <View style={styles.successBadge}>
            <Icon name="check" size={36} color="#1F8A4C" sw={2.4} />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.caption}>You can sign in with your new password now.</Text>
        </View>
      )}
      <View style={styles.spacer} />
      <View style={styles.bottomRow}>
        <LinkText onPress={props.goToSignIn}>Back to sign in</LinkText>
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
  header: {
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFEFD9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E6F4EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 27,
    fontFamily: "Sora_800ExtraBold",
    color: TOKENS.anchor,
    letterSpacing: -0.6,
    marginTop: 8,
  },
  caption: {
    fontSize: 14.5,
    fontFamily: "Sora_400Regular",
    color: TOKENS.grey,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 300,
  },
  form: {
    marginTop: 24,
    gap: 14,
  },
  bottomRow: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 22,
  },
});
