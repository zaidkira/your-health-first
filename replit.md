# My Health First

A full-stack healthcare platform for Algeria with medication tracking/reminders, medical records storage, doctor appointment booking, pharmacy/medicine search, and family member management.

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env vars: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite (port 25558, path `/`)
- **Backend**: Express 5 + pino (port 8080, path `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: HMAC-SHA256 JWT (no external library), token in localStorage
- **API codegen**: Orval → React Query hooks + Zod schemas
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **UI**: shadcn/ui components, Tailwind CSS, healthcare theme (sky blue primary)
- **Node.js**: 24 | **TypeScript**: 5.9

## Where things live

- `artifacts/my-health-first/` — React+Vite frontend
  - `src/pages/` — login, register, dashboard, medications, records, doctors, appointments, pharmacies, family
  - `src/components/layout/AppLayout.tsx` — sidebar navigation
  - `src/lib/auth.tsx` — AuthProvider (localStorage-based)
  - `src/index.css` — healthcare CSS theme variables
- `artifacts/api-server/` — Express API
  - `src/routes/` — auth, dashboard, medications, records, shared_records, conditions, doctors, appointments, pharmacies, family
  - `src/lib/auth.ts` — HMAC JWT + password hashing
- `lib/db/src/schema/` — Drizzle schema files (all tables)
- `lib/api-spec/` — OpenAPI spec (source of truth for codegen)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/api-client-react/src/generated/` — generated React Query hooks

## Architecture decisions

- Contract-first: OpenAPI spec → codegen → Zod schemas + React Query hooks used on both client and server
- JWT auth via HMAC-SHA256 (no external jwt library); token stored in localStorage, injected by `custom-fetch.ts`
- `AuthProvider` does NOT use `useLocation` to avoid wouter context issues; redirect handled in route components
- `lib/api-zod/src/index.ts` only exports `./generated/api` — do not add other exports (codegen regenerates the barrel)
- Pharmacies store medicine inventory as JSON column (`medicines_json`), parsed at query time

## Product

- Register/login with Algerian wilaya selection
- Dashboard: today's medication schedule, upcoming appointments, summary stats
- Medications: add/delete/mark-taken with time-based reminders, family member assignment
- Medical Records: store prescriptions, lab tests, scans with optional file URLs; share records with any doctor; patient sees "Sent" tab; doctor sees "Received" tab
- Chronic Conditions: add/edit/delete chronic illnesses with severity, year diagnosed, and notes
- Doctors: browse 8+ Algerian doctors by specialty/wilaya, book appointments directly
- Appointments: view upcoming/past, mark complete or cancel
- Pharmacies: search 4+ Algerian pharmacies by medicine name or wilaya
- Family: add/edit/delete family members with blood type, health notes, and group labels (filter by group)

## Gotchas

- Do not run `pnpm dev` at root; use workflow restart
- Orval `indexFiles: false` — do not add a `schemas` option or extra barrel exports
- API routes must handle their full `/api/...` base path (proxy does not rewrite)
- `pnpm --filter @workspace/db run push` must be run after schema changes
