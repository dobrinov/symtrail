// Profile route — orchestrator for the Profile tab. Renders ProfileScreen and
// owns every sheet + side effect it triggers: add/edit person, settings,
// delete-person confirm, delete-account confirm, sign-out. People and the
// active profile are read reactively; saves/deletes kick a sync.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useServices } from "../../AppServices";
import { Avatar } from "../../design/Avatar";
import { Button } from "../../design/Button";
import { Sheet } from "../../design/Sheet";
import { TOKENS } from "../../design/tokens";
import { AddPersonForm } from "../../screens/profile/AddPersonForm";
import { ProfileScreen } from "../../screens/profile/ProfileScreen";
import { SettingsSheet } from "../../screens/profile/SettingsSheet";
import { useAuthNavigation } from "../../session/useAuthGate";
import { useActiveProfile } from "../../state/activeProfile";

type PersonSheet = { mode: "add" } | { mode: "edit"; id: string } | null;

export default function Profile(): React.JSX.Element {
  const { repo, api, sync, session } = useServices();
  const { onSignedOut } = useAuthNavigation();
  const [activeId, setActive] = useActiveProfile(repo);

  const [personSheet, setPersonSheet] = useState<PersonSheet>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const afterMutation = () => {
    setTimeout(() => void sync.syncNow(), 0);
  };

  const onSavedPerson = () => {
    setPersonSheet(null);
    afterMutation();
  };

  const deletePerson = (id: string) => {
    repo.deleteProfileCascade(id);
    setDeletePersonId(null);
    afterMutation();
  };

  const signOut = async () => {
    try {
      await api.signout();
    } catch {
      // best-effort: still drop the local session even if the request fails
    }
    await session.signedOut();
    onSignedOut();
  };

  const deleteAccount = async () => {
    try {
      await api.deleteAccount();
    } catch {
      // best-effort: proceed even when offline or the request fails
    }
    repo.wipeAll();
    await session.signedOut();
    setDeleteAccountOpen(false);
    onSignedOut();
  };

  const target = deletePersonId ? repo.getProfile(deletePersonId) : null;

  return (
    <View style={styles.root}>
      <ProfileScreen
        repo={repo}
        activeId={activeId}
        onPickProfile={(id) => setActive(id)}
        onEditProfile={(id) => setPersonSheet({ mode: "edit", id })}
        onAddPerson={() => setPersonSheet({ mode: "add" })}
        onDeleteProfile={(id) => setDeletePersonId(id)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenReport={() => {
          // Task 21 wires the real PDF export.
        }}
        onSignOut={() => void signOut()}
        onDeleteAccount={() => setDeleteAccountOpen(true)}
        lastSyncedAt={sync.lastSyncedAt}
      />

      <Sheet
        open={personSheet !== null}
        onClose={() => setPersonSheet(null)}
        title={personSheet?.mode === "edit" ? "Edit person" : "Add a person"}
        full
      >
        {personSheet !== null ? (
          <AddPersonForm
            repo={repo}
            editProfileId={personSheet.mode === "edit" ? personSheet.id : undefined}
            onSaved={onSavedPerson}
          />
        ) : null}
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <SettingsSheet
          unit={session.tempUnit()}
          setTempUnit={(u) => session.setTempUnit(u)}
          updateSettings={(s) => api.updateSettings(s)}
        />
      </Sheet>

      <Sheet open={deletePersonId !== null} onClose={() => setDeletePersonId(null)} title="Remove person">
        {target ? (
          <View>
            <View style={styles.confirmHead}>
              <Avatar name={target.name} color={target.color ?? TOKENS.approach} size={64} />
              <Text style={styles.confirmTitle}>{`Remove ${target.name}?`}</Text>
              <Text style={styles.confirmBody}>
                {`This permanently deletes ${target.name}'s profile and all their logged symptoms, temperatures and medications.`}
              </Text>
            </View>
            <View style={styles.confirmActions}>
              <Button variant="danger" onPress={() => deletePerson(target.id)}>
                Delete
              </Button>
              <Button variant="secondary" onPress={() => setDeletePersonId(null)}>
                Cancel
              </Button>
            </View>
          </View>
        ) : null}
      </Sheet>

      <Sheet open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="Delete account">
        <View>
          <View style={styles.confirmHead}>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.confirmBody}>
              This permanently deletes your account and every profile, symptom, temperature and
              medication you have logged. This cannot be undone.
            </Text>
          </View>
          <View style={styles.confirmActions}>
            <Button variant="danger" onPress={() => void deleteAccount()}>
              Delete my account
            </Button>
            <Button variant="secondary" onPress={() => setDeleteAccountOpen(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.canvas },
  confirmHead: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 6,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    marginTop: 6,
    textAlign: "center",
  },
  confirmBody: {
    fontSize: 14,
    color: TOKENS.grey,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  confirmActions: { gap: 10 },
});
