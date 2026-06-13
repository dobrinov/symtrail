// TodayScreen — home screen, port of docs/prototype/screens-home.jsx:
// header w/ profile chip, status card, prediction card (PFAPA), quick-log
// row, recent entries list.
import React from "react";
import { RefreshControlProps, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Repo, Entry, MedicationType, SymptomType } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Avatar } from "../../design/Avatar";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { SeverityChip } from "../../design/SeverityChip";
import { TOKENS } from "../../design/tokens";
import { ageLabel } from "../../domain/age";
import { cycleStats, deriveFlares, Flare } from "../../domain/flares";
import { formatTemp, SEVERITY, SEVERITY_ORDER, SeverityKey, tempToSeverity } from "../../domain/severity";
import { PredictionCard } from "./PredictionCard";

const DAY_MS = 86400000;

function dKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "am" : "pm";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${am}`;
}

function entrySeverity(e: Entry): SeverityKey {
  if (e.entryType === "temp") return tempToSeverity(e.tempC);
  if (e.entryType === "symptom") return (e.severity ?? "mild") as SeverityKey;
  return "none";
}

export function TodayScreen(props: {
  repo: Repo;
  profileId: string;
  onSwitchProfile: () => void;
  onLog: (mode: "choose" | "symptom" | "temp" | "med") => void;
  onOpenEntry: (entryId: string) => void;
  onOpenFlare?: (flare: Flare) => void;
  tempUnit?: "c" | "f";
  refreshControl?: React.ReactElement<RefreshControlProps>;
}): React.JSX.Element {
  const { repo, profileId, tempUnit = "c" } = props;
  const insets = useSafeAreaInsets();
  const today = new Date();

  const data = useQuery(["entries", "profiles", "symptom_types", "medication_types"], () => {
    const profile = repo.getProfile(profileId);
    const entries = profile ? repo.listEntries(profile.id) : [];
    return {
      profile,
      entries,
      symptomTypes: new Map(repo.listSymptomTypes().map((s) => [s.id, s])),
      medTypes: new Map(repo.listMedicationTypes().map((m) => [m.id, m])),
    };
  });
  const { profile, entries, symptomTypes, medTypes } = data;
  if (!profile) return <View style={styles.screen} />;

  const todayKey = dKey(today);
  const todays = entries.filter((e) => dKey(new Date(e.recordedAt)) === todayKey);
  const recent = entries.filter((e) => today.getTime() - new Date(e.recordedAt).getTime() <= 7 * DAY_MS);

  // PFAPA flare prediction + most-recent derived flare (tap target).
  let cycle = null;
  let recentFlare: Flare | null = null;
  if (profile.condition === "PFAPA") {
    const flareEntries = entries.map((e) => ({
      entryType: e.entryType,
      recordedAt: e.recordedAt,
      tempC: e.tempC,
      symptomKeyIsFever: e.symptomTypeId != null && symptomTypes.get(e.symptomTypeId)?.icon === "fever",
    }));
    const flares = deriveFlares(flareEntries);
    cycle = cycleStats(flares, today);
    if (flares.length) {
      recentFlare = [...flares].sort((a, b) => b.onset.getTime() - a.onset.getTime())[0];
    }
  }

  const subtitle = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
      refreshControl={props.refreshControl}
    >
      {/* header */}
      <View style={styles.header}>
        <PressableScale onPress={props.onSwitchProfile} style={styles.profileChip}>
          <Avatar name={profile.name} color={profile.color ?? TOKENS.approach} size={46} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              <Icon name="chevD" size={18} color={TOKENS.grey} sw={2.2} />
            </View>
            <Text style={styles.subtitle}>
              {[subtitle, ageLabel(profile.birthDate, today)].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </PressableScale>
        {profile.condition ? (
          <View style={styles.conditionPill}>
            <Text style={styles.conditionText}>{profile.condition}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <StatusCard todays={todays} entries={entries} symptomTypes={symptomTypes} tempUnit={tempUnit} />

        {cycle ? (
          <PredictionCard
            cycle={cycle}
            today={today}
            onPress={recentFlare && props.onOpenFlare ? () => props.onOpenFlare!(recentFlare!) : undefined}
          />
        ) : null}

        {/* quick log */}
        <View style={styles.quickRow}>
          <QuickLogItem label="Symptom" icon="rash" color={TOKENS.approach} onPress={() => props.onLog("symptom")} />
          <QuickLogItem label="Temperature" icon="fever" color="#F2802E" onPress={() => props.onLog("temp")} />
          <QuickLogItem label="Medication" icon="syrup" color={TOKENS.yellow} onPress={() => props.onLog("med")} />
        </View>

        {/* recent entries */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {recent.length === 0 ? (
          <Card pad={22} style={{ alignItems: "center" }}>
            <Text style={styles.emptyText}>Nothing logged this week.</Text>
            <Text style={styles.emptyHint}>Tap + to add a symptom or medication.</Text>
          </Card>
        ) : (
          <Card pad={14}>
            {recent.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                symptomTypes={symptomTypes}
                medTypes={medTypes}
                tempUnit={tempUnit}
                last={i === recent.length - 1}
                onPress={() => props.onOpenEntry(e.id)}
              />
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

// ── Status card ─────────────────────────────────────────────
function StatusCard({
  todays,
  entries,
  symptomTypes,
  tempUnit,
}: {
  todays: Entry[];
  entries: Entry[];
  symptomTypes: Map<string, SymptomType>;
  tempUnit: "c" | "f";
}): React.JSX.Element {
  let max: SeverityKey = "none";
  for (const e of todays) {
    const s = entrySeverity(e);
    if (SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(max)) max = s;
  }
  const unwell = max !== "none";
  const sev = SEVERITY[max];

  let title = "Feeling well";
  let sub = entries.length
    ? `Last logged ${new Date(entries[0].recordedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
    : "No recent symptoms";
  let glyphIcon = "check";
  let glyphBg = "#E3F0E8";
  let glyphColor = "#1F8A5B";

  if (unwell) {
    title = max === "severe" ? "Very unwell" : max === "mild" ? "Mild symptoms" : "Feeling unwell";
    const names: string[] = [];
    let topSymptomIcon: string | null = null;
    let topIdx = -1;
    let peakTemp: number | null = null;
    for (const e of todays) {
      if (e.entryType === "symptom") {
        const st = e.symptomTypeId ? symptomTypes.get(e.symptomTypeId) : undefined;
        const nm = st?.label ?? "Symptom";
        if (!names.includes(nm)) names.push(nm);
        const idx = SEVERITY_ORDER.indexOf((e.severity ?? "mild") as SeverityKey);
        if (idx > topIdx) {
          topIdx = idx;
          topSymptomIcon = st?.icon ?? "rash";
        }
      }
      if (e.entryType === "temp" && e.tempC != null) {
        peakTemp = peakTemp == null ? e.tempC : Math.max(peakTemp, e.tempC);
      }
    }
    if (peakTemp != null && tempToSeverity(peakTemp) !== "none") {
      names.push(`Fever ${formatTemp(peakTemp, tempUnit)}`);
      if (!topSymptomIcon) topSymptomIcon = "fever";
    }
    const shown = names.slice(0, 2).join(" · ");
    sub = names.length > 2 ? `${shown} +${names.length - 2} more` : shown || "Symptoms logged today";
    glyphIcon = topSymptomIcon ?? "fever";
    glyphBg = sev.color;
    glyphColor = sev.key === "mild" ? sev.dot : sev.text;
  }

  return (
    <Card pad={20} style={{ marginBottom: 16 }}>
      <Text style={styles.statusLabel}>Status</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusGlyph, { backgroundColor: glyphBg }]}>
          <Icon name={glyphIcon} size={26} color={glyphColor} sw={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusSub} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {unwell ? <SeverityChip level={max} /> : null}
      </View>
    </Card>
  );
}

// ── Quick log ───────────────────────────────────────────────
function QuickLogItem({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }}>
      <Card pad={14} style={styles.quickCard}>
        <View style={[styles.quickGlyph, { backgroundColor: color + "22" }]}>
          <Icon name={icon} size={23} color={color === TOKENS.yellow ? "#C7841A" : color} sw={1.9} />
        </View>
        <Text style={styles.quickLabel}>{label}</Text>
      </Card>
    </PressableScale>
  );
}

// ── Entry row ───────────────────────────────────────────────
function EntryRow({
  entry,
  symptomTypes,
  medTypes,
  tempUnit,
  last,
  onPress,
}: {
  entry: Entry;
  symptomTypes: Map<string, SymptomType>;
  medTypes: Map<string, MedicationType>;
  tempUnit: "c" | "f";
  last: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const st = entry.symptomTypeId ? symptomTypes.get(entry.symptomTypeId) : undefined;
  const mt = entry.medicationTypeId ? medTypes.get(entry.medicationTypeId) : undefined;

  let title: string;
  let glyphIcon: string;
  let glyphBg: string;
  let glyphColor: string;
  if (entry.entryType === "temp") {
    const sev = SEVERITY[tempToSeverity(entry.tempC)];
    title = entry.tempC != null ? formatTemp(entry.tempC, tempUnit) : "Temperature";
    glyphIcon = "fever";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.key === "none" ? TOKENS.balance : sev.dot;
  } else if (entry.entryType === "med") {
    const name = mt?.label ?? "Medication";
    title = entry.dose ? `${name} · ${entry.dose}` : name;
    glyphIcon = mt?.form === "tablet" ? "tablet" : mt?.form === "drops" ? "drops" : "syrup";
    glyphBg = (mt?.color ?? TOKENS.balance) + "22";
    glyphColor = mt?.color ?? TOKENS.balance;
  } else if (entry.entryType === "note") {
    title = entry.note ?? "Note";
    glyphIcon = "note";
    glyphBg = TOKENS.calm;
    glyphColor = TOKENS.grey;
  } else {
    const sev = SEVERITY[(entry.severity ?? "mild") as SeverityKey];
    title = st?.label ?? "Symptom";
    glyphIcon = st?.icon ?? "note";
    glyphBg = sev.key === "none" ? sev.color : sev.color + "33";
    glyphColor = sev.dot;
  }

  return (
    <PressableScale onPress={onPress} style={[styles.entryRow, !last && styles.entryRowBorder]}>
      <View style={[styles.entryGlyph, { backgroundColor: glyphBg }]}>
        <Icon name={glyphIcon} size={21} color={glyphColor} sw={1.9} />
      </View>
      <Text style={styles.entryTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.entryTime}>{fmtTime(entry.recordedAt)}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TOKENS.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 22,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: TOKENS.grey,
  },
  conditionPill: {
    backgroundColor: TOKENS.lavender,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  conditionText: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
    color: TOKENS.balance,
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 20,
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  statusGlyph: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusTitle: {
    fontSize: 19,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.3,
  },
  statusSub: {
    fontSize: 13,
    color: TOKENS.grey,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  quickCard: {
    alignItems: "center",
    gap: 8,
  },
  quickGlyph: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 12.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: TOKENS.anchor,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: TOKENS.grey,
  },
  emptyHint: {
    fontSize: 13.5,
    color: TOKENS.approach,
    marginTop: 4,
    fontFamily: "Sora_600SemiBold",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  entryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.calm,
  },
  entryGlyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  entryTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
    letterSpacing: -0.2,
  },
  entryTime: {
    fontSize: 12.5,
    color: TOKENS.grey,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
  },
});
