import React from "react";
import { render, screen } from "@testing-library/react-native";
import { Entry } from "../../src/db/repo";
import { MonthGrid } from "../../src/screens/calendar/MonthGrid";

function entry(p: Partial<Entry> & { entryType: Entry["entryType"]; recordedAt: string }): Entry {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    profileId: "p1",
    symptomTypeId: null,
    severity: null,
    tempC: null,
    medicationTypeId: null,
    dose: null,
    reminderAt: null,
    note: null,
    ...p,
  };
}

test("med/note days get a log dot, including days tinted by a symptom", async () => {
  const entries = [
    entry({ entryType: "med", medicationTypeId: "m1", recordedAt: "2026-07-17T08:37:00.000Z" }),
    entry({ entryType: "symptom", symptomTypeId: "s1", severity: "moderate", recordedAt: "2026-07-10T09:00:00.000Z" }),
    // symptom + med on the same day → tinted AND dotted
    entry({ entryType: "symptom", symptomTypeId: "s1", severity: "severe", recordedAt: "2026-07-12T09:00:00.000Z" }),
    entry({ entryType: "med", medicationTypeId: "m1", recordedAt: "2026-07-12T12:00:00.000Z" }),
  ];
  await render(
    <MonthGrid
      year={2026}
      month={6}
      entries={entries}
      selectedDay={null}
      onSelectDay={() => {}}
      todayIso="2026-07-18"
    />
  );
  expect(screen.getByTestId("log-dot-2026-07-17")).toBeTruthy(); // med logged, no severity tint
  expect(screen.getByTestId("log-dot-2026-07-12")).toBeTruthy(); // med marker survives the symptom tint
  expect(screen.queryByTestId("log-dot-2026-07-10")).toBeNull(); // symptom-only day: tint, no dot
  expect(screen.queryByTestId("log-dot-2026-07-05")).toBeNull(); // nothing logged
});
