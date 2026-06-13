// Meds route — hosts MedsScreen, wired to the active profile and the log sheet
// (tap a dose → openEntry detail view).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useServices } from "../../AppServices";
import { TOKENS } from "../../design/tokens";
import { MedsScreen } from "../../screens/meds/MedsScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

export default function Meds(): React.JSX.Element {
  const { repo } = useServices();
  const { openEntry } = useLogSheet();
  const [profileId] = useActiveProfile(repo);

  return (
    <View style={styles.root}>
      {profileId ? (
        <MedsScreen repo={repo} profileId={profileId} onOpenEntry={(id) => openEntry(id)} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add a person to get started</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.canvas },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, fontFamily: "Sora_600SemiBold", color: TOKENS.grey },
});
