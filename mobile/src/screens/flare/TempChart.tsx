// TempChart — a self-contained react-native-svg line chart for a flare's
// temperature readings. Port of docs/prototype/screens-flare.jsx TempChart,
// adapted to RN SVG with severity-tinted horizontal bands. No chart library.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { TOKENS } from "../../design/tokens";
import { SEVERITY } from "../../domain/severity";
import { cToF } from "../../domain/severity";
import { ChartPoint } from "./FlareDetailScreen";

const W = 320;
const H = 160;
const PAD_L = 34;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 24;

// °C severity band edges → SEVERITY colours (mild ≥37, moderate ≥38, high ≥39,
// severe ≥40, matching tempToSeverity). Drawn as faint tinted strips.
const BANDS: { from: number; to: number; color: string }[] = [
  { from: 37, to: 38, color: SEVERITY.mild.dot },
  { from: 38, to: 39, color: SEVERITY.moderate.color },
  { from: 39, to: 40, color: SEVERITY.high.color },
  { from: 40, to: 42, color: SEVERITY.severe.color },
];

function display(c: number, unit: "c" | "f"): number {
  return unit === "f" ? cToF(c) : c;
}

export function TempChart({
  series,
  unit,
}: {
  series: ChartPoint[];
  unit: "c" | "f";
}): React.JSX.Element {
  // A single point can't convey a trend (matches the prototype's chart guard).
  if (series.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {series.length === 0 ? "No temperature readings" : "Not enough readings to chart"}
        </Text>
      </View>
    );
  }

  // Y range: fixed 36–42 °C window, expanded if a reading falls outside.
  const temps = series.map((p) => p.temp);
  const lo = Math.min(36, Math.floor(Math.min(...temps)));
  const hi = Math.max(42, Math.ceil(Math.max(...temps)));
  const gridC = [];
  for (let g = lo; g <= hi; g++) gridC.push(g);

  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const span = Math.max(1, t1 - t0);

  const x = (t: number) => PAD_L + ((t - t0) / span) * (W - PAD_L - PAD_R);
  const y = (c: number) => PAD_T + (1 - (c - lo) / (hi - lo)) * (H - PAD_T - PAD_B);

  const pts = series.map((p) => [x(p.t), y(p.temp)] as const);
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="xMidYMid meet">
      {/* severity bands */}
      {BANDS.map((b) => {
        const top = y(Math.min(hi, b.to));
        const bottom = y(Math.max(lo, b.from));
        if (bottom <= top) return null;
        return (
          <Line
            key={b.from}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={(top + bottom) / 2}
            y2={(top + bottom) / 2}
            stroke={b.color}
            strokeWidth={bottom - top}
            strokeOpacity={0.1}
          />
        );
      })}
      {/* grid lines + axis labels */}
      {gridC.map((g) => (
        <React.Fragment key={g}>
          <Line x1={PAD_L} y1={y(g)} x2={W - PAD_R} y2={y(g)} stroke={TOKENS.calm} strokeWidth={1} />
          <SvgText
            x={PAD_L - 7}
            y={y(g) + 3.5}
            textAnchor="end"
            fontSize={9}
            fill={TOKENS.grey}
            fontWeight="600"
          >
            {`${Math.round(display(g, unit))}°`}
          </SvgText>
        </React.Fragment>
      ))}
      {/* fever threshold (38 °C) */}
      <Line
        x1={PAD_L}
        y1={y(38)}
        x2={W - PAD_R}
        y2={y(38)}
        stroke={TOKENS.approach}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {/* temperature line */}
      <Path d={line} fill="none" stroke="#F2802E" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {/* reading dots */}
      {pts.map((p, i) => (
        <Circle key={i} cx={p[0]} cy={p[1]} r={3} fill={TOKENS.white} stroke="#F2802E" strokeWidth={2} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: TOKENS.grey,
    fontFamily: "Sora_600SemiBold",
  },
});
