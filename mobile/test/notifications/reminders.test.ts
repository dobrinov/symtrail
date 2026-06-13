import { ReminderScheduler } from "../../src/notifications/reminders";
import { makeTestDb } from "../helpers/testDb";
import { migrate } from "../../src/db/schema";
import { Repo } from "../../src/db/repo";

function setup() {
  const db = makeTestDb();
  migrate(db);
  let n = 0;
  const repo = new Repo(db, undefined, () => `e${++n}`);
  const calls: Record<string, unknown[]> = { schedule: [], cancel: [] };
  const scheduler = new ReminderScheduler(repo, {
    requestPermission: async () => true,
    schedule: async (title, body, date) => { calls.schedule.push([title, body, date]); return "notif-1"; },
    cancel: async (id) => { calls.cancel.push(id); },
  });
  return { repo, scheduler, calls };
}

test("schedules a notification and records the mapping", async () => {
  const { repo, scheduler, calls } = setup();
  const p = repo.createProfile({ name: "Leo" });
  const e = repo.createEntry({ profileId: p.id, entryType: "med", medicationTypeId: "m1", dose: "5 ml", recordedAt: "2026-06-11T08:00:00.000Z", reminderAt: "2026-06-11T12:00:00.000Z" });
  await scheduler.scheduleFor(e, "Ibuprofen");
  expect(calls.schedule).toHaveLength(1);
  expect(repo.db.get("SELECT notification_id FROM reminder_notifications WHERE entry_id = ?", [e.id])).toBeTruthy();
});

test("cancel removes the scheduled notification and the mapping", async () => {
  const { repo, scheduler, calls } = setup();
  const p = repo.createProfile({ name: "Leo" });
  const e = repo.createEntry({ profileId: p.id, entryType: "med", medicationTypeId: "m1", recordedAt: "2026-06-11T08:00:00.000Z", reminderAt: "2026-06-11T12:00:00.000Z" });
  await scheduler.scheduleFor(e, "Ibuprofen");
  await scheduler.cancelFor(e.id);
  expect(calls.cancel).toEqual(["notif-1"]);
  expect(repo.db.get("SELECT 1 FROM reminder_notifications WHERE entry_id = ?", [e.id])).toBeUndefined();
});

test("rescheduling replaces the previous notification", async () => {
  const { repo, scheduler, calls } = setup();
  const p = repo.createProfile({ name: "Leo" });
  const e = repo.createEntry({ profileId: p.id, entryType: "med", medicationTypeId: "m1", recordedAt: "2026-06-11T08:00:00.000Z", reminderAt: "2026-06-11T12:00:00.000Z" });
  await scheduler.scheduleFor(e, "Ibuprofen");
  await scheduler.scheduleFor({ ...e, reminderAt: "2026-06-11T16:00:00.000Z" }, "Ibuprofen");
  expect(calls.cancel).toEqual(["notif-1"]);
  expect(calls.schedule).toHaveLength(2);
});

test("scheduleFor with no reminderAt is a no-op", async () => {
  const { repo, scheduler, calls } = setup();
  const p = repo.createProfile({ name: "Leo" });
  const e = repo.createEntry({ profileId: p.id, entryType: "med", medicationTypeId: "m1", recordedAt: "2026-06-11T08:00:00.000Z" });
  await scheduler.scheduleFor(e, "Ibuprofen");
  expect(calls.schedule).toHaveLength(0);
});

test("listMedEntries returns med entries joined to their type label/color/strength", () => {
  const { repo } = setup();
  const p = repo.createProfile({ name: "Leo" });
  const m = repo.createMedicationType({ label: "Ibuprofen", strength: "100mg/5ml", color: "#FF0000" });
  repo.createEntry({ profileId: p.id, entryType: "med", medicationTypeId: m.id, dose: "5 ml", recordedAt: "2026-06-11T08:00:00.000Z" });
  // A non-med entry should be excluded.
  repo.createEntry({ profileId: p.id, entryType: "note", note: "hi", recordedAt: "2026-06-11T09:00:00.000Z" });
  const rows = repo.listMedEntries(p.id);
  expect(rows).toHaveLength(1);
  expect(rows[0].label).toBe("Ibuprofen");
  expect(rows[0].strength).toBe("100mg/5ml");
  expect(rows[0].color).toBe("#FF0000");
  expect(rows[0].entry.dose).toBe("5 ml");
});
