// LogSheetHost — the single orchestrator, mounted once in the tabs layout so
// the log flow floats above every tab. Reads useLogSheet() and renders the
// matching Sheet: chooser → Log{Symptom,Temp,Med}, or EntryDetail → EditEntry.
// On any successful save it kicks a debounced sync and closes.
import React from "react";
import { Entry } from "../../db/repo";
import { Sheet } from "../../design/Sheet";
import { useServices } from "../../AppServices";
import { useQuery } from "../../db/useQuery";
import { useActiveProfile } from "../../state/activeProfile";
import { useLogSheet } from "../../state/LogSheetContext";
import { FlareDetailScreen, flareTitle } from "../flare/FlareDetailScreen";
import { EditEntry } from "./EditEntry";
import { EntryDetail } from "./EntryDetail";
import { LogChooser } from "./LogChooser";
import { LogMed } from "./LogMed";
import { LogSymptom } from "./LogSymptom";
import { LogTemp } from "./LogTemp";

const TITLES: Record<string, string> = {
  symptom: "Log a symptom",
  temp: "Temperature",
  med: "Medication",
};

export function LogSheetHost(): React.JSX.Element | null {
  const { repo, sync, reminders, session } = useServices();
  const { state, openLog, pick, editEntry, close } = useLogSheet();
  const [profileId] = useActiveProfile(repo);

  const scheduleReminder = (e: Entry, label: string) => void reminders.scheduleFor(e, label);
  const cancelReminder = (entryId: string) => void reminders.cancelFor(entryId);

  // The detail/edit views resolve their entry reactively so deletes/edits
  // elsewhere don't leave a stale sheet.
  const entryId = state.mode === "detail" || state.mode === "edit" ? state.entryId : null;
  const entry = useQuery(["entries"], () => (entryId ? repo.getEntry(entryId) : null));
  const profile = useQuery(["profiles"], () => (profileId ? repo.getProfile(profileId) : null));
  const isPfapa = profile?.condition === "PFAPA";

  const afterSave = () => {
    // Real debounce lands in Task 21; a microtask defer is enough here.
    setTimeout(() => void sync.syncNow(), 0);
    close();
  };

  const onDelete = () => {
    if (entryId) {
      // Cancel any device-local reminder before the entry goes away.
      if (entry?.entryType === "med") void reminders.cancelFor(entryId);
      repo.deleteRecord("entries", entryId);
    }
    setTimeout(() => void sync.syncNow(), 0);
    close();
  };

  const open = state.mode !== "closed";

  let title = "Add entry";
  if (state.mode === "choose") title = "Add entry";
  else if (state.mode === "log") title = TITLES[state.logType];
  else if (state.mode === "detail") title = "Entry";
  else if (state.mode === "edit") title = "Edit entry";
  else if (state.mode === "flare") title = flareTitle(state.flare);

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
          <LogTemp repo={repo} profileId={profileId} onSaved={afterSave} initialDate={state.presetDateIso} />
        ) : (
          <LogMed repo={repo} profileId={profileId} onSaved={afterSave} initialDate={state.presetDateIso} scheduleReminder={scheduleReminder} cancelReminder={cancelReminder} />
        )
      ) : null}

      {state.mode === "detail" && entry ? (
        <EntryDetail repo={repo} entry={entry} onEdit={() => editEntry(entry.id)} onDelete={onDelete} />
      ) : null}

      {state.mode === "edit" && entry ? (
        <EditEntry repo={repo} entry={entry} onSaved={afterSave} isPfapa={isPfapa} scheduleReminder={scheduleReminder} cancelReminder={cancelReminder} />
      ) : null}

      {state.mode === "flare" && profileId ? (
        <FlareDetailScreen repo={repo} profileId={profileId} flare={state.flare} tempUnit={session.tempUnit()} />
      ) : null}
    </Sheet>
  );
}
