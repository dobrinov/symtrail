// FlareDetailScreen — a single flare episode: title, summary stats, the
// temperature chart, and a per-day timeline of symptom + med entries.
// Port of docs/prototype/screens-flare.jsx FlareDetail. Days are bucketed in
// UTC (consistent with flares.ts / the calendar) so the title and ranges match
// the UTC-derived flare regardless of device timezone.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Entry, MedicationType, Repo, SymptomType } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { SeverityChip } from "../../design/SeverityChip";
import { themedStyles, useTokens } from "../../design/theme";
import { Flare } from "../../domain/flares";
import { formatTemp, SeverityKey, tempToSeverity } from "../../domain/severity";
import { catLabel, fmtClock, Strings, useT } from "../../i18n";
import { en } from "../../i18n/en";
import { ChartPoint, TempChart } from "./TempChart";

const DAY_MS = 86400000;

// Temp readings whose recordedAt falls within the flare's UTC day range
// [onset 00:00, end 23:59:59.999], sorted ascending by time.
export function flareChartSeries(entries: Entry[], flare: Flare): ChartPoint[] {
  const startMs = Date.UTC(flare.onset.getUTCFullYear(), flare.onset.getUTCMonth(), flare.onset.getUTCDate());
  const endMs =
    Date.UTC(flare.end.getUTCFullYear(), flare.end.getUTCMonth(), flare.end.getUTCDate()) + DAY_MS - 1;
  return entries
    .filter((e) => e.entryType === "temp" && e.tempC != null)
    .map((e) => ({ t: new Date(e.recordedAt).getTime(), temp: e.tempC as number }))
    .filter((p) => p.t >= startMs && p.t <= endMs)
    .sort((a, b) => a.t - b.t);
}

// "Flare · 11–13 May" (same UTC month) or "Flare · 28 Feb – 2 Mar" (cross
// month). Matches the prototype's flareTitle (app.jsx), but reads UTC date
// parts so it lines up with the UTC-bucketed flare dates.
export function flareTitle(flare: Flare, s: Strings = en): string {
  const mo = monthShortUtc(flare.onset, s);
  const me = monthShortUtc(flare.end, s);
  const od = flare.onset.getUTCDate();
  const ed = flare.end.getUTCDate();
  return mo === me ? `${s.flareWord} · ${od}–${ed} ${mo}` : `${s.flareWord} · ${od} ${mo} – ${ed} ${me}`;
}

function monthShortUtc(d: Date, s: Strings): string {
  return d.toLocaleDateString(s.locale, { month: "short", timeZone: "UTC" });
}

// All entries within the flare's UTC day range, sorted oldest-first.
function entriesInFlare(entries: Entry[], flare: Flare): Entry[] {
  const startMs = Date.UTC(flare.onset.getUTCFullYear(), flare.onset.getUTCMonth(), flare.onset.getUTCDate());
  const endMs =
    Date.UTC(flare.end.getUTCFullYear(), flare.end.getUTCMonth(), flare.end.getUTCDate()) + DAY_MS - 1;
  return entries
    .filter((e) => {
      const t = new Date(e.recordedAt).getTime();
      return t >= startMs && t <= endMs;
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

function dayKeyUtc(iso: string): string {
  return iso.slice(0, 10);
}

function dayHeading(iso: string, s: Strings): string {
  return new Date(iso).toLocaleDateString(s.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function FlareDetailScreen(props: {
  repo: Repo;
  profileId: string;
  flare: Flare;
  tempUnit?: "c" | "f";
}): React.JSX.Element {
  const styles = useStyles();
  const s = useT();
  const { repo, profileId, flare, tempUnit = "c" } = props;

  const data = useQuery(["entries", "symptom_types", "medication_types"], () => ({
    entries: repo.listEntries(profileId),
    symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
    medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
  }));
  const { entries, symptomTypes, medTypes } = data;

  const inFlare = entriesInFlare(entries, flare);
  const series = flareChartSeries(entries, flare);
  const medCount = inFlare.filter((e) => e.entryType === "med").length;
  const symptomCount = inFlare.filter((e) => e.entryType === "symptom").length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* summary stats */}
      <Card pad={18} style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Stat value={`${flare.lengthDays}`} label={flare.lengthDays === 1 ? s.statDay : s.statDays} />
          <Divider />
          <Stat value={formatTemp(flare.peak, tempUnit)} label={s.statPeak} />
          <Divider />
          <Stat value={`${medCount}`} label={medCount === 1 ? s.statMed : s.statMeds} />
          <Divider />
          <Stat value={`${symptomCount}`} label={s.statSymptoms} />
        </View>
      </Card>

      {/* temperature chart */}
      <Card pad={16} style={styles.chartCard}>
        <Text style={styles.sectionLabel}>{s.temperatureTitle}</Text>
        <TempChart series={series} unit={tempUnit} />
      </Card>

      {/* per-day timeline */}
      <Text style={styles.timelineHeader}>{s.timeline}</Text>
      <Card pad={14}>
        {inFlare.length === 0 ? (
          <Text style={styles.emptyText}>{s.noEntriesFlare}</Text>
        ) : (
          inFlare.map((e, i) => {
            const newDay = i === 0 || dayKeyUtc(e.recordedAt) !== dayKeyUtc(inFlare[i - 1].recordedAt);
            return (
              <React.Fragment key={e.id}>
                {newDay ? <Text style={styles.dayHeading}>{dayHeading(e.recordedAt, s)}</Text> : null}
                <TimelineRow
                  entry={e}
                  symptomTypes={symptomTypes}
                  medTypes={medTypes}
                  tempUnit={tempUnit}
                  last={i === inFlare.length - 1}
                />
              </React.Fragment>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider(): React.JSX.Element {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

function TimelineRow({
  entry,
  symptomTypes,
  medTypes,
  tempUnit,
  last,
}: {
  entry: Entry;
  symptomTypes: Map<string, SymptomType>;
  medTypes: Map<string, MedicationType>;
  tempUnit: "c" | "f";
  last: boolean;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const st = entry.symptomTypeId ? symptomTypes.get(entry.symptomTypeId) : undefined;
  const mt = entry.medicationTypeId ? medTypes.get(entry.medicationTypeId) : undefined;

  let title: string;
  let glyphIcon: string;
  let glyphBg: string;
  let glyphColor: string;
  let chip: SeverityKey | null = null;
  if (entry.entryType === "temp") {
    const sev = tempToSeverity(entry.tempC);
    title = entry.tempC != null ? formatTemp(entry.tempC, tempUnit) : s.temperatureFallback;
    glyphIcon = "fever";
    glyphBg = "#F2802E22";
    glyphColor = "#F2802E";
    chip = sev !== "none" ? sev : null;
  } else if (entry.entryType === "med") {
    const name = mt ? catLabel(mt.label, s) : s.medicationFallback;
    title = entry.dose ? `${name} · ${entry.dose}` : name;
    glyphIcon = mt?.form === "tablet" ? "tablet" : mt?.form === "drops" ? "drops" : "syrup";
    glyphBg = (mt?.color ?? t.balance) + "22";
    glyphColor = mt?.color ?? t.balance;
  } else if (entry.entryType === "note") {
    title = entry.note ?? s.noteFallback;
    glyphIcon = "note";
    glyphBg = t.calm;
    glyphColor = t.grey;
  } else {
    title = st ? catLabel(st.label, s) : s.symptomFallback;
    glyphIcon = st?.icon ?? "note";
    glyphBg = t.calm;
    glyphColor = t.balance;
    chip = (entry.severity ?? "mild") as SeverityKey;
  }

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.glyph, { backgroundColor: glyphBg }]}>
        <Icon name={glyphIcon} size={20} color={glyphColor} sw={1.9} />
      </View>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {title}
      </Text>
      {chip ? <SeverityChip level={chip} small /> : null}
      <Text style={styles.rowTime}>{fmtClock(entry.recordedAt, s)}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  content: { paddingBottom: 24 },
  statsCard: { marginBottom: 14 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stat: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 20,
    fontFamily: "Sora_800ExtraBold",
    color: t.anchor,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: t.grey,
    fontFamily: "Sora_600SemiBold",
    marginTop: 4,
  },
  divider: { width: 1, height: 34, backgroundColor: t.calm },
  chartCard: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timelineHeader: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, color: t.grey, paddingVertical: 8, paddingHorizontal: 4 },
  dayHeading: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
    color: t.approach,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: t.calm },
  glyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    fontFamily: "Sora_600SemiBold",
    color: t.anchor,
    letterSpacing: -0.2,
  },
  rowTime: {
    fontSize: 12.5,
    color: t.grey,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
}));
