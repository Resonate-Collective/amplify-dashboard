// Small presentation helpers. Pure, no locale surprises for the fixed formats.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07" → "Jul 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const idx = Number(m) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${y}` : month;
}

/** "2026-07-15" → "Jul 15, 2026" (or "—" when null) */
export function formatDate(date: string | null): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  const idx = Number(m) - 1;
  if (!MONTHS[idx]) return date;
  return `${MONTHS[idx]} ${Number(d)}, ${y}`;
}

/** ISO → locale time for the "last updated" line. */
export function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function pct(n: number | null): string {
  return n === null ? "—" : `${n}%`;
}
