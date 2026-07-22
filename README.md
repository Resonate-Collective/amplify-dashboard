# Amplify Effectiveness Dashboard

A small, read-only web dashboard showing how the Amplify team is serving Resonate's
churches. It reads one Google Sheet (the source of truth), computes rollups, and renders
a dashboard gated behind Google sign-in restricted to the `resonate.net` domain.

- **Data entry stays in the Sheet** — this app only reads and visualizes. No database, no write-back.
- **Stack:** Next.js 14 (App Router) + Auth.js (NextAuth v5) + Google Sheets API + Chart.js.
- **Hosting:** Railway (Nixpacks buildpack). Health check at `/api/health`.

---

## How it works

1. `middleware.ts` requires a session for every route except `/signin`, `/denied`, and `/api/health`.
2. Sign-in is Google OAuth; `lib/auth.ts` rejects anyone whose **verified** email doesn't end in
   `@resonate.net` (server-side — not the `hd` hint alone). Rejected users land on `/denied`.
3. `GET /api/metrics` reads both Sheet tabs with a **service account**, computes the metrics
   (`lib/metrics.ts`), and returns JSON. Reads are cached ~5 min; the **Refresh** button calls
   `?refresh=1` to bypass the cache.
4. The dashboard (`components/Dashboard.tsx`) renders KPI cards → reach-per-FTE → charts →
   by-church → by-staff, with loading / empty / error / reach-placeholder states.

All tunables (roster, owners, domains, colors, hours map) live in `lib/config.ts` — edit there.

---

## Local development

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
npm test                     # metric unit tests (no Google access needed)
```

The metric tests in `test/` verify the acceptance-criteria math against a seeded fixture
(`test/fixtures/seed.ts`) — no Sheet or credentials required.

---

## Prerequisites (Google Cloud + Railway)

These are console steps that need your own Google/Railway login.

### 1. Service account for reading the Sheet — reuse the existing Resonate one

We reuse `okr-manager-agent@director-sandbox.iam.gserviceaccount.com` (GCP project
`director-sandbox`), the same service account the meeting-agenda tooling uses.

1. In Google Cloud console → project `director-sandbox` → **APIs & Services → Enable APIs**:
   enable the **Google Sheets API** (Drive API is already enabled).
2. Open the Sheet `1ydbAZ-qGqwavxJ2xVbFmRr_s89RyeY-6nCSq8_x8iNE` → **Share** → add
   `okr-manager-agent@director-sandbox.iam.gserviceaccount.com` as **Viewer**.
3. The key JSON already exists locally at `~/.config/resonate/service_account.json`. Its full
   contents become the `GOOGLE_SERVICE_ACCOUNT_JSON` env var (single-line string or base64).

> Prefer to isolate this app instead? Create a fresh service account + key in any project, enable
> the Sheets API there, share the Sheet with it, and use that key. Nothing else changes.

### 2. OAuth web client for sign-in (new)

1. Same project → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URI:** `https://<your-railway-domain>/api/auth/callback/google`
   (add this once Railway assigns the domain — see step 3; you can edit it later).
4. Save → copy the **Client ID** and **Client secret** → `GOOGLE_OAUTH_CLIENT_ID` /
   `GOOGLE_OAUTH_CLIENT_SECRET`.
5. If the OAuth consent screen is in "testing", either publish it (Internal is fine for a
   Workspace) or add testers. Internal + resonate.net Workspace is the intended setup.

### 3. Railway (new Resonate account, separate from Breeze Ops)

1. Create the new GitHub repo and push (see below), then in Railway: **New Project → Deploy from
   GitHub repo** → pick this repo.
2. Add the environment variables (below). Railway assigns a public domain — copy it.
3. Set `PUBLIC_BASE_URL` and `AUTH_URL` to that `https://…` domain and redeploy.
4. Go back to the OAuth client (step 2) and set the redirect URI to
   `https://<that-domain>/api/auth/callback/google`.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SHEET_ID` | The Google Sheet ID (defaults to the Amplify log). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service-account key JSON (single line or base64). |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth web client ID. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth web client secret. |
| `SESSION_SECRET` | JWT/session signing secret (`openssl rand -base64 32`). |
| `ALLOWED_DOMAIN` | `resonate.net`. |
| `PUBLIC_BASE_URL` | Public app URL. |
| `AUTH_URL` | Same as `PUBLIC_BASE_URL` (Auth.js canonical URL). |
| `AUTH_TRUST_HOST` | `true` (behind Railway's proxy). |

No secrets belong in the repo. `.gitignore` excludes `.env*` and any `*service_account*.json`.

---

## Deploy checklist (quick)

- [ ] Sheets API enabled on `director-sandbox`; Sheet shared with the service account (Viewer).
- [ ] OAuth web client created; secret copied.
- [ ] GitHub repo created and pushed.
- [ ] Railway project deploying from the repo; env vars set.
- [ ] `PUBLIC_BASE_URL` / `AUTH_URL` set to the Railway domain; redirect URI matches.
- [ ] Sign in with a resonate.net account → dashboard loads. Non-resonate.net → denied.

---

## Future / out of scope (v1)

Noted here so they aren't forgotten; not built yet:

- Satisfaction / NPS (from the pastor service audit), staff tenure, and funding YoY as new
  columns/tabs → new cards.
- Per-church drill-down page.
- Optional in-app check-in entry (write path) if the Sheet ever becomes a bottleneck.
- Trend of check-in completion over time.
