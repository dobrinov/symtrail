import { useEffect, useReducer, useRef } from "react";
import { onTableChange } from "./events";

/** Runs queryFn now and re-runs whenever any watched table changes. */
export function useQuery<T>(tables: string[], queryFn: () => T): T {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const key = tables.join(",");
  useEffect(() => {
    const offs = key.split(",").filter(Boolean).map((t) => onTableChange(t, bump));
    return () => offs.forEach((off) => off());
  }, [key]);
  const value = useRef<T>(undefined as T);
  void tick; // tick forces re-render; query re-runs on every render
  value.current = queryFn();
  return value.current;
}
