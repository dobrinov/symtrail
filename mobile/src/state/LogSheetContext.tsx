// Minimal context for opening the log flow. The real log sheets arrive in
// Task 16; this provides the surface (open/close + state) the shell needs now.
import React, { createContext, useContext, useState } from "react";

export interface LogSheetApi {
  openLog: (presetDateIso?: string) => void;
  openEntry: (entryId: string) => void;
  /** consumed by the host in Task 16 */
  state: { mode: "closed" | "choose"; presetDateIso?: string; entryId?: string };
  close: () => void;
}

const Ctx = createContext<LogSheetApi | null>(null);

export function LogSheetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LogSheetApi["state"]>({ mode: "closed" });
  const api: LogSheetApi = {
    state,
    openLog: (presetDateIso) => setState({ mode: "choose", presetDateIso }),
    openEntry: (entryId) => setState({ mode: "choose", entryId }),
    close: () => setState({ mode: "closed" }),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useLogSheet(): LogSheetApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLogSheet outside LogSheetProvider");
  return v;
}
