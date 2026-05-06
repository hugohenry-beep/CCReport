# Inbound Lead Report

A Next.js web app that ingests HubSpot dashboard exports and Google Ads campaign reports, then generates a written report covering inbound-lead volume, source/stage breakdowns, ad spend vs results, high-value (>$15k) deal callouts, and stage-specific counts (DEMO, Negotiating, Contract is live). Each generated report is persisted in Postgres so subsequent runs auto-compare against the prior period.

## Quick start (local)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill in values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — a Postgres connection string. For local dev, you can use a Docker Postgres, Supabase, or Railway's local-link.
   - `OPENAI_API_KEY` — for the optional "Rewrite as narrative" toggle.
3. Apply the database schema:
   ```bash
   npm run db:migrate:dev
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000.

## Using the app

1. **Upload files**: drop your HubSpot dashboard export (the zip is fine — the app unzips it) and the Google Ads `Campaign report` xlsx into the file input. You can mix zip and xlsx files in a single upload.
2. **Pick a date range**: select the start and end of the timeframe you want to analyze.
3. **Generate**: the app parses every file by filename pattern, filters by your date range, computes metrics, and persists a snapshot.
4. **View / download**: you'll be redirected to the report view. Download Markdown, HTML, or PDF, or click "Rewrite as narrative" to have OpenAI rewrite it as prose (numbers preserved exactly).

## Recognized HubSpot files (auto-detected by filename)

| Filename contains              | Used for                                                       |
| ------------------------------ | -------------------------------------------------------------- |
| `paid-pipe-created`            | Deals with amounts — drives **>$15k callouts** and stage counts |
| `cc-inbound-last-week-stage`   | Inbound deal-stage breakdown                                   |
| `cc-inbound-last-week-qo`      | Lead-stage funnel                                              |
| `cc-inbound-lead-volume`       | Multi-week lead volume time series                             |
| `cc-inbound-total-lead-volum`  | Lead-source attribution (and country breakdown)                |
| `total-closed-won`             | Deals that **entered "Contract is live"** in the period        |
| `usa-canada` / `europe-and-row`| Optional regional cuts                                         |
| `Campaign report`              | Google Ads spend per campaign                                  |

If a file doesn't match any pattern it's skipped and noted in the report's "Notes" section.

## Stage matching

HubSpot stage labels are verbose (`"Demo (CarCutter - New business)"`, `"Negotiation / Trade"`, etc.). The app does **case-insensitive substring matching** against keyword lists in `lib/types.ts`:

- `demo` → matches "Demo"
- `negotiating` → matches "Negotiation" / "Negotiating"
- `contract_live` → matches "Contract is live"

Update `STAGE_KEYWORDS` in `lib/types.ts` if your HubSpot stage labels change.

## Deploy on Railway

1. Push this repo to GitHub.
2. Create a new Railway project and connect the GitHub repo.
3. Add a **PostgreSQL** plugin from the Railway dashboard. `DATABASE_URL` is injected automatically.
4. Add an environment variable for `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`).
5. Deploy. The `railway.json` build/start commands will run `prisma migrate deploy` before `npm run start`.

## Project layout

```
app/
  api/
    upload/route.ts       # Parse + compute + persist
    narrative/route.ts    # OpenAI rewrite
    reports/route.ts      # List recent
  report/[id]/
    page.tsx              # Report view (HTML)
    md/route.ts           # Markdown download
    html/route.ts         # HTML download
    pdf/route.ts          # PDF download
  page.tsx                # Home (upload + recent list)
  UploadForm.tsx          # Client component for the home form
lib/
  parsers/                # One file per recognized export type + dispatcher
  metrics/compute.ts      # Pure function: datasets + range -> metrics
  metrics/matchStage.ts   # Fuzzy stage matcher
  render/templated.ts     # Markdown template
  render/html.ts          # Markdown -> HTML
  render/pdf.tsx          # @react-pdf/renderer document
  render/narrative.ts     # OpenAI rewrite
  db/                     # Prisma client + snapshot CRUD
  types.ts                # Shared types + constants (HIGH_VALUE_THRESHOLD, STAGE_KEYWORDS)
prisma/schema.prisma
```

## Tweaking the report

- **High-value threshold**: edit `HIGH_VALUE_THRESHOLD` in `lib/types.ts` (default `15000`).
- **Stage keyword lists**: edit `STAGE_KEYWORDS` in `lib/types.ts`.
- **Markdown layout**: edit `lib/render/templated.ts`.
- **PDF layout**: edit `lib/render/pdf.tsx`.
- **OpenAI prompt / model**: edit `lib/render/narrative.ts` (or set `OPENAI_MODEL` env var).

## Notes / caveats

- HubSpot exports do not include a "stage entered at" timestamp, so "deals that **entered** Contract is live in the period" is computed using **Close Date ∈ period** AND stage matches "contract is live". This is the closest available proxy.
- The Google Ads xlsx is a single weekly snapshot (no per-date breakdown). If your selected date range doesn't match the export's period, the report flags it ("Google Ads export period: X" in the header).
- Reports persist computed **metrics** only (not raw rows), keeping Postgres tiny.
