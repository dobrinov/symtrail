// Today route — hosts TodayScreen plus the profile-switcher sheet.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useServices } from "../../AppServices";
import { Sheet } from "../../design/Sheet";
import { TOKENS } from "../../design/tokens";
import { ProfileSwitcher } from "../../screens/today/ProfileSwitcher";
import { TodayScreen } from "../../screens/today/TodayScreen";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";

export default function Today(): React.JSX.Element {
  const { repo } = useServices();
  const router = useRouter();
  const { openLog, openEntry, openFlare } = useLogSheet();
  const [profileId, setActiveProfile] = useActiveProfile(repo);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <View style={styles.root}>
      {profileId ? (
        <TodayScreen
          repo={repo}
          profileId={profileId}
          onSwitchProfile={() => setSwitcherOpen(true)}
          onLog={() => openLog()}
          onOpenEntry={(id) => openEntry(id)}
          onOpenFlare={(flare) => openFlare(flare)}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add a person to get started</Text>
        </View>
      )}

      <Sheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} title="Switch person">
        <ProfileSwitcher
          repo={repo}
          activeId={profileId}
          onPick={(id) => {
            setActiveProfile(id);
            setSwitcherOpen(false);
          }}
          onAddPerson={() => {
            setSwitcherOpen(false);
            router.push("/(tabs)/profile");
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.canvas,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.grey,
  },
});
