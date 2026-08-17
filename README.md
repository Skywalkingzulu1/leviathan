# Leviathan — All-in-One Doctor Platform

Prototype merging the best parts of 10 verified open-source doctor pain-point tools into a single platform. Built with **GitHub + Supabase** only.

## Quick Start

### Prerequisites
- Docker Desktop (running)
- Supabase CLI v2.x (`supabase.exe` in PATH)

### Run the stack
```bash
cd leviathan
supabase start       # pulls images, runs migrations, seeds data
```

### Serve the frontend
```bash
# Option A: Python
python -m http.server 3000

# Option B: Node
npx serve .
```

Open **http://127.0.0.1:3000** in your browser.

### Login
- **Email:** `demo@leviathan.health`
- **Password:** `demo-password`

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | Static HTML/CSS/JS (dark tabbed SPA) |
| API | Supabase (PostgREST + Kong gateway) |
| Auth | GoTrue (email/password) |
| Database | PostgreSQL 17 with RLS |
| Edge Functions | Deno (ai-scribe, burnout-score) |
| Local Dev | Docker Compose via `supabase start` |

## 10 Modules

| # | Module | Source Tool | Tables | Edge Function |
|---|--------|-------------|--------|---------------|
| 1 | Wellbeing & Burnout | healthcare-burnout-platform | `wellbeing_checkins` | `burnout-score` |
| 2 | Billing & Claims | OpenEMR | `claims` | — |
| 3 | Finance & Loans | Firefly III | `transactions`, `loans` | — |
| 4 | Telemedicine | OpenTera | `consultations` | — |
| 5 | Charting / EHR | GNUmed / EHRbase | `patients`, `visits` | — |
| 6 | Roster & Staffing | ecc-sheet | `shifts` | — |
| 7 | Risk & Legal | j-lawyer-org | `legal_cases` | — |
| 8 | Practice Operations | GNUmed | `appointments`, `practice_kpis` | — |
| 9 | AI Scribe | OpenScribe | `scribe_jobs` | `ai-scribe` |
| 10 | Overflow / Referrals | DHIS2 concept | `referrals` | — |

## Database

- **14 tables** across 10 modules, all with row-level security (RLS)
- Every table is scoped to the authenticated user (`auth.uid() = user_id`)
- Seed data: realistic demo records for all modules
- Migrations in `supabase/migrations/`

## Edge Functions

### `burnout-score`
Calculates a 0-100 burnout score from recent wellbeing check-ins.
```
POST /functions/v1/burnout-score
Headers: Authorization: Bearer <jwt>
Response: { score: 43, level: "medium", checkins: 4, ... }
```

### `ai-scribe`
Generates a mock SOAP note from a transcript (replace with real LLM for production).
```
POST /functions/v1/ai-scribe
Body: { "transcript": "...", "patient_name": "..." }
Response: { job: {...}, note: "SUBJECTIVE\n..." }
```

## Local Ports

| Service | URL |
|---------|-----|
| API Gateway | http://127.0.0.1:54321 |
| PostgreSQL | 127.0.0.1:54322 |
| Studio | http://127.0.0.1:54323 |
| Mailpit | http://127.0.0.1:54324 |
| Frontend | http://127.0.0.1:3000 |

## Reset & Re-seed
```bash
supabase db reset     # drops + recreates DB, runs all migrations + seed
```

## What's Next
- Deploy to hosted Supabase + GitHub Pages
- Wire real LLM API for ai-scribe (OpenAI/Anthropic key)
- Add WebSocket subscriptions for real-time roster
- Reddit DM outreach using `forums/reddit-analysis.json` prospects
