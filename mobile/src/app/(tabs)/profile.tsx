// Profile route — orchestrator for the Profile tab. Renders ProfileScreen and
// owns every sheet + side effect it triggers: add/edit person, settings,
// delete-person confirm. People and the active profile are read reactively;
// saves/deletes kick a sync.
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { Avatar } from "../../design/Avatar";
import { Button } from "../../design/Button";
import { Sheet } from "../../design/Sheet";
import { TOKENS } from "../../design/tokens";
import { AddPersonForm } from "../../screens/profile/AddPersonForm";
import { ProfileScreen } from "../../screens/profile/ProfileScreen";
import { SettingsSheet } from "../../screens/profile/SettingsSheet";
import { cycleStats, deriveFlares } from "../../domain/flares";
import { buildReportHtml } from "../../report/html";
import { shareReportPdf } from "../../report/share";
import { useActiveProfile } from "../../state/activeProfile";

type PersonSheet = { mode: "add" } | { mode: "edit"; id: string } | null;

export default function Profile(): React.JSX.Element {
  const { repo, api, sync, session, reminders } = useServices();
  const [activeId, setActive] = useActiveProfile(repo);
  // Reactive: setTempUnit emits a sync_meta change, so the settings sheet's
  // selected card updates immediately when the user taps °C/°F.
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());

  const [personSheet, setPersonSheet] = useState<PersonSheet>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);

  const afterMutation = () => {
    setTimeout(() => void sync.syncNow(), 0);
  };

  const onSavedPerson = () => {
    setPersonSheet(null);
    afterMutation();
  };

  const deletePerson = (id: string) => {
    // Cancel any local med reminders for this person before their entries are
    // tombstoned — the cascade alone leaves orphaned scheduled notifications.
    for (const row of repo.listMedEntries(id)) {
      if (row.entry.reminderAt) void reminders.cancelFor(row.entry.id);
    }
    repo.deleteProfileCascade(id);
    setDeletePersonId(null);
    afterMutation();
  };

  // Builds the doctor PDF entirely from local data and opens the share sheet.
  // No-op when there is no active profile; sharing can be cancelled (caught).
  const openReport = async () => {
    if (!activeId) return;
    const profile = repo.getProfile(activeId);
    if (!profile) return;
    const entries = repo.listEntries(activeId);
    const symptomTypes = repo.listSymptomTypes();
    const medTypes = repo.listMedicationTypes();
    const labels: Record<string, string> = {};
    for (const s of symptomTypes) labels[s.id] = s.label;
    for (const m of medTypes) labels[m.id] = m.label;

    const symptomIsFever = new Map(symptomTypes.map((s) => [s.id, s.icon === "fever"]));
    const flares = deriveFlares(
      entries.map((e) => ({
        entryType: e.entryType,
        recordedAt: e.recordedAt,
        tempC: e.tempC,
        symptomKeyIsFever: e.symptomTypeId != null && (symptomIsFever.get(e.symptomTypeId) ?? false),
      })),
    );
    const stats = cycleStats(flares, new Date());

    try {
      const html = buildReportHtml({ profile, tempUnit: session.tempUnit(), flares, stats, entries, labels });
      await shareReportPdf(html);
    } catch {
      // Sharing can be cancelled or fail; nothing to do.
    }
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
        onOpenReport={() => void openReport()}
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
          unit={tempUnit}
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
