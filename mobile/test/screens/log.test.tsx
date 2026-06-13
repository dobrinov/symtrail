import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { LogSymptom } from "../../src/screens/log/LogSymptom";
import { LogTemp } from "../../src/screens/log/LogTemp";
import { LogMed } from "../../src/screens/log/LogMed";

function seed() {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, () => "2026-06-12T10:00:00.000Z", () => `id-${++n}`);
  const profile = repo.createProfile({ name: "Leo", condition: "PFAPA" });
  const throat = repo.createSymptomType({ label: "Sore throat", icon: "throat", groupName: "PFAPA" });
  const ibu = repo.createMedicationType({ label: "Ibuprofen", brand: "Nurofen", form: "syrup", strength: "100mg/5ml", defaultDose: "5 ml", color: "#F2802E", kind: "Pain / fever" });
  return { repo, profile, throat, ibu };
}

test("LogSymptom saves a symptom entry with chosen severity", async () => {
  const { repo, profile, throat } = seed();
  const onSaved = jest.fn();
  await render(<LogSymptom repo={repo} profileId={profile.id} onSaved={onSaved} />);
  await fireEvent.press(screen.getByText("Sore throat"));
  await fireEvent.press(screen.getByText("Mild"));
  await fireEvent.press(screen.getByText("Save"));
  const entries = repo.listEntries(profile.id);
  expect(entries).toHaveLength(1);
  expect(entries[0].entryType).toBe("symptom");
  expect(entries[0].symptomTypeId).toBe(throat.id);
  expect(entries[0].severity).toBe("mild");
  expect(onSaved).toHaveBeenCalled();
});

test("LogTemp saves a temp entry and shows the live severity", async () => {
  const { repo, profile } = seed();
  await render(<LogTemp repo={repo} profileId={profile.id} onSaved={() => {}} />);
  // default value renders a severity label (mild for 37.0); assert it then save.
  expect(screen.getByText("Mild")).toBeTruthy();
  await fireEvent.press(screen.getByText("Save"));
  const entries = repo.listEntries(profile.id);
  expect(entries).toHaveLength(1);
  expect(entries[0].entryType).toBe("temp");
  expect(entries[0].tempC).toBeGreaterThanOrEqual(35);
  expect(entries[0].tempC).toBeLessThanOrEqual(42);
});

test("LogMed saves a med entry with the default dose and optional reminder", async () => {
  const { repo, profile, ibu } = seed();
  const scheduleReminder = jest.fn();
  await render(<LogMed repo={repo} profileId={profile.id} onSaved={() => {}} scheduleReminder={scheduleReminder} />);
  await fireEvent.press(screen.getByText("Ibuprofen"));
  await fireEvent.press(screen.getByText("Save"));
  const entries = repo.listEntries(profile.id);
  expect(entries).toHaveLength(1);
  expect(entries[0].entryType).toBe("med");
  expect(entries[0].medicationTypeId).toBe(ibu.id);
  expect(entries[0].dose).toBe("5 ml"); // prefilled from default_dose
});

test("editing a med to turn its reminder off cancels the stale notification", async () => {
  const { repo, profile, ibu } = seed();
  const entry = repo.createEntry({
    profileId: profile.id, entryType: "med", medicationTypeId: ibu.id, dose: "5 ml",
    recordedAt: "2026-06-12T08:00:00.000Z", reminderAt: "2026-06-12T12:00:00.000Z",
  });
  const cancelReminder = jest.fn();
  await render(
    <LogMed repo={repo} profileId={profile.id} onSaved={() => {}} editEntryId={entry.id}
      scheduleReminder={jest.fn()} cancelReminder={cancelReminder} />
  );
  // Toggle the reminder switch off, then save.
  await fireEvent(screen.getByRole("switch"), "valueChange", false);
  await fireEvent.press(screen.getByText("Save"));
  expect(cancelReminder).toHaveBeenCalledWith(entry.id);
  expect(repo.getEntry(entry.id)?.reminderAt).toBeNull();
});
