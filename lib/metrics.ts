// Metric rollups — faithful port of PRD §6. Pure functions only (unit-tested).
import { DOMAINS, DOMAIN_COLORS, HOURS_MAP, ROSTER } from "./config";
import type {
  ChurchRow,
  DomainBar,
  Kpis,
  LogRow,
  Metrics,
  MonthPoint,
  NetworkReach,
  PulseStatus,
  ReachResult,
  StaffCard,
} from "./types";

const round = (n: number) => Math.round(n);

/** S/M/L → numeric hours via the configurable map; unknown/blank → 0. */
export function hoursNum(hoursSaved: string): number {
  return HOURS_MAP[hoursSaved] ?? 0;
}

/** month = Date[0:7], e.g. "2026-07". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Distinct months present, sorted descending (latest first). */
function monthsDescending(rows: LogRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) set.add(monthOf(r.date));
  return [...set].sort().reverse();
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Average pulse over rows where pulse > 0, rounded to one decimal. */
function avgPulse(rows: LogRow[]): number | null {
  const scored = rows.filter((r) => r.pulse > 0).map((r) => r.pulse);
  const m = mean(scored);
  return m === null ? null : Math.round(m * 10) / 10;
}

/** yes / (yes + no) as a rounded %, excluding N/A and blanks. null if no yes/no rows. */
function actionRate(rows: LogRow[]): number | null {
  let yes = 0;
  let no = 0;
  for (const r of rows) {
    if (r.actionTaken === "Yes") yes++;
    else if (r.actionTaken === "No") no++;
  }
  const denom = yes + no;
  if (denom === 0) return null;
  return round((100 * yes) / denom);
}

/** Pulse status dot color from an average (PRD §6 thresholds). */
export function pulseStatus(avg: number | null): PulseStatus {
  if (avg === null) return "none";
  if (avg >= 4) return "green";
  if (avg >= 3) return "amber";
  if (avg >= 2) return "coral";
  return "red";
}

function computeKpis(rows: LogRow[]): Kpis {
  const months = monthsDescending(rows);
  const latestMonth = months[0] ?? null;
  const previousMonth = months[1] ?? null;

  const sumHoursForMonth = (m: string | null) =>
    m === null
      ? 0
      : rows
          .filter((r) => monthOf(r.date) === m)
          .reduce((sum, r) => sum + hoursNum(r.hoursSaved), 0);

  const latestHours = sumHoursForMonth(latestMonth);
  const prevHours = sumHoursForMonth(previousMonth);

  let delta: Kpis["hoursSaved"]["delta"];
  if (previousMonth === null) {
    delta = { kind: "first", pct: null };
  } else if (prevHours === 0) {
    // Previous month exists but had zero hours — % change is undefined.
    delta = { kind: latestHours > 0 ? "up" : "flat", pct: null };
  } else {
    const pct = round((100 * (latestHours - prevHours)) / prevHours);
    delta = {
      kind: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
      pct,
    };
  }

  // Check-in completion: distinct ROSTER churches with a row in the latest month.
  const rosterSet = new Set<string>(ROSTER as readonly string[]);
  const churchesThisMonth = new Set<string>();
  if (latestMonth !== null) {
    for (const r of rows) {
      if (monthOf(r.date) === latestMonth && rosterSet.has(r.church)) {
        churchesThisMonth.add(r.church);
      }
    }
  }
  const present = churchesThisMonth.size;
  const rosterSize = ROSTER.length;

  return {
    hoursSaved: { value: latestHours, delta, latestMonth },
    actionRate: { pct: actionRate(rows) },
    avgPulse: { value: avgPulse(rows) },
    checkinCompletion: {
      pct: latestMonth === null ? null : round((100 * present) / rosterSize),
      present,
      rosterSize,
    },
  };
}

function computeReach(reach: NetworkReach): ReachResult {
  const fte = reach.amplifyFte;
  const totals = {
    gathering: reach.gatheringAttendance,
    village: reach.villageGathering,
    discipleship: reach.discipleshipParticipation,
  };
  const totalsPresent =
    totals.gathering !== null &&
    totals.village !== null &&
    totals.discipleship !== null;

  if (fte === null || fte <= 0 || !totalsPresent) {
    return { available: false, cards: [] };
  }

  return {
    available: true,
    cards: [
      { key: "gathering", label: "Gathering per FTE", perFte: round(totals.gathering! / fte) },
      { key: "village", label: "Village per FTE", perFte: round(totals.village! / fte) },
      {
        key: "discipleship",
        label: "Discipleship per FTE",
        perFte: round(totals.discipleship! / fte),
      },
    ],
  };
}

function hoursByMonth(rows: LogRow[]): MonthPoint[] {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const m = monthOf(r.date);
    byMonth.set(m, (byMonth.get(m) ?? 0) + hoursNum(r.hoursSaved));
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b)) // ascending
    .map(([month, hours]) => ({ month, hours }));
}

function artifactsByDomain(rows: LogRow[]): DomainBar[] {
  const byDomain = new Map<string, number>();
  for (const r of rows) {
    if (!r.domain) continue;
    byDomain.set(r.domain, (byDomain.get(r.domain) ?? 0) + r.artifacts);
  }
  // Stable order: known domains first (config order), then any others alphabetically.
  const known = (DOMAINS as readonly string[]).filter((d) => byDomain.has(d));
  const extra = [...byDomain.keys()]
    .filter((d) => !(DOMAINS as readonly string[]).includes(d))
    .sort();
  return [...known, ...extra].map((domain) => ({
    domain,
    artifacts: byDomain.get(domain) ?? 0,
    color: DOMAIN_COLORS[domain] ?? "#9a9995",
  }));
}

function byChurch(rows: LogRow[]): ChurchRow[] {
  const churches = [...new Set(rows.map((r) => r.church).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return churches.map((church) => {
    const cr = rows.filter((r) => r.church === church);
    const hoursSaved = cr.reduce((s, r) => s + hoursNum(r.hoursSaved), 0);
    const lastCheckin = cr
      .map((r) => r.date)
      .sort()
      .at(-1) ?? null;
    return {
      church,
      hoursSaved,
      actionRate: actionRate(cr),
      avgPulse: avgPulse(cr),
      lastCheckin,
    };
  });
}

function byStaff(rows: LogRow[]): StaffCard[] {
  const owners = [...new Set(rows.map((r) => r.owner).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
  return owners.map((owner) => {
    const or = rows.filter((r) => r.owner === owner);
    return {
      owner,
      hoursSaved: or.reduce((s, r) => s + hoursNum(r.hoursSaved), 0),
      artifacts: or.reduce((s, r) => s + r.artifacts, 0),
      avgPulse: avgPulse(or),
    };
  });
}

/** Compute the full metrics payload. `generatedAt` is injected (pure/testable). */
export function computeMetrics(
  rows: LogRow[],
  reach: NetworkReach,
  generatedAt: string
): Metrics {
  return {
    kpis: computeKpis(rows),
    reach: computeReach(reach),
    hoursByMonth: hoursByMonth(rows),
    artifactsByDomain: artifactsByDomain(rows),
    byChurch: byChurch(rows),
    byStaff: byStaff(rows),
    rowCount: rows.length,
    generatedAt,
  };
}
