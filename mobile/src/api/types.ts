export interface AccountJson { id: number; email: string; settings: { temp_unit: "c" | "f" }; }
export interface AuthResponse { account: AccountJson; token: string; }

export interface TableChanges {
  updated: Record<string, unknown>[];
  deleted: string[];
}
export interface PullResponse {
  changes: Partial<Record<"profiles" | "symptom_types" | "medication_types" | "entries", TableChanges>>;
  cursor: number;
}
export interface PushChanges {
  [table: string]: { updated?: Record<string, unknown>[]; deleted?: string[] };
}
export interface PushResponse { accepted: string[]; rejected: { id: string; reason: string }[]; }
