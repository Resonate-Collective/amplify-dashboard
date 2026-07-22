import { describe, expect, it } from "vitest";
import { computeMetrics, pulseStatus, hoursNum } from "../lib/metrics";
import { parseLog, parseReach } from "../lib/sheets";
import { emptyReach, seedReach, seedRows } from "./fixtures/seed";

const AT = "2026-07-22T12:00:00.000Z";
const m = () => computeMetrics(seedRows, seedReach, AT);

describe("hoursNum (S/M/L → 1/3/8)", () => {
  it("maps the coarse estimate", () => {
    expect(hoursNum("S")).toBe(1);
    expect(hoursNum("M")).toBe(3);
    expect(hoursNum("L")).toBe(8);
    expect(hoursNum("")).toBe(0);
    expect(hoursNum("X")).toBe(0);
  });
});

describe("KPIs", () => {
  it("AC2 — July check-in completion is 92% (11 of 12)", () => {
    const { checkinCompletion } = m().kpis;
    expect(checkinCompletion.present).toBe(11);
    expect(checkinCompletion.rosterSize).toBe(12);
    expect(checkinCompletion.pct).toBe(92);
  });

  it("AC3 — hours saved for latest month + MoM delta sign/value", () => {
    const { hoursSaved } = m().kpis;
    expect(hoursSaved.latestMonth).toBe("2026-07");
    expect(hoursSaved.value).toBe(33); // 11 churches × 3 (M)
    // June = 36; round(100 * (33 - 36) / 36) = -8, trending down.
    expect(hoursSaved.delta.kind).toBe("down");
    expect(hoursSaved.delta.pct).toBe(-8);
  });

  it("AC4 — action-taken rate excludes N/A and blanks from the denominator", () => {
    // Yes=35, No=13, N/A=5, blank=5. round(100*35/48) = 73 (not 35/58).
    expect(m().kpis.actionRate.pct).toBe(73);
  });

  it("avg pulse ignores blank (0) rows", () => {
    expect(m().kpis.avgPulse.value).toBe(4.0);
  });
});

describe("AC5 — network reach per FTE", () => {
  it("shows total ÷ FTE rounded when values are present", () => {
    const reach = m().reach;
    expect(reach.available).toBe(true);
    const byKey = Object.fromEntries(reach.cards.map((c) => [c.key, c.perFte]));
    expect(byKey.gathering).toBe(800); // 2400 / 3
    expect(byKey.village).toBe(267); // round(800 / 3)
    expect(byKey.discipleship).toBe(400); // 1200 / 3
  });

  it("shows the placeholder (not broken cards) when values are absent", () => {
    const reach = computeMetrics(seedRows, emptyReach, AT).reach;
    expect(reach.available).toBe(false);
    expect(reach.cards).toHaveLength(0);
  });

  it("shows the placeholder when FTE is 0", () => {
    const reach = computeMetrics(
      seedRows,
      { ...seedReach, amplifyFte: 0 },
      AT
    ).reach;
    expect(reach.available).toBe(false);
  });
});

describe("charts", () => {
  it("hours saved by month is ascending and correct", () => {
    expect(m().hoursByMonth).toEqual([
      { month: "2026-03", hours: 33 },
      { month: "2026-04", hours: 36 },
      { month: "2026-05", hours: 36 },
      { month: "2026-06", hours: 36 },
      { month: "2026-07", hours: 33 },
    ]);
  });

  it("artifacts by domain sums per domain with colors", () => {
    const bars = m().artifactsByDomain;
    const total = bars.reduce((s, b) => s + b.artifacts, 0);
    expect(total).toBe(58); // 1 artifact per row, 58 rows
    const finance = bars.find((b) => b.domain === "Finance");
    expect(finance?.artifacts).toBe(15);
    expect(finance?.color).toBe("#2a78d6");
  });
});

describe("breakdowns", () => {
  it("by church: one row per distinct church, sorted A→Z", () => {
    const churches = m().byChurch.map((c) => c.church);
    expect(churches).toHaveLength(12);
    expect(churches).toEqual([...churches].sort((a, b) => a.localeCompare(b)));
  });

  it("by staff: one card per distinct owner", () => {
    expect(m().byStaff.map((s) => s.owner).sort()).toEqual([
      "Chelsy",
      "Craig",
      "Geoff",
      "Max",
    ]);
  });
});

describe("pulse status thresholds", () => {
  it("maps averages to dot colors", () => {
    expect(pulseStatus(4.2)).toBe("green");
    expect(pulseStatus(4)).toBe("green");
    expect(pulseStatus(3.1)).toBe("amber");
    expect(pulseStatus(2.5)).toBe("coral");
    expect(pulseStatus(1.4)).toBe("red");
    expect(pulseStatus(null)).toBe("none");
  });
});

describe("parsing (sheets)", () => {
  it("parseLog reads by header and applies the date guard", () => {
    const grid = [
      ["Amplify Effectiveness — Monthly Log"], // title row above the header
      [
        "Date",
        "Amplify owner",
        "Church",
        "Artifacts shipped",
        "Primary domain",
        "Action taken",
        "Hours saved",
        "Pulse",
        "Notes",
      ],
      ["2026-07-15", "Max", "Boise", "2", "Finance", "Yes", "L", "5", "went well"],
      ["not-a-date", "Max", "Boise", "9", "Finance", "Yes", "L", "5", "should be ignored"],
      ["", "", "", "", "", "", "", "", ""], // blank row ignored
      ["2026-07-16", "Chelsy", "Reno", "1", "HR", "No", "S", "3", ""],
    ];
    const rows = parseLog(grid);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2026-07-15",
      owner: "Max",
      church: "Boise",
      artifacts: 2,
      domain: "Finance",
      actionTaken: "Yes",
      hoursSaved: "L",
      pulse: 5,
    });
    expect(rows[1].church).toBe("Reno");
  });

  it("parseReach reads values by label, tolerating commas", () => {
    const grid = [
      ["Metric", "Value"],
      ["Gathering attendance", "2,400"],
      ["Village gathering", "800"],
      ["Discipleship participation", "1200"],
      ["Amplify FTE", "3"],
    ];
    expect(parseReach(grid)).toEqual({
      gatheringAttendance: 2400,
      villageGathering: 800,
      discipleshipParticipation: 1200,
      amplifyFte: 3,
    });
  });

  it("parseReach returns nulls when labels are missing", () => {
    expect(parseReach([["Something else", "5"]])).toEqual({
      gatheringAttendance: null,
      villageGathering: null,
      discipleshipParticipation: null,
      amplifyFte: null,
    });
  });
});
