export interface FlareEntryLike {
  entryType: string;
  recordedAt: string; // ISO
  tempC: number | null;
  symptomKeyIsFever: boolean;
}

export interface Flare {
  onset: Date;
  end: Date;
  peak: number;
  lengthDays: number;
}

export interface CycleStats {
  avg: number; min: number; max: number;
  last: Date; sinceLast: number;
  predicted: Date; windowStart: Date; windowEnd: Date;
}

const DAY_MS = 86400000;
function dayOf(iso: string): number {
  const d = new Date(iso);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
}
function dayToDate(day: number): Date { return new Date(day * DAY_MS); }

// A flare = a cluster of fever days (≤2-day gaps). Fever day = temp ≥ 38°C
// or a fever symptom entry. Port of the prototype's deriveFlares.
export function deriveFlares(entries: FlareEntryLike[]): Flare[] {
  const byDay = new Map<number, { peak: number; fever: boolean }>();
  for (const e of entries) {
    const day = dayOf(e.recordedAt);
    const cur = byDay.get(day) ?? { peak: 0, fever: false };
    if (e.entryType === "temp" && e.tempC != null) {
      cur.peak = Math.max(cur.peak, e.tempC);
      if (e.tempC >= 38) cur.fever = true;
    }
    if (e.entryType === "symptom" && e.symptomKeyIsFever) cur.fever = true;
    byDay.set(day, cur);
  }
  const feverDays = [...byDay.entries()].filter(([, v]) => v.fever).sort((a, b) => a[0] - b[0]);
  const flares: Flare[] = [];
  let cur: { onset: number; end: number; peak: number } | null = null;
  for (const [day, v] of feverDays) {
    if (cur && day - cur.end <= 2) {
      cur.end = day;
      cur.peak = Math.max(cur.peak, v.peak);
    } else {
      if (cur) flares.push(finish(cur));
      cur = { onset: day, end: day, peak: v.peak };
    }
  }
  if (cur) flares.push(finish(cur));
  return flares;
  function finish(c: { onset: number; end: number; peak: number }): Flare {
    return { onset: dayToDate(c.onset), end: dayToDate(c.end), peak: c.peak || 38, lengthDays: c.end - c.onset + 1 };
  }
}

// Port of the prototype's cycleStats: gaps between onsets → avg/min/max,
// prediction = last onset + avg, window = last onset + [min, max].
export function cycleStats(flares: Flare[], today: Date): CycleStats | null {
  if (flares.length < 2) return null;
  const onsets = flares.map((f) => f.onset).sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    gaps.push(Math.round((onsets[i].getTime() - onsets[i - 1].getTime()) / DAY_MS));
  }
  const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  const last = onsets[onsets.length - 1];
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
  return {
    avg, min, max, last,
    sinceLast: Math.round((today.getTime() - last.getTime()) / DAY_MS),
    predicted: addDays(last, avg),
    windowStart: addDays(last, min),
    windowEnd: addDays(last, max),
  };
}
