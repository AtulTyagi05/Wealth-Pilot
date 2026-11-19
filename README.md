# Wealth Pilot — Smart Salary & Wealth Planner

A personal finance planner that answers: *"I earn ₹1 lakh a month. Exactly how should I divide it?"*

**Status: Phases 1–5 complete — accounts, encrypted PostgreSQL storage, and a Claude-powered assistant.**

## Run

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL, WP_DATA_KEYS (npm run gen:key) and ANTHROPIC_API_KEY
npm run db:migrate           # creates the tables
npm run dev                  # http://localhost:3000
npm test                     # unit tests (finance engine + crypto)
npm run test:api             # end-to-end auth/storage checks against a running server (set BASE_URL, DATABASE_URL)
npm run build                # production build
```

Every server feature is optional: without `DATABASE_URL` the app runs device-only (no accounts), and without `ANTHROPIC_API_KEY` the assistant uses its built-in calculator.

Click **"Try with a ₹1 lakh sample"** on the welcome screen to explore with demo data.

## Features

| Page | What it does |
|---|---|
| Onboarding | 4-step wizard (profile, income, savings & loans, goals & risk) with validation |
| Dashboard | Income, expenses, savings, investing, net worth, emergency & retirement progress, health score, charts |
| Salary Planner | The core feature: an exact split of salary into essentials / emergency fund / investments / guilt-free spending, plus where to invest it |
| Expenses | Add, edit and delete categories; essential vs lifestyle; overspending insights compared with benchmarks |
| Investments | India-specific plan (Index/Flexi/Mid-small MF SIPs, PPF, EPF/VPF, NPS, Debt, FD/RD, Gold) with the reasons, tax, liquidity, risk and projections; SIP calculator with "what if +₹2,000"; editable return assumptions |
| Retirement | Corpus needed, monthly SIP required, projected wealth, conservative/moderate/aggressive scenarios, the assumptions explained |
| AI Assistant | Claude-powered chat that answers with your own numbers via calculation tools; falls back to a built-in calculator when no API key is set |
| Reports | Monthly / yearly / custom ranges, trend charts, PDF and Excel export |
| Profile | Edit everything, load sample data, reset |

Dark and light themes, layouts for phone and desktop, and disclaimers throughout.

## Architecture

```
src/
  lib/
    types.ts               domain model
    locale/countries.ts    country config (India supported; others scaffolded)
    finance/               pure, tested calculation engine (no React)
      budget.ts            expense summary, salary plan, spending insights
      investments.ts       instrument catalogue (India) + portfolio recommender
      sip.ts               SIP / step-up / required-SIP maths
      retirement.ts        corpus & retirement projection, scenarios
      health.ts            financial health score
      overview.ts          single aggregator used by every page
    assistant/engine.ts    AssistantProvider interface + local provider
    reports/export.ts      PDF (jsPDF) & XLSX (write-excel-file) export
    validation.ts
  store/                   Zustand stores (app data persisted locally; session state in memory)
  server/                  server-only: database, auth, encryption, rate limits
  components/ui|charts|layout|profile|onboarding
  app/                     Next.js App Router pages
```

To support another country, add its instruments and tax notes alongside `INDIA_INSTRUMENTS` and mark it `supported` in `countries.ts`.

## AI assistant (Phase 4)

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`, then restart `npm run dev`. Without a key the chat runs in **Offline mode** using the built-in calculator.

How it works:

1. The browser posts the conversation plus the raw planning inputs (profile without the name, expenses, assumptions) to `POST /api/assistant`.
2. The route validates them with Zod, enforces a size limit and a per-IP rate limit, and **recomputes every figure server-side** with the same finance engine the screens use.
3. It calls Claude (`claude-opus-5-5`, effort `medium`) through the SDK's tool runner with four calculation tools: `project_sip`, `retirement_plan`, `salary_plan` and `investment_allocation`. The model calls these instead of doing arithmetic, so its numbers match the app.
4. Text and tool activity stream back to the browser as newline-delimited JSON.

Privacy and safety choices: the API key stays on the server; the user's name is never sent; no server-side message thread is used (`thread: false`), so the full history is sent each turn and no conversation state is held between requests; nothing about the user is logged; server-side refusal fallbacks are on (`fallbacks: "default"`); and the system prompt treats snapshot data as data, not instructions.

Code: `src/app/api/assistant/route.ts`, `src/lib/assistant/{schema,remote}.ts`, `src/lib/assistant/llm/{prompt,tools,rateLimit}.ts`.

## Accounts and storage (Phase 5)

Users can keep using the app without an account (data stays in the browser), or create one to save their plan and use it on several devices. Signing up uploads the plan already on the device; logging in on a new device downloads it.

| Concern | How it's handled |
|---|---|
| Passwords | scrypt (N=2¹⁷, r=8, p=1) with a random salt per password. At least 10 characters. Login spends one hash check even for unknown emails, so timing doesn't reveal which emails are registered, and errors are generic. |
| Sessions | 256-bit random token in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed and `Secure` in production). Only the token's SHA-256 is stored. 30-day expiry, deleted on logout. Changing the password signs out every other device. |
| CSRF | Every state-changing request must carry an `Origin` that matches the server; JSON bodies only. |
| Financial data | Stored as one AES-256-GCM ciphertext per user. The user id is bound in as additional authenticated data, so rows can't be swapped between users. Keys are versioned (`WP_DATA_KEYS`), so they can be rotated without re-encrypting everything at once. The database never sees plaintext amounts. |
| Validation | Every request body is checked with Zod and capped in size. |
| Brute force | Rate limits on sign-up, login (per network and per account), password change, account deletion, saves and the AI assistant. |
| Multiple devices | Each save carries the version it was based on. If another device saved first, the server returns 409 with the latest copy, which the app adopts. |
| User rights | Export everything as JSON; delete the account (password required), which removes all rows. |
| AI cost control | With accounts enabled, only signed-in users can use the paid model; limits are per user. |

Tables: `users`, `sessions`, `financial_data` (see `db/migrations/001_init.sql`). Code: `src/server/` (`crypto.ts`, `auth.ts`, `financialData.ts`, `db.ts`, `rateLimit.ts`), `src/app/api/{auth,data,account}/`, and the browser side in `src/components/layout/SyncManager.tsx`, `src/lib/api/account.ts` and `src/components/auth/`.

**Production checklist:** serve over HTTPS; keep `WP_DATA_KEYS` in a secrets manager and back it up (losing it makes stored data unreadable); use TLS to the database; move rate limits to a shared store such as Redis when running more than one server; add email verification and password reset (needs an email provider); review the privacy policy, since in AI mode financial details are sent to Anthropic.

## Roadmap

- Email verification and password reset
- Support for other countries (instruments and tax rules per country)

## Disclaimer

Educational estimates only. This is not regulated investment, tax or legal advice. Returns are assumptions and are not guaranteed.
