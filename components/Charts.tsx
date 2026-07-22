"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { DomainBar, MonthPoint } from "@/lib/types";
import { monthLabel } from "./format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler
);

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: "#6b6a66" } },
    y: {
      beginAtZero: true,
      grid: { color: "#ebeae5" },
      ticks: { color: "#6b6a66", precision: 0 },
      border: { display: false },
    },
  },
} as const;

export function HoursLineChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="chart-box">
      <Line
        data={{
          labels: data.map((d) => monthLabel(d.month)),
          datasets: [
            {
              data: data.map((d) => d.hours),
              borderColor: "#2a78d6",
              backgroundColor: "rgba(42, 120, 214, 0.12)",
              fill: true,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: "#2a78d6",
            },
          ],
        }}
        options={BASE_OPTS as any}
      />
    </div>
  );
}

export function DomainBarChart({ data }: { data: DomainBar[] }) {
  return (
    <div className="chart-box">
      <Bar
        data={{
          labels: data.map((d) => d.domain),
          datasets: [
            {
              data: data.map((d) => d.artifacts),
              backgroundColor: data.map((d) => d.color),
              borderRadius: 4,
              maxBarThickness: 64,
            },
          ],
        }}
        options={BASE_OPTS as any}
      />
    </div>
  );
}
