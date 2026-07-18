// TodayScreen — home screen, port of docs/prototype/screens-home.jsx:
// header w/ profile chip, status card, prediction card (PFAPA), today's
// entries + "view all" into the history list. Logging happens via the tab
// bar's "+" button.
import React from "react";
import { RefreshControlProps, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Repo, Entry, SymptomType } from "../../db/repo";
import { useQuery } from "../../db/useQuery";
import { Avatar } from "../../design/Avatar";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { PressableScale } from "../../design/PressableScale";
import { SeverityChip } from "../../design/SeverityChip";
import { themedStyles, useTokens } from "../../design/theme";
import { cycleStats, deriveFlares, Flare } from "../../domain/flares";
import { formatTemp, SEVERITY, SEVERITY_ORDER, SeverityKey, tempToSeverity } from "../../domain/severity";
import { ageLabelI18n, catLabel, fmt, Strings, useT } from "../../i18n";
import { EntryRow } from "../log/EntryRow";
import { PredictionCard } from "./PredictionCard";

// Day bucketing is UTC across the app (flares, calendar, meds, DayDetail all
// key on the UTC date prefix of the ISO string), so "today" matches them.

function entrySeverity(e: Entry): SeverityKey {
  if (e.entryType === "temp") return tempToSeverity(e.tempC);
  if (e.entryType === "symptom") return (e.severity ?? "mild") as SeverityKey;
  return "none";
}

export function TodayScreen(props: {
  repo: Repo;
  profileId: string;
  onSwitchProfile: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenFlare?: (flare: Flare) => void;
  onViewAll?: () => void;
  tempUnit?: "c" | "f";
  refreshControl?: React.ReactElement<RefreshControlProps>;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const { repo, profileId, tempUnit = "c" } = props;
  const insets = useSafeAreaInsets();
  const today = new Date();

  const data = useQuery(["entries", "profiles", "symptom_types", "medication_types", "sync_meta"], () => {
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

  const todayKey = new Date().toISOString().slice(0, 10);
  const todays = entries.filter((e) => e.recordedAt.slice(0, 10) === todayKey);

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

  const subtitle = today.toLocaleDateString(s.locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
      refreshControl={props.refreshControl}
    >
      {/* header */}
      <View style={styles.header}>
        <PressableScale onPress={props.onSwitchProfile} style={styles.profileChip}>
          <Avatar name={profile.name} color={profile.color ?? t.approach} size={46} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
              <Icon name="chevD" size={18} color={t.grey} sw={2.2} />
            </View>
            <Text style={styles.subtitle}>
              {[subtitle, ageLabelI18n(profile.birthDate, s, today)].filter(Boolean).join(" · ")}
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

        {/* today's entries */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{s.recent}</Text>
          {props.onViewAll ? (
            <PressableScale onPress={props.onViewAll} style={styles.viewAll} testID="view-all">
              <Text style={styles.viewAllText}>{s.viewAll}</Text>
              <Icon name="chevR" size={15} color={t.balance} sw={2.2} />
            </PressableScale>
          ) : null}
        </View>
        {todays.length === 0 ? (
          <Card pad={22} style={{ alignItems: "center" }}>
            <Text style={styles.emptyText}>{s.nothingLoggedToday}</Text>
            <Text style={styles.emptyHint}>{s.tapPlusHint}</Text>
          </Card>
        ) : (
          <Card pad={14}>
            {todays.map((e, i) => (
              <EntryRow
                key={e.id}
                entry={e}
                symptomTypes={symptomTypes}
                medTypes={medTypes}
                tempUnit={tempUnit}
                last={i === todays.length - 1}
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
  const styles = useStyles();
  const strings = useT();
  let max: SeverityKey = "none";
  for (const e of todays) {
    const s = entrySeverity(e);
    if (SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(max)) max = s;
  }
  const unwell = max !== "none";
  const sev = SEVERITY[max];

  let title = strings.feelingWell;
  let sub = entries.length
    ? fmt(strings.lastLogged, {
        date: new Date(entries[0].recordedAt).toLocaleDateString(strings.locale, { day: "numeric", month: "short" }),
      })
    : strings.noRecentSymptoms;
  let glyphIcon = "check";
  let glyphBg = "#E3F0E8";
  let glyphColor = "#1F8A5B";

  if (unwell) {
    title = max === "severe" ? strings.veryUnwell : max === "mild" ? strings.mildSymptoms : strings.feelingUnwell;
    const names: string[] = [];
    let topSymptomIcon: string | null = null;
    let topIdx = -1;
    let peakTemp: number | null = null;
    for (const e of todays) {
      if (e.entryType === "symptom") {
        const st = e.symptomTypeId ? symptomTypes.get(e.symptomTypeId) : undefined;
        const nm = st ? catLabel(st.label, strings) : strings.symptomFallback;
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
      names.push(fmt(strings.feverShort, { temp: formatTemp(peakTemp, tempUnit) }));
      if (!topSymptomIcon) topSymptomIcon = "fever";
    }
    const shown = names.slice(0, 2).join(" · ");
    sub = names.length > 2
      ? `${shown} ${fmt(strings.nMore, { n: names.length - 2 })}`
      : shown || strings.symptomsLoggedToday;
    glyphIcon = topSymptomIcon ?? "fever";
    glyphBg = sev.color;
    glyphColor = sev.key === "mild" ? sev.dot : sev.text;
  }

  return (
    <Card pad={20} style={{ marginBottom: 16 }}>
      <Text style={styles.statusLabel}>{strings.statusLabel}</Text>
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

const useStyles = themedStyles((t) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.canvas,
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
    color: t.anchor,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: t.grey,
  },
  conditionPill: {
    backgroundColor: t.lavender,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  conditionText: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
    color: t.balance,
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 20,
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: t.grey,
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
    color: t.anchor,
    letterSpacing: -0.3,
  },
  statusSub: {
    fontSize: 13,
    color: t.grey,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Sora_700Bold",
    color: t.anchor,
    letterSpacing: -0.2,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  viewAllText: {
    fontSize: 13.5,
    fontFamily: "Sora_700Bold",
    color: t.balance,
  },
  emptyText: {
    fontSize: 15,
    color: t.grey,
  },
  emptyHint: {
    fontSize: 13.5,
    color: t.approach,
    marginTop: 4,
    fontFamily: "Sora_600SemiBold",
  },
}));
