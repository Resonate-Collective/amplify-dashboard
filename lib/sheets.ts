// Google Sheets data access. Server-only — never import from client components.
// Parsing is split out as pure functions (parseLog / parseReach) so it can be
// unit-tested without hitting the API.
import { google } from "googleapis";
import { SHEET_ID } from "./config";
import type { LogRow, NetworkReach } from "./types";

export class SheetsError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "SheetsError";
  }
}

/** Quote a sheet title for A1 notation (single quotes; escape any internal quote). */
function quoteTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/** Pick the first tab title matching any of the patterns, in priority order. */
function pickTitle(titles: string[], matchers: RegExp[]): string | undefined {
  for (const re of matchers) {
    const hit = titles.find((t) => re.test(t.trim()));
    if (hit) return hit;
  }
  return undefined;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const norm = (s: unknown): string => String(s ?? "").trim();

/** Parse a possibly comma-formatted number; return null when not a real number. */
function parseNum(raw: unknown): number | null {
  const s = norm(raw).replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Map of canonical Monthly Log headers → the LogRow field they fill. */
const HEADER_FIELDS: Record<string, keyof LogRow> = {
  "date": "date",
  "amplify owner": "owner",
  "church": "church",
  "artifacts shipped": "artifacts",
  "primary domain": "domain",
  "action taken": "actionTaken",
  "hours saved": "hoursSaved",
  "pulse": "pulse",
  "notes": "notes",
};

/**
 * Parse the `Monthly Log` grid into typed rows. Reads by header name (not fixed
 * columns), and — per PRD §14 — only treats a row as a log row when its Date
 * cell is a real YYYY-MM-DD value.
 */
export function parseLog(values: string[][]): LogRow[] {
  if (!values || values.length === 0) return [];

  // Find the header row: the first row containing a "Date" cell.
  const headerIdx = values.findIndex((row) =>
    row.some((cell) => norm(cell).toLowerCase() === "date")
  );
  if (headerIdx === -1) return [];

  const header = values[headerIdx];
  const colToField = new Map<number, keyof LogRow>();
  header.forEach((cell, i) => {
    const field = HEADER_FIELDS[norm(cell).toLowerCase()];
    if (field) colToField.set(i, field);
  });

  const rows: LogRow[] = [];
  for (let r = headerIdx + 1; r < values.length; r++) {
    const raw = values[r] || [];
    const rec: LogRow = {
      date: "",
      owner: "",
      church: "",
      artifacts: 0,
      domain: "",
      actionTaken: "",
      hoursSaved: "",
      pulse: 0,
      notes: "",
    };
    for (const [col, field] of colToField) {
      const cell = raw[col];
      switch (field) {
        case "artifacts":
          rec.artifacts = parseNum(cell) ?? 0;
          break;
        case "pulse":
          rec.pulse = parseNum(cell) ?? 0;
          break;
        case "actionTaken": {
          const v = norm(cell);
          rec.actionTaken =
            v === "Yes" || v === "No" || v === "N/A" ? (v as LogRow["actionTaken"]) : "";
          break;
        }
        case "hoursSaved": {
          const v = norm(cell).toUpperCase();
          rec.hoursSaved =
            v === "S" || v === "M" || v === "L" ? (v as LogRow["hoursSaved"]) : "";
          break;
        }
        default:
          (rec[field] as string) = norm(cell);
      }
    }
    // Date guard: skip anything that isn't a real check-in row.
    if (DATE_RE.test(rec.date)) rows.push(rec);
  }
  return rows;
}

const REACH_LABELS: Record<string, keyof NetworkReach> = {
  "gathering attendance": "gatheringAttendance",
  "village gathering": "villageGathering",
  "discipleship participation": "discipleshipParticipation",
  "amplify fte": "amplifyFte",
};

/**
 * Parse the `Network Reach` label/value block. For each row, if a cell matches a
 * known label, take the first subsequent numeric cell as its value. Robust to the
 * block moving around the tab.
 */
export function parseReach(values: string[][]): NetworkReach {
  const reach: NetworkReach = {
    gatheringAttendance: null,
    villageGathering: null,
    discipleshipParticipation: null,
    amplifyFte: null,
  };
  if (!values) return reach;

  for (const row of values) {
    for (let c = 0; c < row.length; c++) {
      const field = REACH_LABELS[norm(row[c]).toLowerCase()];
      if (!field) continue;
      for (let v = c + 1; v < row.length; v++) {
        const n = parseNum(row[v]);
        if (n !== null) {
          reach[field] = n;
          break;
        }
      }
    }
  }
  return reach;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new SheetsError("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    // Allow the JSON to be provided base64-encoded (handy for some env stores).
    try {
      credentials = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch (e) {
      throw new SheetsError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON", e);
    }
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/** Read both tabs from the Sheet and parse into typed data. Throws SheetsError. */
export async function readSheet(): Promise<{ rows: LogRow[]; reach: NetworkReach }> {
  try {
    const sheets = google.sheets({ version: "v4", auth: getAuth() });

    // Resolve the real tab titles at runtime so exact naming/spacing/casing
    // can't break the read. Read the whole tab (title only, no A:I bound) so an
    // added column like "Pastor" can't truncate the data — parsing is by header.
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: "sheets.properties.title",
    });
    const titles = (meta.data.sheets ?? [])
      .map((s) => s.properties?.title ?? "")
      .filter(Boolean);

    const logTitle = pickTitle(titles, [/^monthly\s*log$/i, /log/i]) ?? titles[0];
    const reachTitle = pickTitle(titles, [/^network\s*reach$/i, /reach/i]);

    if (!logTitle) {
      throw new SheetsError("No tabs found in the spreadsheet");
    }

    const rangeList = [quoteTitle(logTitle)];
    if (reachTitle) rangeList.push(quoteTitle(reachTitle));

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges: rangeList,
    });
    const valueRanges = res.data.valueRanges ?? [];
    const logValues = (valueRanges[0]?.values ?? []) as string[][];
    const reachValues = reachTitle
      ? ((valueRanges[1]?.values ?? []) as string[][])
      : [];

    return { rows: parseLog(logValues), reach: parseReach(reachValues) };
  } catch (e) {
    if (e instanceof SheetsError) throw e;
    throw new SheetsError("Failed to read the Google Sheet", e);
  }
}
