// Central configuration for the Amplify dashboard (PRD §7).
// Roster and owners change over time — edit them here, never in components.

/** Google Sheet that is the source of truth. Overridable via SHEET_ID env var. */
export const SHEET_ID =
  process.env.SHEET_ID || "1ydbAZ-qGqwavxJ2xVbFmRr_s89RyeY-6nCSq8_x8iNE";

/** The 12-church roster. Check-in completion is measured against this list. */
export const ROSTER = [
  "Pullman",
  "Moscow",
  "Missoula",
  "Boise",
  "Ellensburg",
  "Monmouth",
  "Corvallis",
  "Reno",
  "SLC",
  "Chico",
  "Bellingham",
  "Grand Junction",
] as const;

/** Amplify owners. */
export const OWNERS = ["Max", "Chelsy", "Geoff", "Craig"] as const;

/** Primary domains an artifact can belong to. */
export const DOMAINS = [
  "Finance",
  "HR",
  "Operations",
  "Storytelling",
  "Gathering & Worship",
] as const;

/** Coarse S/M/L hours-saved estimate → numeric hours. */
export const HOURS_MAP: Record<string, number> = { S: 1, M: 3, L: 8 };

/** Chart color per domain. */
export const DOMAIN_COLORS: Record<string, string> = {
  Finance: "#2a78d6",
  Operations: "#eb6834",
  "Gathering & Worship": "#1baf7a",
  Storytelling: "#eda100",
  HR: "#e87ba4",
};

/** Google Workspace domain allowed to sign in. */
export const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || "resonate.net";

export type Church = (typeof ROSTER)[number];
export type Owner = (typeof OWNERS)[number];
export type Domain = (typeof DOMAINS)[number];
