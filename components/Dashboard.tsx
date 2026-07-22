"use client";

import { useCallback, useEffect, useState } from "react";
import type { Metrics } from "@/lib/types";
import { DomainBarChart, HoursLineChart } from "./Charts";
import PulseDot from "./PulseDot";
import { formatDate, formatUpdated, monthLabel, pct } from "./format";

type Status = "loading" | "ready" | "error" | "empty";

interface Props {
  userEmail: string;
  signOutAction: () => Promise<void>;
}

export default function Dashboard({ userEmail, signOutAction }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cachedAt, setCachedAt] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true);
    else setStatus("loading");
    try {
      const res = await fetch(`/api/metrics${refresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error || `Request failed (${res.status})`);
        setStatus("error");
        return;
      }
      const m: Metrics = body.metrics;
      setMetrics(m);
      setCachedAt(body.cachedAt || m.generatedAt);
      setStatus(m.rowCount === 0 ? "empty" : "ready");
    } catch (e) {
      setError("Could not reach the server. Check your connection and retry.");
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Amplify effectiveness</h1>
          <div className="sub">How the Amplify team is serving Resonate&apos;s churches</div>
        </div>
        <div className="actions">
          {status === "ready" && cachedAt && (
            <span className="updated">Last updated {formatUpdated(cachedAt)}</span>
          )}
          <button
            className="btn"
            onClick={() => load(true)}
            disabled={refreshing || status === "loading"}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <form action={signOutAction}>
            <button className="btn" type="submit" title={userEmail}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      {status === "loading" && <div className="state">Loading dashboard…</div>}

      {status === "error" && (
        <div className="state error">
          <p>Couldn&apos;t load the dashboard.</p>
          <p className="placeholder">{error}</p>
          <button className="btn" onClick={() => load(true)}>
            Try again
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="state">
          No check-ins logged yet. Add rows to the Monthly Log tab, then Refresh.
        </div>
      )}

      {status === "ready" && metrics && <Content m={metrics} />}
    </>
  );
}

function Content({ m }: { m: Metrics }) {
  const { kpis, reach } = m;
  const hs = kpis.hoursSaved;

  const deltaText =
    hs.delta.kind === "first"
      ? "First month"
      : hs.delta.kind === "flat"
        ? "→ No change vs prev"
        : hs.delta.kind === "up"
          ? `▲ ${hs.delta.pct}% vs prev`
          : `▼ ${Math.abs(hs.delta.pct ?? 0)}% vs prev`;

  return (
    <>
      {/* KPI row */}
      <section className="section">
        <div className="grid grid-4">
          <div className="card kpi">
            <div className="label">Admin hours saved</div>
            <div className="value">{hs.value}</div>
            <div className={`delta ${hs.delta.kind === "up" ? "up" : hs.delta.kind === "down" ? "down" : ""}`}>
              {hs.latestMonth ? `${monthLabel(hs.latestMonth)} · ${deltaText}` : deltaText}
            </div>
          </div>
          <div className="card kpi">
            <div className="label">Action-taken rate</div>
            <div className="value">{pct(kpis.actionRate.pct)}</div>
            <div className="delta">Yes ÷ (Yes + No)</div>
          </div>
          <div className="card kpi">
            <div className="label">Avg pulse</div>
            <div className="value">
              {kpis.avgPulse.value === null ? "—" : `${kpis.avgPulse.value.toFixed(1)} / 5`}
            </div>
            <div className="delta">
              <PulseDot avg={kpis.avgPulse.value} />
            </div>
          </div>
          <div className="card kpi">
            <div className="label">Check-in completion</div>
            <div className="value">{pct(kpis.checkinCompletion.pct)}</div>
            <div className="delta">
              {kpis.checkinCompletion.present} of {kpis.checkinCompletion.rosterSize} churches
            </div>
          </div>
        </div>
      </section>

      {/* Network reach per FTE */}
      <section className="section reach">
        <h2>Network reach per FTE</h2>
        {reach.available ? (
          <div className="grid grid-3">
            {reach.cards.map((c) => (
              <div className="card kpi" key={c.key}>
                <div className="label">{c.label}</div>
                <div className="value">{c.perFte.toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card placeholder">
            Add the numbers on the Network Reach tab (gathering attendance, village
            gathering, discipleship participation, and Amplify FTE) to see reach per FTE.
          </div>
        )}
      </section>

      {/* Charts */}
      <section className="section">
        <div className="grid grid-2">
          <div className="card chart-card">
            <h2>Admin hours saved by month</h2>
            <HoursLineChart data={m.hoursByMonth} />
          </div>
          <div className="card chart-card">
            <h2>Artifacts by domain</h2>
            <DomainBarChart data={m.artifactsByDomain} />
          </div>
        </div>
      </section>

      {/* By church */}
      <section className="section">
        <h2>By church</h2>
        <div className="card list-scroll">
          <table className="list">
            <thead>
              <tr>
                <th>Church</th>
                <th className="num">Hours saved</th>
                <th className="num">Action rate</th>
                <th>Avg pulse</th>
                <th>Last check-in</th>
              </tr>
            </thead>
            <tbody>
              {m.byChurch.map((c) => (
                <tr key={c.church}>
                  <td>{c.church}</td>
                  <td className="num">{c.hoursSaved}</td>
                  <td className="num">{pct(c.actionRate)}</td>
                  <td>
                    <PulseDot avg={c.avgPulse} />
                  </td>
                  <td>{formatDate(c.lastCheckin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By staff */}
      <section className="section">
        <h2>By staff</h2>
        <div className="grid grid-4">
          {m.byStaff.map((s) => (
            <div className="card" key={s.owner}>
              <div className="label" style={{ fontWeight: 600, color: "var(--text)" }}>
                {s.owner}
              </div>
              <div className="delta" style={{ marginTop: 8 }}>
                {s.hoursSaved} hours saved
              </div>
              <div className="delta">{s.artifacts} artifacts</div>
              <div className="delta">
                <PulseDot avg={s.avgPulse} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
