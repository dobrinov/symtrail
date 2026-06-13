import { daySeverity } from "../../src/screens/calendar/CalendarScreen";
import { Entry } from "../../src/db/repo";

function entry(partial: Partial<Entry>): Entry {
  return {
    id: "e", profileId: "p", entryType: "note", recordedAt: "2026-06-10T08:00:00.000Z",
    symptomTypeId: null, severity: null, tempC: null, medicationTypeId: null,
    dose: null, reminderAt: null, note: null, ...partial,
  };
}

test("daySeverity returns the max severity across a day's entries", () => {
  const entries = [
    entry({ recordedAt: "2026-06-10T08:00:00.000Z", entryType: "temp", tempC: 38.5 }), // moderate
    entry({ recordedAt: "2026-06-10T12:00:00.000Z", entryType: "symptom", severity: "mild" }),
    entry({ recordedAt: "2026-06-12T09:00:00.000Z", entryType: "symptom", severity: "severe" }),
  ];
  expect(daySeverity(entries, "2026-06-10")).toBe("moderate"); // 38.5 beats mild
  expect(daySeverity(entries, "2026-06-12")).toBe("severe");
  expect(daySeverity(entries, "2026-06-11")).toBe("none"); // nothing logged
});

test("daySeverity ignores med and note entries", () => {
  const entries = [
    entry({ recordedAt: "2026-06-10T08:00:00.000Z", entryType: "med", dose: "5 ml" }),
    entry({ recordedAt: "2026-06-10T09:00:00.000Z", entryType: "note", note: "tired" }),
  ];
  expect(daySeverity(entries, "2026-06-10")).toBe("none");
});
