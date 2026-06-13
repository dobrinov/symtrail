import { flareChartSeries, flareTitle } from "../../src/screens/flare/FlareDetailScreen";
import { Entry } from "../../src/db/repo";
import { Flare } from "../../src/domain/flares";

function tempEntry(iso: string, temp: number): Entry {
  return {
    id: iso, profileId: "p", entryType: "temp", recordedAt: iso, symptomTypeId: null,
    severity: null, tempC: temp, medicationTypeId: null, dose: null, reminderAt: null, note: null,
  };
}

const flare: Flare = {
  onset: new Date("2026-05-11T00:00:00Z"),
  end: new Date("2026-05-13T00:00:00Z"),
  peak: 40.2,
  lengthDays: 3,
};

test("flareChartSeries returns sorted temp points within the flare range", () => {
  const entries = [
    tempEntry("2026-05-12T19:00:00Z", 39.5),
    tempEntry("2026-05-11T08:00:00Z", 38.5),
    tempEntry("2026-05-13T08:00:00Z", 38.0),
    tempEntry("2026-05-20T08:00:00Z", 39.0), // outside the flare → excluded
    tempEntry("2026-05-10T08:00:00Z", 38.2), // before onset → excluded
  ];
  const series = flareChartSeries(entries, flare);
  expect(series.map((p) => p.temp)).toEqual([38.5, 39.5, 38.0]); // sorted ascending by time
  expect(series.every((p) => typeof p.t === "number")).toBe(true);
});

test("flareTitle formats same-month and cross-month ranges", () => {
  expect(flareTitle(flare)).toBe("Flare · 11–13 May");
  const crossMonth: Flare = {
    onset: new Date("2026-02-28T00:00:00Z"), end: new Date("2026-03-02T00:00:00Z"),
    peak: 39.5, lengthDays: 3,
  };
  expect(flareTitle(crossMonth)).toBe("Flare · 28 Feb – 2 Mar");
});
