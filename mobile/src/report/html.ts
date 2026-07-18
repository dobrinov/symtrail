// Doctor-report HTML builder. Produces a self-contained HTML document (inline
// styles only — the PDF renderer has no external CSS) summarising one profile's
// recorded history: header, cycle summary, flare list, a temperature chart over
// the last 90 days, and a chronological entries table.
//
// CRITICAL: every user-entered string (profile name, condition, note text, dose,
// catalogue labels) is escaped via esc() to keep injected markup out of the PDF.
import { CycleStats, Flare } from "../domain/flares";
import { Entry, Profile } from "../db/repo";
import { formatTemp, SeverityKey } from "../domain/severity";
import { ageLabelI18n, fmt, Strings } from "../i18n";
import { en } from "../i18n/en";

export interface ReportInput {
  profile: Profile;
  tempUnit: "c" | "f";
  flares: Flare[];
  stats: CycleStats | null;
  entries: Entry[]; // the profile's entries, any order
  labels: Record<string, string>; // catalogue id → display label (pre-translated)
  strings?: Strings; // report language; defaults to English
}

const DAY_MS = 86400000;

// Escapes the five HTML-significant characters. Used on every dynamic string.
function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function fmtDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  });
}

function flareRange(f: Flare, locale: string): string {
  const mo = f.onset.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
  const me = f.end.toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
  const od = f.onset.getUTCDate();
  const ed = f.end.getUTCDate();
  return mo === me ? `${od}–${ed} ${mo}` : `${od} ${mo} – ${ed} ${me}`;
}

// Inline <svg> polyline over temp readings from the last 90 days. Emits an <svg>
// whenever there is ≥1 temp reading (a single point renders as a lone dot);
// otherwise renders a "not enough data" note.
function tempChartSvg(entries: Entry[], unit: "c" | "f", s: Strings): string {
  const cutoff = Date.now() - 90 * DAY_MS;
  const points = entries
    .filter((e) => e.entryType === "temp" && e.tempC != null)
    .map((e) => ({ t: new Date(e.recordedAt).getTime(), temp: e.tempC as number }))
    .filter((p) => p.t >= cutoff)
    .sort((a, b) => a.t - b.t);

  if (points.length < 1) {
    return `<p style="color:#777;font-size:13px;margin:8px 0;">${esc(s.reportNotEnoughTemp)}</p>`;
  }

  const W = 720;
  const H = 220;
  const padX = 40;
  const padY = 24;
  const minTemp = Math.min(36, ...points.map((p) => p.temp)) - 0.5;
  const maxTemp = Math.max(40, ...points.map((p) => p.temp)) + 0.5;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const spanT = tMax - tMin || 1;
  const spanY = maxTemp - minTemp || 1;

  const x = (t: number) => padX + ((t - tMin) / spanT) * (W - 2 * padX);
  const y = (temp: number) => padY + (1 - (temp - minTemp) / spanY) * (H - 2 * padY);

  // Gridline at 38°C (fever threshold).
  const feverY = y(38);
  const grid = `<line x1="${padX}" y1="${feverY.toFixed(1)}" x2="${W - padX}" y2="${feverY.toFixed(1)}" stroke="#E5B5A5" stroke-width="1" stroke-dasharray="4 4" />`
    + `<text x="${W - padX}" y="${(feverY - 4).toFixed(1)}" font-size="11" fill="#B05A3A" text-anchor="end">38°C</text>`;

  const dots = points
    .map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.temp).toFixed(1)}" r="3" fill="#E1542E" />`)
    .join("");

  let line = "";
  if (points.length >= 2) {
    const pts = points.map((p) => `${x(p.t).toFixed(1)},${y(p.temp).toFixed(1)}`).join(" ");
    line = `<polyline points="${pts}" fill="none" stroke="#E1542E" stroke-width="2" />`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg" style="background:#FAFAFC;border-radius:8px;">`
    + `<line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#DDD" stroke-width="1" />`
    + grid + line + dots
    + `</svg>`;
}

function entryDetail(e: Entry, unit: "c" | "f", labels: Record<string, string>, s: Strings): string {
  switch (e.entryType) {
    case "temp":
      return e.tempC != null ? esc(formatTemp(e.tempC, unit)) : "—";
    case "symptom": {
      const label = (e.symptomTypeId && labels[e.symptomTypeId]) || s.symptomFallback;
      const sev = e.severity ? s.severity[e.severity as SeverityKey] ?? e.severity : null;
      return esc(sev ? `${label} · ${sev}` : label);
    }
    case "med": {
      const label = (e.medicationTypeId && labels[e.medicationTypeId]) || s.medicationFallback;
      return esc(e.dose ? `${label} · ${e.dose}` : label);
    }
    case "note":
      return esc(e.note ?? s.noteFallback);
    default:
      return "—";
  }
}

export function buildReportHtml(input: ReportInput): string {
  const { profile, tempUnit, flares, stats, entries, labels } = input;
  const s = input.strings ?? en;
  const locale = s.locale;
  const typeLabel: Record<Entry["entryType"], string> = {
    temp: s.temperatureFallback,
    symptom: s.symptomFallback,
    med: s.medicationFallback,
    note: s.noteFallback,
  };

  const headerBits = [
    ageLabelI18n(profile.birthDate, s),
    profile.sex,
    profile.condition,
  ].filter(Boolean).map((b) => esc(b as string));
  const subtitle = headerBits.join(" · ");

  const flareRows = flares.length
    ? flares
        .map(
          (f) =>
            `<tr><td style="${TD}">${esc(flareRange(f, locale))}</td><td style="${TD}">${esc(formatTemp(f.peak, tempUnit))}</td>`
            + `<td style="${TD}">${esc(f.lengthDays === 1 ? s.reportDayOne : fmt(s.reportDaysMany, { n: f.lengthDays }))}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" style="${TD};color:#777;">${esc(s.reportNoFlares)}</td></tr>`;

  let cycleSection = "";
  if (stats) {
    cycleSection = `
      <h2 style="${H2}">${esc(s.reportCycleSummary)}</h2>
      <table style="${TABLE}">
        <tr><td style="${TD}">${esc(s.reportAverageGap)}</td><td style="${TD}">${esc(fmt(s.reportAvgGapValue, { avg: stats.avg, min: stats.min, max: stats.max }))}</td></tr>
        <tr><td style="${TD}">${esc(s.reportLastOnset)}</td><td style="${TD}">${esc(fmtDate(stats.last, locale))}</td></tr>
        <tr><td style="${TD}">${esc(s.reportPredictedNext)}</td><td style="${TD}">${esc(fmtDate(stats.predicted, locale))}</td></tr>
        <tr><td style="${TD}">${esc(s.reportExpectedWindow)}</td><td style="${TD}">${esc(fmtDate(stats.windowStart, locale))} – ${esc(fmtDate(stats.windowEnd, locale))}</td></tr>
      </table>`;
  }

  const timeline = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const entryRows = timeline.length
    ? timeline
        .map(
          (e) =>
            `<tr><td style="${TD}">${esc(fmtDateTime(e.recordedAt, locale))}</td>`
            + `<td style="${TD}">${esc(typeLabel[e.entryType])}</td>`
            + `<td style="${TD}">${entryDetail(e, tempUnit, labels, s)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" style="${TD};color:#777;">${esc(s.reportNoEntries)}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1C1B29;margin:0;padding:28px;">
  <div style="border-bottom:2px solid #6C5CE7;padding-bottom:12px;margin-bottom:20px;">
    <h1 style="font-size:26px;margin:0;color:#1C1B29;">${esc(profile.name)}</h1>
    ${subtitle ? `<p style="margin:4px 0 0;color:#59586E;font-size:14px;">${subtitle}</p>` : ""}
    <p style="margin:6px 0 0;color:#999;font-size:12px;">${esc(fmt(s.reportSubtitle, { date: fmtDate(new Date(), locale) }))}</p>
  </div>

  ${cycleSection}

  <h2 style="${H2}">${esc(s.reportFlares)}</h2>
  <table style="${TABLE}">
    <tr><th style="${TH}">${esc(s.reportDates)}</th><th style="${TH}">${esc(s.reportPeak)}</th><th style="${TH}">${esc(s.reportLength)}</th></tr>
    ${flareRows}
  </table>

  <h2 style="${H2}">${esc(s.reportTempLast90)}</h2>
  ${tempChartSvg(entries, tempUnit, s)}

  <h2 style="${H2}">${esc(s.reportEntries)}</h2>
  <table style="${TABLE}">
    <tr><th style="${TH}">${esc(s.reportWhen)}</th><th style="${TH}">${esc(s.reportType)}</th><th style="${TH}">${esc(s.reportDetail)}</th></tr>
    ${entryRows}
  </table>
</body>
</html>`;
}

const H2 = "font-size:16px;margin:24px 0 8px;color:#1C1B29;";
const TABLE = "width:100%;border-collapse:collapse;font-size:13px;";
const TH = "text-align:left;padding:6px 8px;border-bottom:2px solid #DDD;color:#59586E;font-weight:600;";
const TD = "text-align:left;padding:6px 8px;border-bottom:1px solid #EEE;";
