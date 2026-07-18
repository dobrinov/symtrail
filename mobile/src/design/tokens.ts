export interface Tokens {
  anchor: string; // primary text (inverts to near-white in dark)
  yellow: string;
  white: string; // card/surface colour (inverts to dark surface)
  canvas: string; // screen background
  calm: string; // subtle fill
  lavender: string; // hairline borders
  approach: string; // accent
  balance: string; // secondary text
  depth: string;
  grey: string; // muted text
  onAccent: string; // text/icons on saturated accent backgrounds — white in both themes
  onYellow: string; // text/icons on the brand yellow — dark ink in both themes
}

export const LIGHT: Tokens = {
  anchor: "#0C0917",
  yellow: "#FEAE2E",
  white: "#FFFFFF",
  canvas: "#F8FAFF",
  calm: "#F2F3F9",
  lavender: "#DAD8E3",
  approach: "#958CBE",
  balance: "#59586E",
  depth: "#302936",
  grey: "#606C83",
  onAccent: "#FFFFFF",
  onYellow: "#0C0917",
};

export const DARK: Tokens = {
  anchor: "#F3F1FA",
  yellow: "#FEAE2E",
  white: "#1B1826",
  canvas: "#0E0C15",
  calm: "#252132",
  lavender: "#3A3450",
  approach: "#A89ED8",
  balance: "#C9C5DA",
  depth: "#E9E6F4",
  grey: "#9C97B0",
  onAccent: "#FFFFFF",
  onYellow: "#0C0917",
};

// Static light palette for non-reactive contexts (the printable HTML report).
// Themed UI code should use useTokens()/themedStyles() from design/theme.
export const TOKENS = LIGHT;

export const AVATAR_COLORS = ["#FEAE2E", "#958CBE", "#59586E", "#F2802E", "#606C83", "#1F8A5B"] as const;
