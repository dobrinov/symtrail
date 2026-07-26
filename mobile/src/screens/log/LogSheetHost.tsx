// LogSheetHost — the single orchestrator, mounted once in the tabs layout so
// the log flow floats above every tab. Reads useLogSheet() and renders the
// matching Sheet: chooser → Log{Symptom,Temp,Med}, or EntryDetail → EditEntry.
// On any successful save it kicks a debounced sync and closes.
import React, { useEffect } from "react";
import { Entry } from "../../db/repo";
import { LOG_TYPE_NAMES } from "../../analytics";
import { Sheet } from "../../design/Sheet";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { useActiveProfile } from "../../state/activeProfile";
import { useT } from "../../i18n";
import { useLogSheet } from "../../state/LogSheetContext";
import { FlareDetailScreen, flareTitle } from "../flare/FlareDetailScreen";
import { EditEntry } from "./EditEntry";
import { EntryDetail } from "./EntryDetail";
import { LogChooser } from "./LogChooser";
import { LogMed } from "./LogMed";
import { LogSymptom } from "./LogSymptom";
import { LogTemp } from "./LogTemp";

export function LogSheetHost(): React.JSX.Element | null {
  const { repo, reminders, session, analytics, scheduleSync } = useServices();
  const { state, openLog, pick, editEntry, close } = useLogSheet();
  const s = useT();
  const [profileId] = useActiveProfile(repo);

  const scheduleReminder = (e: Entry, label: string) => {
    analytics.track("medication_reminder_set");
    void reminders.scheduleFor(e, label, s.medReminderTitle);
  };
  const cancelReminder = (entryId: string) => void reminders.cancelFor(entryId);

  // The detail/edit views resolve their entry reactively so deletes/edits
  // elsewhere don't leave a stale sheet.
  const entryId = state.mode === "detail" || state.mode === "edit" ? state.entryId : null;
  const entry = useQuery(["entries"], () => (entryId ? repo.getEntry(entryId) : null));
  const profile = useQuery(["profiles"], () => (profileId ? repo.getProfile(profileId) : null));
  const isPfapa = profile?.condition === "PFAPA";
  // Subscribe to sync_meta so a unit change re-renders the open sheet.
  const tempUnit = useQuery(["sync_meta"], () => session.tempUnit());

  // Viewing a flare detail is a distinctive feature worth its own signal.
  useEffect(() => {
    if (state.mode === "flare") analytics.track("flare_viewed");
  }, [state.mode, analytics]);

  const afterSave = () => {
    // Coarse events only: the log type, never its contents (health data).
    if (state.mode === "log") analytics.track(`${LOG_TYPE_NAMES[state.logType]}_logged`);
    else if (state.mode === "edit") analytics.track("log_edited", { log_type: entry ? LOG_TYPE_NAMES[entry.entryType] : "unknown" });
    scheduleSync();
    close();
  };

  const onDelete = () => {
    if (entryId) {
      // Cancel any device-local reminder before the entry goes away.
      if (entry?.entryType === "med") void reminders.cancelFor(entryId);
      repo.deleteRecord("entries", entryId);
      analytics.track("log_deleted", { log_type: entry ? LOG_TYPE_NAMES[entry.entryType] : "unknown" });
    }
    scheduleSync();
    close();
  };

  const open = state.mode !== "closed";

  const TITLES: Record<string, string> = {
    symptom: s.logSymptomTitle,
    temp: s.temperatureTitle,
    med: s.medicationTitle,
  };
  let title = s.addEntry;
  if (state.mode === "choose") title = s.addEntry;
  else if (state.mode === "log") title = TITLES[state.logType];
  else if (state.mode === "detail") title = s.entryTitle;
  else if (state.mode === "edit") title = s.editEntryTitle;
  else if (state.mode === "flare") title = flareTitle(state.flare, s);

  const full = state.mode === "log" || state.mode === "edit" || state.mode === "flare";

  return (
    <Sheet open={open} onClose={close} title={title} full={full}>
      {state.mode === "choose" ? (
        <LogChooser onPick={(m) => pick(m)} forDate={state.presetDateIso} />
      ) : null}

      {state.mode === "log" && profileId ? (
        state.logType === "symptom" ? (
          <LogSymptom repo={repo} profileId={profileId} onSaved={afterSave} initialDate={state.presetDateIso} isPfapa={isPfapa} />
        ) : state.logType === "temp" ? (
          <LogTemp repo={repo} profileId={profileId} onSaved={afterSave} initialDate={state.presetDateIso} tempUnit={tempUnit} />
        ) : (
          <LogMed repo={repo} profileId={profileId} onSaved={afterSave} initialDate={state.presetDateIso} scheduleReminder={scheduleReminder} cancelReminder={cancelReminder} />
        )
      ) : null}

      {state.mode === "detail" && entry ? (
        <EntryDetail repo={repo} entry={entry} onEdit={() => editEntry(entry.id)} onDelete={onDelete} tempUnit={tempUnit} />
      ) : null}

      {state.mode === "edit" && entry ? (
        <EditEntry repo={repo} entry={entry} onSaved={afterSave} tempUnit={tempUnit} isPfapa={isPfapa} scheduleReminder={scheduleReminder} cancelReminder={cancelReminder} />
      ) : null}

      {state.mode === "flare" && profileId ? (
        <FlareDetailScreen repo={repo} profileId={profileId} flare={state.flare} tempUnit={tempUnit} />
      ) : null}
    </Sheet>
  );
}
