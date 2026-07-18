// Entry filtering for the history list: free text (symptom / medication /
// note text), entry-type and severity multi-selects, and an inclusive
// from/to day range ("YYYY-MM-DD", UTC day prefix like the rest of the app).
import type { Entry, MedicationType, SymptomType } from "../db/repo";
import { fmt, Strings } from "../i18n";
import { SeverityKey, tempToSeverity } from "./severity";

export interface EntryFilters {
  q: string;
  types: Entry["entryType"][];
  sevs: SeverityKey[];
  from: string | null;
  to: string | null;
}

export const EMPTY_FILTERS: EntryFilters = { q: "", types: [], sevs: [], from: null, to: null };

export function filtersActive(f: EntryFilters): boolean {
  return f.q.trim() !== "" || f.types.length > 0 || f.sevs.length > 0 || f.from != null || f.to != null;
}

// Severity of an entry for filtering: temps map through the fever bands,
// symptoms use their logged level, med/note entries have none.
export function entrySeverity(e: Entry): SeverityKey {
  if (e.entryType === "temp") return tempToSeverity(e.tempC);
  if (e.entryType === "symptom") return (e.severity ?? "mild") as SeverityKey;
  return "none";
}

export function filterEntries(
  entries: Entry[],
  f: EntryFilters,
  symptomTypes: Map<string, SymptomType>,
  medTypes: Map<string, MedicationType>,
): Entry[] {
  const ql = f.q.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.types.length && !f.types.includes(e.entryType)) return false;
    if (f.sevs.length && !f.sevs.includes(entrySeverity(e))) return false;
    const day = e.recordedAt.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    if (ql) {
      const st = e.symptomTypeId ? symptomTypes.get(e.symptomTypeId) : undefined;
      const mt = e.medicationTypeId ? medTypes.get(e.medicationTypeId) : undefined;
      const hay = [
        st?.label,
        mt?.label,
        mt?.brand,
        e.dose,
        e.note,
        e.entryType === "temp" ? "temperature" : null,
        e.entryType === "temp" && e.tempC != null ? e.tempC.toFixed(1) : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });
}

function fmtDay(dayIso: string, locale: string): string {
  return new Date(`${dayIso}T00:00:00.000Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
}

// Short human summary of the active criteria for the search bar.
export function summarizeFilters(f: EntryFilters, s: Strings): string {
  const typeLabels: Record<Entry["entryType"], string> = {
    symptom: s.typeSymptoms,
    temp: s.typeTemperature,
    med: s.typeMedication,
    note: s.typeNotes,
  };
  const parts: string[] = [];
  if (f.q.trim()) parts.push(`"${f.q.trim()}"`);
  if (f.types.length) parts.push(f.types.map((k) => typeLabels[k]).join(", "));
  if (f.sevs.length) parts.push(f.sevs.map((k) => s.severity[k]).join(", "));
  if (f.from && f.to) parts.push(`${fmtDay(f.from, s.locale)} – ${fmtDay(f.to, s.locale)}`);
  else if (f.from) parts.push(fmt(s.fromDay, { date: fmtDay(f.from, s.locale) }));
  else if (f.to) parts.push(fmt(s.untilDay, { date: fmtDay(f.to, s.locale) }));
  return parts.join(" · ");
}
