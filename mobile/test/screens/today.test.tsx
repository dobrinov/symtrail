import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";
import { TodayScreen } from "../../src/screens/today/TodayScreen";

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
  const repo = new Repo(db, undefined, () => `id-${++n}`);
  const profile = repo.createProfile({ name: "Leo", condition: "PFAPA", color: "#FEAE2E" });
  return { repo, profile };
}

test("shows status from today's max severity and lists recent entries", async () => {
  const { repo, profile } = seed();
  const todayIso = new Date().toISOString();
  repo.createEntry({ profileId: profile.id, entryType: "temp", tempC: 38.5, recordedAt: todayIso });
  const st = repo.createSymptomType({ label: "Sore throat", icon: "throat" });
  repo.createEntry({ profileId: profile.id, entryType: "symptom", symptomTypeId: st.id, severity: "mild", recordedAt: todayIso });
  await renderWithSafeArea(
    <TodayScreen repo={repo} profileId={profile.id} onSwitchProfile={() => {}} onOpenEntry={() => {}} />
  );
  expect(screen.getByText(/Moderate/)).toBeTruthy(); // 38.5 → moderate beats mild
  expect(screen.getByText("Sore throat")).toBeTruthy();
});

test("prediction card renders for a PFAPA profile with >= 2 flares", async () => {
  const { repo, profile } = seed();
  // two past flares ~35 days apart
  for (const onset of ["2026-04-01", "2026-05-06"]) {
    for (let d = 0; d < 3; d++) {
      const date = new Date(Date.parse(onset + "T08:00:00Z") + d * 86400000).toISOString();
      repo.createEntry({ profileId: profile.id, entryType: "temp", tempC: 39.2, recordedAt: date });
    }
  }
  await renderWithSafeArea(
    <TodayScreen repo={repo} profileId={profile.id} onSwitchProfile={() => {}} onOpenEntry={() => {}} />
  );
  expect(screen.getByText(/flare/i)).toBeTruthy(); // prediction card copy mentions the flare window
});
