// LogSheetContext — the state machine that drives the floating log flow.
// LogSheetHost (Task 16) reads `state` and renders the matching sheet.
// openLog / openEntry / close keep stable names (Task 15 callers depend on them).
import React, { createContext, useContext, useState } from "react";

export type LogType = "symptom" | "temp" | "med";

export type LogSheetState =
  | { mode: "closed" }
  | { mode: "choose"; presetDateIso?: string }
  | { mode: "log"; logType: LogType; presetDateIso?: string }
  | { mode: "detail"; entryId: string }
  | { mode: "edit"; entryId: string };

export interface LogSheetApi {
  state: LogSheetState;
  /** Open the chooser (optionally pre-setting the date, e.g. from the calendar). */
  openLog: (presetDateIso?: string) => void;
  /** Pick a log type from the chooser. */
  pick: (logType: LogType) => void;
  /** Open an entry's read-only detail view. */
  openEntry: (entryId: string) => void;
  /** Switch the current entry into edit mode. */
  editEntry: (entryId: string) => void;
  close: () => void;
}

const Ctx = createContext<LogSheetApi | null>(null);

export function LogSheetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LogSheetState>({ mode: "closed" });
  const value: LogSheetApi = {
    state,
    openLog: (presetDateIso) => setState({ mode: "choose", presetDateIso }),
    pick: (logType) =>
      setState((s) => ({
        mode: "log",
        logType,
        presetDateIso: s.mode === "choose" ? s.presetDateIso : undefined,
      })),
    openEntry: (entryId) => setState({ mode: "detail", entryId }),
    editEntry: (entryId) => setState({ mode: "edit", entryId }),
    close: () => setState({ mode: "closed" }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLogSheet(): LogSheetApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLogSheet outside LogSheetProvider");
  return v;
}
