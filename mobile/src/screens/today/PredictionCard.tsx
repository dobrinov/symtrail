// PredictionCard — flare-cycle prediction for PFAPA profiles, port of the
// prototype's FlareCycleCard (docs/prototype/screens-home.jsx).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "../../design/Card";
import { Icon } from "../../design/Icon";
import { TOKENS } from "../../design/tokens";
import { CycleStats } from "../../domain/flares";

const DAY_MS = 86400000;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function PredictionCard({
  cycle,
  today = new Date(),
}: {
  cycle: CycleStats;
  today?: Date;
}): React.JSX.Element {
  const maxDay = cycle.max + 5;
  const pct = (n: number) => Math.min(100, (n / maxDay) * 100);
  const todayPct = pct(cycle.sinceLast);
  const wStart = pct(cycle.min);
  const wEnd = pct(cycle.max);
  const toWindow = Math.round((cycle.windowStart.getTime() - today.getTime()) / DAY_MS);
  // copy deliberately avoids a second "flare" mention (header has the one)
  const hint =
    toWindow <= 0
      ? "Inside the expected window now"
      : toWindow <= 7
        ? `Next window likely in about ${toWindow} day${toWindow === 1 ? "" : "s"}`
        : `Next window in roughly ${toWindow} days`;

  return (
    <Card pad={20} style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.headLabel}>Flare cycle</Text>
        <Text style={styles.headAvg}>avg every {cycle.avg} days</Text>
      </View>
      <View style={styles.dayRow}>
        <Text style={styles.dayBig}>Day {cycle.sinceLast}</Text>
        <Text style={styles.daySub}>since last onset · {fmtDate(cycle.last)}</Text>
      </View>
      {/* cycle track */}
      <View style={styles.track}>
        <View
          style={[
            styles.windowBand,
            { left: `${wStart}%` as never, width: `${wEnd - wStart}%` as never },
          ]}
        />
        <View style={[styles.elapsed, { width: `${todayPct}%` as never }]} />
        <View style={[styles.marker, { left: `${todayPct}%` as never }]} />
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>last onset</Text>
        <Text style={[styles.legendText, { color: TOKENS.approach, fontFamily: "Sora_600SemiBold" }]}>
          likely window
        </Text>
      </View>
      <View style={styles.hintBox}>
        <Icon name="sparkle" size={20} color={TOKENS.approach} sw={1.7} />
        <View style={{ flex: 1 }}>
          <Text style={styles.hintTitle}>{hint}</Text>
          <Text style={styles.hintSub}>
            Around {fmtDate(cycle.windowStart)} – {fmtDate(cycle.windowEnd)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headLabel: {
    fontSize: 13,
    fontFamily: "Sora_700Bold",
    color: TOKENS.grey,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headAvg: {
    fontSize: 13,
    color: TOKENS.balance,
    fontFamily: "Sora_600SemiBold",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  dayBig: {
    fontSize: 46,
    fontFamily: "Sora_800ExtraBold",
    color: TOKENS.anchor,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
  daySub: {
    fontSize: 14,
    color: TOKENS.grey,
    marginBottom: 6,
  },
  track: {
    position: "relative",
    height: 14,
    borderRadius: 999,
    backgroundColor: TOKENS.calm,
    marginBottom: 8,
  },
  windowBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: TOKENS.approach + "55",
    borderRadius: 4,
  },
  elapsed: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: TOKENS.yellow,
    borderRadius: 999,
  },
  marker: {
    position: "absolute",
    top: -4,
    marginLeft: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: TOKENS.white,
    borderWidth: 3,
    borderColor: TOKENS.anchor,
    // prototype: 0 1px 4px rgba(12,9,23,0.25)
    shadowColor: TOKENS.anchor,
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  legendText: {
    fontSize: 11.5,
    color: TOKENS.grey,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: TOKENS.calm,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  hintTitle: {
    fontSize: 14.5,
    fontFamily: "Sora_600SemiBold",
    color: TOKENS.anchor,
    letterSpacing: -0.2,
  },
  hintSub: {
    fontSize: 12.5,
    color: TOKENS.grey,
  },
});
