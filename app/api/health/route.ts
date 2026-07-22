// Liveness probe for Railway. Public (excluded from the auth middleware).
export const runtime = "nodejs";

export function GET() {
  return Response.json({ ok: true });
}
