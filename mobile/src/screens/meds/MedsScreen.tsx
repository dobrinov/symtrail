// MedsScreen — medication-focused view: upcoming reminders (future reminderAt,
// soonest first) and dose history grouped by day (newest first). Ported from
// docs/prototype/screens-meds.jsx; search/stats trimmed for v1.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MedEntryRow, Repo } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTokens } from "../../design/theme";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

// "YYYY-MM-DD" bucket from the UTC date prefix, matching the rest of the app.
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Friendly relative heading for a day bucket: Today / Yesterday / weekday / date.
function relDay(dayIso: string, now: Date): string {
  const todayKey = now.toISOString().slice(0, 10);
  const dayMs = 86400000;
  const a = Date.parse(`${dayIso}T00:00:00.000Z`);
  const b = Date.parse(`${todayKey}T00:00:00.000Z`);
  const diff = Math.round((b - a) / dayMs);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  if (diff > 1 && diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

interface DayGroup {
  key: string;
  rows: MedEntryRow[];
}

function groupByDay(rows: MedEntryRow[]): DayGroup[] {
  const groups = new Map<string, MedEntryRow[]>();
  for (const r of rows) {
    const k = dayKey(r.entry.recordedAt);
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }
  // rows already arrive newest-first; Map preserves insertion order → days newest-first.
  return Array.from(groups, ([key, rs]) => ({ key, rows: rs }));
}

export function MedsScreen({
  repo,
  profileId,
  onOpenEntry,
}: {
  repo: Repo;
  profileId: string;
  onOpenEntry: (id: string) => void;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const rows = useQuery(["entries", "medication_types"], () => repo.listMedEntries(profileId));
  const profile = useQuery(["profiles"], () => repo.getProfile(profileId));
  const now = new Date();
  const nowMs = now.getTime();

  const upcoming = rows
    .filter((r) => r.entry.reminderAt && Date.parse(r.entry.reminderAt) > nowMs)
    .sort((a, b) => Date.parse(a.entry.reminderAt!) - Date.parse(b.entry.reminderAt!));

  const days = groupByDay(rows);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
    >
      <View style={styles.head}>
        <Text style={styles.title}>Medications</Text>
        <Text style={styles.subtitle}>{profile ? `${profile.name}'s doses & history` : "Doses & history"}</Text>
      </View>

      <View style={styles.body}>
        {rows.length === 0 ? (
          <Card pad={22} style={{ alignItems: "center" }}>
            <Text style={styles.emptyText}>No medications logged yet.</Text>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <>
                <Text style={styles.sectionHeader}>Upcoming reminders</Text>
                <View style={styles.upcomingList}>
                  {upcoming.map((r) => (
                    <Card key={r.entry.id} pad={15} style={styles.upcomingCard}>
                      <View style={[styles.glyph, { backgroundColor: (r.color ?? t.balance) + "22" }]}>
                        <Icon name="bell" size={22} color={r.color ?? t.balance} sw={1.9} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.upcomingTitle} numberOfLines={1}>
                          {r.label}
                          {r.entry.dose ? ` · ${r.entry.dose}` : ""}
                        </Text>
                        <Text style={styles.upcomingSub}>
                          {relDay(dayKey(r.entry.reminderAt!), now)} · {fmtTime(r.entry.reminderAt!)}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionHeader}>Dose history</Text>
            <View style={styles.dayList}>
              {days.map((g) => (
                <View key={g.key}>
                  <Text style={styles.dayHeading}>{relDay(g.key, now)}</Text>
                  <Card pad={14}>
                    {g.rows.map((r, i) => (
                      <PressableScale
                        key={r.entry.id}
                        onPress={() => onOpenEntry(r.entry.id)}
                        style={[styles.row, i < g.rows.length - 1 && styles.rowBorder]}
                      >
                        <View style={[styles.dot, { backgroundColor: r.color ?? t.balance }]} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {r.label}
                            {r.entry.dose ? ` · ${r.entry.dose}` : ""}
                          </Text>
                          {r.strength ? <Text style={styles.rowSub}>{r.strength}</Text> : null}
                        </View>
                        <Text style={styles.rowTime}>{fmtTime(r.entry.recordedAt)}</Text>
                      </PressableScale>
                    ))}
                  </Card>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.canvas },
  head: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  title: { fontSize: 28, fontFamily: "Sora_700Bold", color: t.anchor, letterSpacing: -0.6 },
  subtitle: { fontSize: 13.5, color: t.grey, marginTop: 2 },
  body: { paddingHorizontal: 20 },
  emptyText: { fontSize: 15, color: t.grey },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
  },
  upcomingList: { gap: 10 },
  upcomingCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  glyph: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  upcomingTitle: { fontSize: 16, fontFamily: "Sora_700Bold", color: t.anchor, letterSpacing: -0.2 },
  upcomingSub: { fontSize: 12.5, color: t.grey, marginTop: 2 },
  dayList: { gap: 16 },
  dayHeading: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.balance,
    marginBottom: 8,
    paddingLeft: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 4 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: t.calm },
  dot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  rowTitle: { fontSize: 15.5, fontFamily: "Sora_600SemiBold", color: t.anchor, letterSpacing: -0.2 },
  rowSub: { fontSize: 12, color: t.grey, marginTop: 1 },
  rowTime: { fontSize: 12.5, color: t.grey, fontVariant: ["tabular-nums"], flexShrink: 0 },
}));
