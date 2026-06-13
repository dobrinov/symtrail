import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { AddPersonForm } from "../../src/screens/profile/AddPersonForm";
import { SettingsSheet } from "../../src/screens/profile/SettingsSheet";

function repoWith() {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  return new Repo(db, () => "2026-06-12T10:00:00.000Z", () => `id-${++n}`);
}

test("AddPersonForm creates a profile with the entered fields", async () => {
  const repo = repoWith();
  const onSaved = jest.fn();
  await render(<AddPersonForm repo={repo} onSaved={onSaved} />);
  await fireEvent.changeText(screen.getByPlaceholderText("Name"), "Mia");
  await fireEvent.press(screen.getByText("Save"));
  const profiles = repo.listProfiles();
  expect(profiles).toHaveLength(1);
  expect(profiles[0].name).toBe("Mia");
  expect(onSaved).toHaveBeenCalled();
});

test("AddPersonForm edits an existing profile", async () => {
  const repo = repoWith();
  const p = repo.createProfile({ name: "Leo", color: "#FEAE2E" });
  await render(<AddPersonForm repo={repo} editProfileId={p.id} onSaved={() => {}} />);
  await fireEvent.changeText(screen.getByDisplayValue("Leo"), "Leonardo");
  await fireEvent.press(screen.getByText("Save"));
  expect(repo.getProfile(p.id)?.name).toBe("Leonardo");
});

test("deleteProfileCascade marks profile and its entries pending_delete", () => {
  const repo = repoWith();
  const p = repo.createProfile({ name: "Leo" });
  repo.createEntry({ profileId: p.id, entryType: "note", note: "x", recordedAt: "2026-06-10T08:00:00.000Z" });
  repo.deleteProfileCascade(p.id);
  expect(repo.listProfiles()).toHaveLength(0);
  expect(repo.listEntries(p.id)).toHaveLength(0);
  expect(repo.db.get("SELECT pending_delete FROM profiles WHERE id = ?", [p.id])).toEqual({ pending_delete: 1 });
});

test("SettingsSheet change calls both session.setTempUnit and api.updateSettings", async () => {
  const setTempUnit = jest.fn();
  const updateSettings = jest.fn(async () => ({ account: { id: 1, email: "a@b.com", settings: { temp_unit: "f" as const } } }));
  await render(<SettingsSheet unit="c" setTempUnit={setTempUnit} updateSettings={updateSettings} />);
  await fireEvent.press(screen.getByText("Fahrenheit"));
  expect(setTempUnit).toHaveBeenCalledWith("f");
  expect(updateSettings).toHaveBeenCalledWith({ temp_unit: "f" });
});
