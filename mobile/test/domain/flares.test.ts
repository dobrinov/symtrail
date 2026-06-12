import { deriveFlares, cycleStats, FlareEntryLike } from "../../src/domain/flares";

function tempEntry(dateIso: string, temp: number): FlareEntryLike {
  return { entryType: "temp", recordedAt: dateIso, tempC: temp, symptomKeyIsFever: false };
}
function feverSymptom(dateIso: string): FlareEntryLike {
  return { entryType: "symptom", recordedAt: dateIso, tempC: null, symptomKeyIsFever: true };
}

test("clusters consecutive fever days into one flare", () => {
  const flares = deriveFlares([
    tempEntry("2026-01-10T08:00:00Z", 38.5),
    tempEntry("2026-01-11T08:00:00Z", 39.4),
    tempEntry("2026-01-12T08:00:00Z", 38.2),
  ]);
  expect(flares).toHaveLength(1);
  expect(flares[0].lengthDays).toBe(3);
  expect(flares[0].peak).toBe(39.4);
});

test("a ≤2-day gap stays one flare; a 3-day gap splits", () => {
  const oneFlares = deriveFlares([
    tempEntry("2026-01-10T08:00:00Z", 38.5),
    tempEntry("2026-01-12T08:00:00Z", 38.5),
  ]);
  expect(oneFlares).toHaveLength(1);
  const twoFlares = deriveFlares([
    tempEntry("2026-01-10T08:00:00Z", 38.5),
    tempEntry("2026-01-13T08:00:00Z", 38.5),
  ]);
  expect(twoFlares).toHaveLength(2);
});

test("sub-38 temps don't start flares but fever symptom does", () => {
  expect(deriveFlares([tempEntry("2026-01-10T08:00:00Z", 37.5)])).toHaveLength(0);
  expect(deriveFlares([feverSymptom("2026-01-10T08:00:00Z")])).toHaveLength(1);
});

test("cycleStats matches the prototype's math on Leo's flare onsets", () => {
  const flares = [
    "2025-12-20", "2026-01-24", "2026-02-28", "2026-04-06", "2026-05-11",
  ].map((d) => ({ onset: new Date(d + "T00:00:00Z"), end: new Date(d + "T00:00:00Z"), peak: 39, lengthDays: 4 }));
  const stats = cycleStats(flares, new Date("2026-06-10T00:00:00Z"));
  expect(stats!.avg).toBe(36);
  expect(stats!.min).toBe(35);
  expect(stats!.max).toBe(37);
  expect(stats!.sinceLast).toBe(30);
  expect(stats!.predicted.toISOString().slice(0, 10)).toBe("2026-06-16");
  expect(stats!.windowStart.toISOString().slice(0, 10)).toBe("2026-06-15");
  expect(stats!.windowEnd.toISOString().slice(0, 10)).toBe("2026-06-17");
});

test("cycleStats needs at least 2 flares", () => {
  expect(cycleStats([], new Date())).toBeNull();
  expect(cycleStats([{ onset: new Date(), end: new Date(), peak: 39, lengthDays: 3 }], new Date())).toBeNull();
});
