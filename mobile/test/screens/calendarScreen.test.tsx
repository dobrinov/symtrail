import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { CalendarScreen } from "../../src/screens/calendar/CalendarScreen";

const METRICS = initialWindowMetrics ?? {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function seed() {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, undefined, () => `id-${++n}`);
  const profile = repo.createProfile({ name: "Leo" });
  const throat = repo.createSymptomType({ label: "Sore throat", icon: "throat" });
  const ibu = repo.createMedicationType({ label: "Ibuprofen", form: "syrup", defaultDose: "5 ml", color: "#F2802E" });
  const today = new Date().toISOString();
  // an entry >1y old so the list heading takes the dated-with-year branch
  const old = new Date(Date.now() - 400 * 86400000);
  repo.createEntry({ profileId: profile.id, entryType: "symptom", symptomTypeId: throat.id, severity: "mild", recordedAt: today });
  repo.createEntry({ profileId: profile.id, entryType: "med", medicationTypeId: ibu.id, dose: "5 ml", recordedAt: old.toISOString() });
  return { repo, profile, oldHeading: old.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) };
}

test("toggling to list mode shows all entries grouped by day", async () => {
  const { repo, profile, oldHeading } = seed();
  const onOpenEntry = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CalendarScreen repo={repo} profileId={profile.id} onAddToDay={() => {}} onOpenEntry={onOpenEntry} />
    </SafeAreaProvider>
  );
  // month mode by default: weekday header row is visible, old med entry is not
  expect(screen.getByText("Mon")).toBeTruthy();
  expect(screen.queryByText("Ibuprofen · 5 ml")).toBeNull();

  await fireEvent.press(screen.getByText("List"));
  // list mode: both entries with day headings, month grid gone
  expect(screen.queryByText("Mon")).toBeNull();
  expect(screen.getByText("Today")).toBeTruthy();
  expect(screen.getByText("Sore throat")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();
  expect(screen.getByText(oldHeading)).toBeTruthy(); // >1y old → heading includes the year

  await fireEvent.press(screen.getByText("Ibuprofen · 5 ml"));
  expect(onOpenEntry).toHaveBeenCalled();

  // and back to the calendar
  await fireEvent.press(screen.getByText("Calendar"));
  expect(screen.getByText("Mon")).toBeTruthy();
});

test("filter modal narrows the list and clear restores it", async () => {
  const { repo, profile } = seed();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CalendarScreen repo={repo} profileId={profile.id} onAddToDay={() => {}} onOpenEntry={() => {}} />
    </SafeAreaProvider>
  );
  await fireEvent.press(screen.getByText("List"));
  expect(screen.getByText("Sore throat")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();

  // open the filter modal and pick the Medication type
  await fireEvent.press(screen.getByTestId("open-filters"));
  await fireEvent.press(screen.getByText("Medication"));
  await fireEvent.press(screen.getByText("Show results"));

  // list is filtered, summary bar + count shown
  expect(screen.getByText("1 result")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();
  expect(screen.queryByText("Sore throat")).toBeNull();

  // × clears all criteria and restores the full list
  await fireEvent.press(screen.getByTestId("clear-filters"));
  expect(screen.getByText("Sore throat")).toBeTruthy();
  expect(screen.queryByText("1 result")).toBeNull();
});

test("free-text search in the filter modal matches medication text", async () => {
  const { repo, profile } = seed();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CalendarScreen repo={repo} profileId={profile.id} onAddToDay={() => {}} onOpenEntry={() => {}} />
    </SafeAreaProvider>
  );
  await fireEvent.press(screen.getByText("List"));
  await fireEvent.press(screen.getByTestId("open-filters"));
  await fireEvent.changeText(screen.getByPlaceholderText("Symptom, medication, note…"), "ibup");
  await fireEvent.press(screen.getByText("Show results"));
  expect(screen.getByText("1 result")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();
  expect(screen.queryByText("Sore throat")).toBeNull();
});
