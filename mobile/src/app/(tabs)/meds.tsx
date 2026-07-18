// Meds route — hosts MedsScreen, wired to the active profile and the log sheet
// (tap a dose → openEntry detail view).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useServices } from "../../AppServices";
import { themedStyles } from "../../design/theme";
import { useT } from "../../i18n";
import { MedsScreen } from "../../screens/meds/MedsScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

export default function Meds(): React.JSX.Element {
  const styles = useStyles();
  const s = useT();
  const { repo } = useServices();
  const { openEntry } = useLogSheet();
  const [profileId] = useActiveProfile(repo);

  return (
    <View style={styles.root}>
      {profileId ? (
        <MedsScreen repo={repo} profileId={profileId} onOpenEntry={(id) => openEntry(id)} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{s.addPersonToStart}</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, fontFamily: "Sora_600SemiBold", color: t.grey },
}));
