import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { SearchScreen } from "../../src/screens/search/SearchScreen";

const METRICS = initialWindowMetrics ?? {
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderWithSafeArea(ui: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}

function seed() {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, () => "2026-06-12T10:00:00.000Z", () => `id-${++n}`);
  const profile = repo.createProfile({ name: "Leo", condition: "PFAPA" });
  const throat = repo.createSymptomType({ label: "Sore throat", icon: "throat", groupName: "PFAPA" });
  const ibu = repo.createMedicationType({ label: "Ibuprofen", brand: "Nurofen", form: "syrup", strength: "100mg/5ml", defaultDose: "5 ml", color: "#F2802E", kind: "Pain / fever" });
  repo.createEntry({ profileId: profile.id, entryType: "symptom", symptomTypeId: throat.id, severity: "severe", recordedAt: "2026-06-10T08:00:00.000Z" });
  repo.createEntry({ profileId: profile.id, entryType: "temp", tempC: 38.5, recordedAt: "2026-06-11T09:00:00.000Z" });
  repo.createEntry({ profileId: profile.id, entryType: "med", medicationTypeId: ibu.id, dose: "5 ml", recordedAt: "2026-06-12T10:00:00.000Z" });
  return { repo, profile };
}

function renderSearch(repo: Repo, profileId: string, onOpenEntry: (id: string) => void = () => {}) {
  return renderWithSafeArea(
    <SearchScreen repo={repo} profileId={profileId} tempUnit="c" onBack={() => {}} onOpenEntry={onOpenEntry} />
  );
}

test("shows all entries by default, newest day first", async () => {
  const { repo, profile } = seed();
  await renderSearch(repo, profile.id);
  expect(screen.getByText("3 results")).toBeTruthy();
  expect(screen.getByText("Sore throat")).toBeTruthy();
  expect(screen.getByText("38.5°C")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();
});

test("free-text search matches medication name and brand", async () => {
  const { repo, profile } = seed();
  await renderSearch(repo, profile.id);
  await fireEvent.changeText(screen.getByPlaceholderText("Symptom, medication, note…"), "nurofen");
  expect(screen.getByText("1 result")).toBeTruthy();
  expect(screen.getByText("Ibuprofen · 5 ml")).toBeTruthy();
  expect(screen.queryByText("Sore throat")).toBeNull();
});

test("type filter narrows to the selected entry types", async () => {
  const { repo, profile } = seed();
  await renderSearch(repo, profile.id);
  await fireEvent.press(screen.getByText("Symptoms"));
  expect(screen.getByText("1 result")).toBeTruthy();
  expect(screen.getByText("Sore throat")).toBeTruthy();
  expect(screen.queryByText("38.5°C")).toBeNull();
  // toggling a second type widens the filter
  await fireEvent.press(screen.getByText("Temperature"));
  expect(screen.getByText("2 results")).toBeTruthy();
});

test("severity filter matches symptom severity and temp bands", async () => {
  const { repo, profile } = seed();
  await renderSearch(repo, profile.id);
  await fireEvent.press(screen.getByText("Severe"));
  expect(screen.getByText("1 result")).toBeTruthy();
  expect(screen.getByText("Sore throat")).toBeTruthy();
  await fireEvent.press(screen.getByText("Moderate")); // 38.5°C → moderate
  expect(screen.getByText("2 results")).toBeTruthy();
});

test("tapping a result opens the entry", async () => {
  const { repo, profile } = seed();
  const onOpenEntry = jest.fn();
  await renderSearch(repo, profile.id, onOpenEntry);
  await fireEvent.press(screen.getByText("Sore throat"));
  expect(onOpenEntry).toHaveBeenCalledWith(repo.listEntries(profile.id).find((e) => e.entryType === "symptom")!.id);
});
