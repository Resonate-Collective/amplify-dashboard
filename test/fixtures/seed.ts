// Deterministic sample data used by the metric tests and by local-dev seeding.
// Reproduces the PRD acceptance scenario: all 12 churches each month, except one
// church skipped in March and one skipped in July.
import { ROSTER } from "../../lib/config";
import type { LogRow, NetworkReach } from "../../lib/types";

const MONTHS = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];

// Churches skipped in specific months (by roster name).
const SKIP: Record<string, string> = {
  "2026-03": "Chico", // index 9 — an "action = No" row
  "2026-07": "Reno", // index 7 — an "action = No" row
};

const OWNER_CYCLE = ["Max", "Chelsy", "Geoff", "Craig"];
const DOMAIN_CYCLE = ["Finance", "HR", "Operations", "Storytelling", "Gathering & Worship"];

function actionFor(i: number): LogRow["actionTaken"] {
  if (i <= 6) return "Yes"; // 7 churches
  if (i <= 9) return "No"; // 3 churches
  if (i === 10) return "N/A";
  return ""; // i === 11 → blank
}

function buildRows(): LogRow[] {
  const rows: LogRow[] = [];
  for (const month of MONTHS) {
    ROSTER.forEach((church, i) => {
      if (SKIP[month] === church) return;
      rows.push({
        date: `${month}-15`,
        owner: OWNER_CYCLE[i % OWNER_CYCLE.length],
        church,
        artifacts: 1,
        domain: DOMAIN_CYCLE[i % DOMAIN_CYCLE.length],
        actionTaken: actionFor(i),
        hoursSaved: "M", // every row = 3 hours → clean, hand-checkable totals
        pulse: i === 11 ? 0 : 4, // one blank pulse per month tests the >0 filter
        notes: "",
      });
    });
  }
  return rows;
}

export const seedRows: LogRow[] = buildRows();

export const seedReach: NetworkReach = {
  gatheringAttendance: 2400,
  villageGathering: 800,
  discipleshipParticipation: 1200,
  amplifyFte: 3,
};

export const emptyReach: NetworkReach = {
  gatheringAttendance: null,
  villageGathering: null,
  discipleshipParticipation: null,
  amplifyFte: null,
};
