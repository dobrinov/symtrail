// Icon — line-icon set ported from docs/prototype/icons.jsx.
// All glyphs share a 24×24 viewBox, round caps/joins.
import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { TOKENS } from "./tokens";

type StrokeProps = {
  fill: "none";
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
};
type FillProps = { fill: string; stroke: "none" };
type Ctx = { p: StrokeProps; pf: FillProps; color: string; sw: number };

const GLYPHS: Record<string, (c: Ctx) => React.JSX.Element> = {
  // ── symptoms ──
  fever: ({ p, pf, color }) => (
    <G {...p}>
      <Path d="M10 4.5a2 2 0 0 1 4 0v8.3a4.5 4.5 0 1 1-4 0z" />
      <Path d="M12 9v5.5" stroke={color} />
      <Circle cx="12" cy="17" r="1.6" {...pf} />
    </G>
  ),
  throat: ({ p }) => (
    <G {...p}>
      <Path d="M12 3v4" />
      <Path d="M8.5 7.5c0 2 1 3 1 5s-2 2.5-2 4.5a4.5 4.5 0 0 0 9 0c0-2-2-2.5-2-4.5s1-3 1-5" />
      <Path d="M9 8.5h6" />
    </G>
  ),
  ulcers: ({ p, pf }) => (
    <G {...p}>
      <Path d="M4 9c3-2.5 13-2.5 16 0-1.5 4-5 6-8 6S5.5 13 4 9z" />
      <Circle cx="10" cy="11" r="1.4" {...pf} />
      <Circle cx="15" cy="10.5" r="1.1" {...pf} />
    </G>
  ),
  glands: ({ p }) => (
    <G {...p}>
      <Circle cx="9" cy="10" r="3" />
      <Circle cx="15.5" cy="13" r="2.2" />
      <Path d="M9 13v4M15.5 15.2V18" />
    </G>
  ),
  legpain: ({ p, color }) => (
    <G {...p}>
      <Path d="M10 3l1 7-2 5 3 4" />
      <Path d="M14 4l-1 6 3 4-1 5" />
      <Path d="M17 9.5l3 1.5M17.5 12l3 .5" stroke={color} />
    </G>
  ),
  tummy: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M8.5 11c1.2 1.4 2.2 1.4 3.5 0s2.3-1.4 3.5 0" />
      <Path d="M9 15c1 1 2 1 3 0s2-1 3 0" />
    </G>
  ),
  headache: ({ p }) => (
    <G {...p}>
      <Path d="M12 5a6 6 0 0 0-6 6v3.5h12V11a6 6 0 0 0-6-6z" />
      <Path d="M3 8.5l2 1M21 8.5l-2 1M12 2.5V4.5" />
      <Path d="M9 18h6" />
    </G>
  ),
  nosebleed: ({ p, pf }) => (
    <G {...p}>
      <Path d="M12 4c1.5 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2.5-5 4-8z" />
      <Circle cx="12" cy="19.5" r="1.3" {...pf} />
    </G>
  ),
  cough: ({ p }) => (
    <G {...p}>
      <Path d="M14 6.5A5 5 0 1 0 14 17" />
      <Path d="M18 7.5l2-1M18.5 12h2.5M18 16.5l2 1" />
    </G>
  ),
  runnynose: ({ p, pf }) => (
    <G {...p}>
      <Path d="M9 4v9a3 3 0 0 0 3 3h1" />
      <Path d="M9 9h2" />
      <Circle cx="12.5" cy="19.5" r="1.3" {...pf} />
    </G>
  ),
  earpain: ({ p }) => (
    <G {...p}>
      <Path d="M7.5 10a4.5 4.5 0 1 1 9 0c0 2.5-2.5 3-2.5 5.5a2.5 2.5 0 0 1-5 0" />
      <Path d="M10.5 10a1.5 1.5 0 0 1 3 0" />
    </G>
  ),
  rash: ({ p, pf }) => (
    <G {...p}>
      <Circle cx="8" cy="8" r="1.3" {...pf} />
      <Circle cx="13" cy="7" r="1.1" {...pf} />
      <Circle cx="16" cy="11" r="1.3" {...pf} />
      <Circle cx="9" cy="13" r="1.1" {...pf} />
      <Circle cx="13.5" cy="14.5" r="1.4" {...pf} />
      <Circle cx="7" cy="17" r="1.1" {...pf} />
      <Circle cx="16" cy="16.5" r="1.1" {...pf} />
    </G>
  ),
  vomiting: ({ p, color, sw }) => (
    <G {...p}>
      <Circle cx="12" cy="9" r="5.5" />
      <Path d="M10 8.5h.01M14 8.5h.01" stroke={color} strokeWidth={sw + 0.4} />
      <Path d="M9.5 12c1.5 1 3.5 1 5 0" />
      <Path d="M12 14.5v5M9.5 17l2.5 2.5L14.5 17" />
    </G>
  ),
  diarrhea: ({ p }) => (
    <G {...p}>
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M9 14v3M12 14.5v4M15 14v3" />
    </G>
  ),
  fatigue: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M8.5 10.5h1M14.5 10.5h1" />
      <Path d="M9 15.5c1.5-1 4.5-1 6 0" />
    </G>
  ),
  chills: ({ p }) => (
    <G {...p}>
      <Path d="M12 3v18M5 7.5l14 9M19 7.5l-14 9" />
      <Path d="M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2" />
    </G>
  ),
  appetite: ({ p }) => (
    <G {...p}>
      <Path d="M7 3v7M5 3v4M9 3v4" />
      <Path d="M7 10v11" />
      <Path d="M16 3c-2 1-2 5-2 7h4c0-2 0-6-2-7z" />
      <Path d="M16 10v11" />
    </G>
  ),
  stuffynose: ({ p }) => (
    <G {...p}>
      <Path d="M12 4c1.5 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2.5-5 4-8z" />
      <Path d="M9.5 13.5l5 5M14.5 13.5l-5 5" />
    </G>
  ),
  nausea: ({ p, color, sw }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M9 9.5h.5M14.5 9.5h.5" stroke={color} strokeWidth={sw + 0.5} />
      <Path d="M8.5 16c1.2-1.4 2.2-1.4 3.5 0s2.3 1.4 3.5 0" />
    </G>
  ),
  constipation: ({ p, sw }) => (
    <G {...p}>
      <Path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <Path d="M8.5 14.5h7" strokeWidth={sw + 0.6} />
    </G>
  ),
  cramps: ({ p, color }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7l-2.5 5h3L10 17" stroke={color} />
    </G>
  ),
  bloating: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="13" r="6.5" />
      <Path d="M12 3v2.5M5.5 7l1.5 1.5M18.5 7L17 8.5" />
    </G>
  ),
  chestpain: ({ p, color }) => (
    <G {...p}>
      <Path d="M12 20s-7-4.5-7-9.5a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 1.2-.4 2.3-1 3.3" />
      <Path d="M14 12l-2.5 3.5h3L12 19" stroke={color} />
    </G>
  ),
  palpitations: ({ p, sw }) => (
    <G {...p}>
      <Path d="M12 20s-7-4.5-7-9.5a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 5-7 9.5-7 9.5z" />
      <Path d="M6 11h3l1.5-3 2 5 1.5-2H18" stroke="#fff" strokeWidth={sw - 0.2} />
    </G>
  ),
  dizziness: ({ p }) => (
    <G {...p}>
      <Path d="M12 12c0-1.4 1.1-2.5 2.5-2.5S17 10.6 17 12s-1.6 3-3.5 3-4-1.6-4-4 2-4.5 4.5-4.5S19 9 19 12" />
      <Path d="M5 6.5h.01M5.5 10h.01M5 13.5h.01" />
    </G>
  ),
  jointpain: ({ p, color }) => (
    <G {...p}>
      <Path d="M5 5l4 4" />
      <Circle cx="12" cy="12" r="2.6" />
      <Path d="M15 15l4 4" />
      <Path d="M4 12h-1.5M12 4V2.5M20 12h1.5" stroke={color} />
    </G>
  ),
  hotflashes: ({ p }) => (
    <G {...p}>
      <Path d="M8 4c1.2 1.2 1.2 2.4 0 3.6s-1.2 2.4 0 3.6M12 3.5c1.2 1.2 1.2 2.4 0 3.6s-1.2 2.4 0 3.6M16 4c1.2 1.2 1.2 2.4 0 3.6s-1.2 2.4 0 3.6" />
      <Path d="M6 15.5h12M7.5 19h9" />
    </G>
  ),
  sleepiness: ({ p, color, sw }) => (
    <G {...p}>
      <Path d="M18 13.5A6.5 6.5 0 1 1 10.5 6a5 5 0 0 0 7.5 7.5z" />
      <Path d="M14 4h3l-3 3h3" stroke={color} strokeWidth={sw - 0.2} />
    </G>
  ),
  // ── meds / forms ──
  tablet: ({ p }) => (
    <G {...p}>
      <Rect x="3.5" y="8.5" width="17" height="7" rx="3.5" />
      <Path d="M12 9v6" />
    </G>
  ),
  syrup: ({ p }) => (
    <G {...p}>
      <Path d="M9 3h6M10 3v2.5c0 .8-2 2-2 4.5v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7c0-2.5-2-3.7-2-4.5V3" />
      <Path d="M8 13h8" />
    </G>
  ),
  drops: ({ p }) => (
    <G {...p}>
      <Path d="M12 3c2 3.5 4.5 6 4.5 9a4.5 4.5 0 0 1-9 0c0-3 2.5-5.5 4.5-9z" />
    </G>
  ),
  // ── nav / ui ──
  today: ({ p }) => (
    <G {...p}>
      <Path d="M3.5 11.5L12 4l8.5 7.5" />
      <Path d="M5.5 10v9h13v-9" />
      <Path d="M10 19v-5h4v5" />
    </G>
  ),
  calendar: ({ p }) => (
    <G {...p}>
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <Path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </G>
  ),
  pillTab: ({ p }) => (
    <G {...p}>
      <Rect x="3" y="9" width="13" height="6" rx="3" transform="rotate(-40 9.5 12)" />
      <Path d="M9 7l4.5 5.2" />
    </G>
  ),
  profile: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="8.5" r="3.5" />
      <Path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </G>
  ),
  plus: ({ p, sw }) => (
    <G {...p}>
      <Path d="M12 5v14M5 12h14" strokeWidth={sw + 0.4} />
    </G>
  ),
  close: ({ p }) => (
    <G {...p}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </G>
  ),
  chevR: ({ p }) => (
    <G {...p}>
      <Path d="M9 5l7 7-7 7" />
    </G>
  ),
  chevL: ({ p }) => (
    <G {...p}>
      <Path d="M15 5l-7 7 7 7" />
    </G>
  ),
  chevD: ({ p }) => (
    <G {...p}>
      <Path d="M5 9l7 7 7-7" />
    </G>
  ),
  check: ({ p }) => (
    <G {...p}>
      <Path d="M4.5 12.5l5 5 10-11" />
    </G>
  ),
  clock: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7v5l3.5 2" />
    </G>
  ),
  edit: ({ p }) => (
    <G {...p}>
      <Path d="M4 20h4l10-10-4-4L4 16z" />
      <Path d="M13.5 6.5l4 4" />
    </G>
  ),
  share: ({ p }) => (
    <G {...p}>
      <Path d="M12 15V4M8 7.5L12 3.5l4 4" />
      <Path d="M6 12v6.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V12" />
    </G>
  ),
  bell: ({ p }) => (
    <G {...p}>
      <Path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 5 2 6 2 6H4.5s2-1 2-6z" />
      <Path d="M10 19a2 2 0 0 0 4 0" />
    </G>
  ),
  trend: ({ p }) => (
    <G {...p}>
      <Path d="M3.5 16.5l5-5 3.5 3.5 8-8.5" />
      <Path d="M15 6.5h5.5V12" />
    </G>
  ),
  note: ({ p }) => (
    <G {...p}>
      <Path d="M6 3.5h8l4 4v13H6z" />
      <Path d="M14 3.5v4h4M9 12h6M9 15.5h6" />
    </G>
  ),
  sparkle: ({ p }) => (
    <G {...p}>
      <Path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
    </G>
  ),
  dots: ({ pf }) => (
    <G {...pf}>
      <Circle cx="5" cy="12" r="1.8" />
      <Circle cx="12" cy="12" r="1.8" />
      <Circle cx="19" cy="12" r="1.8" />
    </G>
  ),
  settings: ({ p }) => (
    <G {...p}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2 2M7.3 16.7l-2 2M18.7 18.7l-2-2M7.3 7.3l-2-2" />
    </G>
  ),
  trash: ({ p }) => (
    <G {...p}>
      <Path d="M4 6.5h16M9 6.5V4.5h6v2M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13" />
      <Path d="M10 10.5v7M14 10.5v7" />
    </G>
  ),
  search: ({ p }) => (
    <G {...p}>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="M15.5 15.5L21 21" />
    </G>
  ),
  mail: ({ p }) => (
    <G {...p}>
      <Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <Path d="M4.5 7l7.5 5.5L19.5 7" />
    </G>
  ),
  lock: ({ p, pf }) => (
    <G {...p}>
      <Rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <Circle cx="12" cy="15" r="1.4" {...pf} />
    </G>
  ),
  eye: ({ p }) => (
    <G {...p}>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Circle cx="12" cy="12" r="3" />
    </G>
  ),
  eyeoff: ({ p }) => (
    <G {...p}>
      <Path d="M4 4l16 16" />
      <Path d="M9.5 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6 7.2A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.3-.6" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </G>
  ),
  apple: ({ pf }) => (
    <G {...pf}>
      <Path d="M16.3 12.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.5 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.4-2a8.6 8.6 0 0 0 1.1-2.2c-.1 0-2.1-.8-2.1-3.2z" />
      <Path d="M14.4 6.7c.5-.7.9-1.6.8-2.6-.8 0-1.8.6-2.4 1.3-.5.6-1 1.5-.8 2.5.9.05 1.8-.5 2.4-1.2z" />
    </G>
  ),
  faceid: ({ p }) => (
    <G {...p}>
      <Path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2" />
      <Path d="M9 9.5v1.5M15 9.5v1.5M12 9.5v3l-1 1" />
      <Path d="M9.5 15c1.5 1.2 3.5 1.2 5 0" />
    </G>
  ),
};

export function Icon({
  name,
  size = 24,
  color = TOKENS.anchor,
  sw = 1.8,
}: {
  name: string;
  size?: number;
  color?: string;
  sw?: number;
}): React.JSX.Element | null {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  const p: StrokeProps = {
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const pf: FillProps = { fill: color, stroke: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {glyph({ p, pf, color, sw })}
    </Svg>
  );
}
