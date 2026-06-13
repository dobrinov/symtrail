// ReminderScheduler — schedules local med-reminder notifications and keeps a
// device-local entry_id → notification_id mapping in reminder_notifications so
// a reminder can be cancelled or replaced when its entry is edited/deleted.
//
// Reminders are device-local in v1: reminderAt syncs as entry data, but only
// the device that scheduled the notification fires it (documented limitation).
//
// The native side is injected as a NotifPort so the scheduler is unit-testable
// without expo-notifications; expoNotifPort() is the production adapter.
import { Entry, Repo } from "../db/repo";

export interface NotifPort {
  requestPermission(): Promise<boolean>;
  schedule(title: string, body: string, date: Date): Promise<string>;
  cancel(notificationId: string): Promise<void>;
}

export class ReminderScheduler {
  constructor(private repo: Repo, private port: NotifPort) {}

  async scheduleFor(entry: Entry, medLabel: string): Promise<void> {
    if (!entry.reminderAt) return;
    if (!(await this.port.requestPermission())) return;
    await this.cancelFor(entry.id);
    const id = await this.port.schedule(
      "Medication reminder",
      `${medLabel}${entry.dose ? ` · ${entry.dose}` : ""}`,
      new Date(entry.reminderAt),
    );
    this.repo.db.run(
      "INSERT INTO reminder_notifications (entry_id, notification_id) VALUES (?, ?) ON CONFLICT(entry_id) DO UPDATE SET notification_id = excluded.notification_id",
      [entry.id, id],
    );
  }

  async cancelFor(entryId: string): Promise<void> {
    const row = this.repo.db.get<{ notification_id: string }>(
      "SELECT notification_id FROM reminder_notifications WHERE entry_id = ?",
      [entryId],
    );
    if (!row) return;
    await this.port.cancel(row.notification_id);
    this.repo.db.run("DELETE FROM reminder_notifications WHERE entry_id = ?", [entryId]);
  }
}

// Production adapter over expo-notifications (SDK 56). The DATE trigger shape
// is { type: SchedulableTriggerInputTypes.DATE, date } and the granted flag is
// the PermissionResponse.granted convenience boolean — both verified against
// the installed typings.
export function expoNotifPort(): NotifPort {
  const N = require("expo-notifications");
  return {
    requestPermission: async () => (await N.requestPermissionsAsync()).granted,
    schedule: (title: string, body: string, date: Date) =>
      N.scheduleNotificationAsync({
        content: { title, body },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date },
      }),
    cancel: (id: string) => N.cancelScheduledNotificationAsync(id),
  };
}
