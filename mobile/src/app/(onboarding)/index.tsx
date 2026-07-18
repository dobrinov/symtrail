// First-run onboarding — shown to an authenticated user who has no profiles
// yet (the app is unusable without one). Renders a welcome header above the
// AddPersonForm; saving the first person bumps the local profile count, which
// the root gate observes and uses to route on to the tabs.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useServices } from "../../AppServices";
import { Icon } from "../../design/Icon";
import { themedStyles, useTokens } from "../../design/theme";
import { AddPersonForm } from "../../screens/profile/AddPersonForm";

export default function Onboarding(): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const { repo, sync } = useServices();
  const insets = useSafeAreaInsets();

  // The root gate (AuthGateAndSync) watches the profile count and redirects to
  // the tabs once one exists, so we only need to persist + sync here.
  const onSaved = () => {
    void sync.syncNow();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, paddingHorizontal: 22 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.glyph}>
          <Icon name="profile" size={30} color={t.anchor} sw={2} />
        </View>
        <Text style={styles.title}>Add your first person</Text>
        <Text style={styles.subtitle}>
          Symtrail tracks symptoms, temperatures and medications per person. Add
          yourself or someone you care for to get started.
        </Text>
      </View>

      <AddPersonForm repo={repo} onSaved={onSaved} />
    </ScrollView>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  header: { alignItems: "center", marginBottom: 24, gap: 10 },
  glyph: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: t.calm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: "Sora_800ExtraBold",
    color: t.anchor,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Sora_400Regular",
    color: t.grey,
    textAlign: "center",
    lineHeight: 21,
  },
}));
