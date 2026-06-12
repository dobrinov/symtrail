export type SeverityKey = "none" | "mild" | "moderate" | "high" | "severe";
export const SEVERITY: Record<SeverityKey, { key: SeverityKey; label: string; color: string; text: string; dot: string }> = {
  none:     { key: "none",     label: "Well",     color: "#DAD8E3", text: "#59586E", dot: "#C7C3D6" },
  mild:     { key: "mild",     label: "Mild",     color: "#FBE3A6", text: "#8A6A12", dot: "#F4CD63" },
  moderate: { key: "moderate", label: "Moderate", color: "#FEAE2E", text: "#5C3D00", dot: "#FEAE2E" },
  high:     { key: "high",     label: "High",     color: "#F2802E", text: "#FFFFFF", dot: "#F2802E" },
  severe:   { key: "severe",   label: "Severe",   color: "#E1542E", text: "#FFFFFF", dot: "#E1542E" },
};
export const SEVERITY_ORDER: SeverityKey[] = ["none", "mild", "moderate", "high", "severe"];

export function tempToSeverity(t: number | null | undefined): SeverityKey {
  if (t == null) return "none";
  if (t < 37.0) return "none";
  if (t < 38.0) return "mild";
  if (t < 39.0) return "moderate";
  if (t < 40.0) return "high";
  return "severe";
}

export function cToF(c: number): number { return Math.round((c * 9 / 5 + 32) * 10) / 10; }
export function fToC(f: number): number { return Math.round(((f - 32) * 5 / 9) * 10) / 10; }
export function formatTemp(c: number, unit: "c" | "f"): string {
  return unit === "f" ? `${cToF(c).toFixed(1)}°F` : `${c.toFixed(1)}°C`;
}
