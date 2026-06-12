type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function onTableChange(table: string, fn: Listener): () => void {
  if (!listeners.has(table)) listeners.set(table, new Set());
  listeners.get(table)!.add(fn);
  return () => listeners.get(table)!.delete(fn);
}

export function emitTableChange(table: string): void {
  listeners.get(table)?.forEach((fn) => fn());
}
