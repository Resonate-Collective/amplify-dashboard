import { pulseStatus } from "@/lib/metrics";

export default function PulseDot({ avg }: { avg: number | null }) {
  const status = pulseStatus(avg);
  const title = avg === null ? "No pulse yet" : `Avg pulse ${avg.toFixed(1)} / 5`;
  return (
    <span title={title}>
      <span className={`dot ${status}`} aria-hidden="true" />
      {avg === null ? "—" : avg.toFixed(1)}
    </span>
  );
}
