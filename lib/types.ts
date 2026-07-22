// Shared types across the data, metrics, and UI layers.

/** One parsed row of the `Monthly Log` tab. */
export interface LogRow {
  date: string; // YYYY-MM-DD
  owner: string;
  church: string;
  artifacts: number;
  domain: string;
  actionTaken: "Yes" | "No" | "N/A" | "";
  hoursSaved: "S" | "M" | "L" | "";
  pulse: number; // 0 if blank/invalid
  notes: string;
}

/** Parsed `Network Reach` label/value block. */
export interface NetworkReach {
  gatheringAttendance: number | null;
  villageGathering: number | null;
  discipleshipParticipation: number | null;
  amplifyFte: number | null;
}

export interface KpiDelta {
  kind: "up" | "down" | "flat" | "first";
  /** Percent change vs previous month; null when kind === "first". */
  pct: number | null;
}

export interface Kpis {
  hoursSaved: { value: number; delta: KpiDelta; latestMonth: string | null };
  actionRate: { pct: number | null }; // null when denominator is 0
  avgPulse: { value: number | null }; // null when no scored rows
  checkinCompletion: {
    pct: number | null;
    present: number;
    rosterSize: number;
  };
}

export interface ReachCard {
  key: "gathering" | "village" | "discipleship";
  label: string;
  perFte: number;
}

export interface ReachResult {
  available: boolean; // false → render the placeholder
  cards: ReachCard[];
}

export interface MonthPoint {
  month: string;
  hours: number;
}

export interface DomainBar {
  domain: string;
  artifacts: number;
  color: string;
}

export interface ChurchRow {
  church: string;
  hoursSaved: number;
  actionRate: number | null;
  avgPulse: number | null;
  lastCheckin: string | null;
}

export interface StaffCard {
  owner: string;
  hoursSaved: number;
  artifacts: number;
  avgPulse: number | null;
}

export interface Metrics {
  kpis: Kpis;
  reach: ReachResult;
  hoursByMonth: MonthPoint[];
  artifactsByDomain: DomainBar[];
  byChurch: ChurchRow[];
  byStaff: StaffCard[];
  rowCount: number;
  generatedAt: string; // ISO timestamp of when metrics were computed
}

export type PulseStatus = "green" | "amber" | "coral" | "red" | "none";
