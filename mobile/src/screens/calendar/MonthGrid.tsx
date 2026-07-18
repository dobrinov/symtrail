// MonthGrid — a 7-column month grid, each day tinted by its max severity
// (the heat-map). Week starts Monday (matches the en-GB locale used app-wide).
// Pure presentation: it derives each cell's severity from the entries prop.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry } from "../../db/repo";
import { PressableScale } from "../../design/PressableScale";
import { themedStyles, useTokens } from "../../design/theme";
import { daySeverity, SEVERITY, SeverityKey } from "../../domain/severity";
import { useT, weekdayShortNames } from "../../i18n";

// Zero-padded "YYYY-MM-DD" without timezone conversion — must match the UTC
// date prefix daySeverity compares against (see domain/severity).
function dayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Monday-based offset (0=Mon … 6=Sun) for the 1st of the month.
function leadingBlanks(year: number, month: number): number {
  const jsDow = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Sun … 6=Sat
  return (jsDow + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function MonthGrid(props: {
  year: number;
  month: number;
  entries: Entry[];
  selectedDay: string | null;
  onSelectDay: (dayIso: string) => void;
  windowDays?: Set<string>;
  todayIso: string;
}): React.JSX.Element {
  const styles = useStyles();
  const t = useTokens();
  const s = useT();
  const { year, month, entries, selectedDay, onSelectDay, windowDays, todayIso } = props;
  const blanks = leadingBlanks(year, month);
  const total = daysInMonth(year, month);

  // Days with a med/note entry. Those don't tint the heat-map (daySeverity
  // ignores them), so they get a dot marker — shown on tinted days too, so a
  // dose logged during a symptomatic day stays visible.
  const medDays = new Set(
    entries.filter((e) => e.entryType === "med" || e.entryType === "note").map((e) => e.recordedAt.slice(0, 10)),
  );

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < blanks; i++) {
    cells.push(<View key={`b${i}`} style={styles.cell} />);
  }
  for (let day = 1; day <= total; day++) {
    const key = dayKey(year, month, day);
    const sev: SeverityKey = daySeverity(entries, key);
    const tint = sev === "none" ? t.calm : SEVERITY[sev].color;
    // "none" sits on a themed tint (anchor adapts); "mild" sits on the fixed
    // pale-yellow severity colour, which needs dark ink in both themes.
    const labelColor = sev === "none" ? t.anchor : sev === "mild" ? t.onYellow : SEVERITY[sev].text;
    const isToday = key === todayIso;
    const isSelected = key === selectedDay;
    const dotted = windowDays?.has(key);
    const hasLog = medDays.has(key);

    cells.push(
      <View key={key} style={styles.cell}>
        <PressableScale onPress={() => onSelectDay(key)} style={styles.cellInner}>
          <View
            style={[
              styles.day,
              { backgroundColor: tint },
              isToday && styles.dayToday,
              isSelected && styles.daySelected,
            ]}
          >
            <Text style={[styles.dayNum, { color: labelColor }]}>{day}</Text>
            {dotted || hasLog ? (
              <View style={styles.dotRow}>
                {dotted ? <View style={styles.windowDot} /> : null}
                {hasLog ? (
                  // Same ink as the day number so it contrasts with any tint.
                  <View style={[styles.logDot, { backgroundColor: labelColor }]} testID={`log-dot-${key}`} />
                ) : null}
              </View>
            ) : null}
          </View>
        </PressableScale>
      </View>,
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.weekRow}>
        {weekdayShortNames(s).map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>{cells}</View>
    </View>
  );
}

const useStyles = themedStyles((t) => StyleSheet.create({
  wrap: { marginBottom: 18 },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11.5,
    fontFamily: "Sora_600SemiBold",
    color: t.grey,
    letterSpacing: 0.2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cellInner: { flex: 1 },
  day: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    // Border is always reserved (transparent by default) so today/selected
    // highlighting only recolours it — no layout shift of the number/dots.
    borderWidth: 2,
    borderColor: "transparent",
  },
  dayToday: {
    borderColor: t.anchor,
  },
  daySelected: {
    borderColor: t.approach,
  },
  dayNum: {
    fontSize: 14,
    fontFamily: "Sora_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  dotRow: {
    position: "absolute",
    bottom: 5,
    flexDirection: "row",
    gap: 3,
  },
  windowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.approach,
  },
  logDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
}));
