# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-08
**Commit:** 75e972f
**Branch:** main

## OVERVIEW

KAPOOL is a TypeScript npm-workspaces monorepo for a Kunsan University carpool service. It contains a React/Vite mobile-first web app, a NestJS/Prisma/PostgreSQL API, and a shared contract package.

## STRUCTURE

```txt
.
├── apps/web/          # React/Vite frontend workspace
├── apps/api/          # NestJS API, Prisma schema, Jest specs
├── packages/shared/   # Cross-app DTO/domain contracts
├── docs/              # Product/design/QA context
├── package.json       # npm workspace scripts
├── tsconfig.json      # strict shared TS base
└── eslint.config.mjs  # shared flat ESLint config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| App shell, session, route/screen flow | `apps/web/src/App.tsx` | React Router top-level routes plus in-memory screen switching. |
| Reusable web UI | `apps/web/src/components/` | Cards, nav, badges, avatar, map preview. |
| Screen-level web UI | `apps/web/src/screens/` | Mobile page flows; largest hotspot is `DetailScreen.tsx`. |
| Web API calls | `apps/web/src/lib/api.ts` | Central fetch wrappers; typed with `@kapool/shared`. |
| Theme and prototype data | `apps/web/src/lib/theme.ts` | Tokens, mock/domain demo data. |
| API composition root | `apps/api/src/app.module.ts` | Controllers/services are registered centrally. |
| API domains | `apps/api/src/{auth,rides,reservations,chat,reports,admin}/` | Feature folders without Nest feature modules. |
| Prisma schema and seed | `apps/api/prisma/` | PostgreSQL model/enums, migration, deterministic seed. |
| API tests | `apps/api/test/` | Jest specs only; no web test suite exists. |
| Shared contracts | `packages/shared/src/index.ts` | DTOs, statuses, role/domain response types. |
| Visual QA checklist | `docs/api-db-visual-qa-checklist.md` | Mobile viewport and real API UI checks. |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | React function | `apps/web/src/App.tsx` | Root shell with auth session state. |
| `AppShell` | React function | `apps/web/src/App.tsx` | Screen state, bottom nav, React Router routes. |
| `loginWithDemoCredentials` | function | `apps/web/src/lib/api.ts` | Auth API wrapper. |
| `fetchRides` / `fetchRideDetail` / `createRide` | functions | `apps/web/src/lib/api.ts` | Ride API boundary. |
| `fetchReservations` / update helpers | functions | `apps/web/src/lib/api.ts` | Reservation/payment API boundary. |
| `AppModule` | Nest module | `apps/api/src/app.module.ts` | API composition root. |
| `PrismaModule` / `PrismaService` | Nest provider | `apps/api/src/prisma/` | Database access boundary. |
| `AuthSessionDto`, `Ride`, `Reservation`, `Report` | interfaces | `packages/shared/src/index.ts` | Frontend-facing contract shapes. |

## CONVENTIONS

- Use npm workspaces from the repository root; package manager is npm (`package-lock.json` v3), not pnpm/yarn.
- Generated output under any `dist/` is ignored for hierarchy and hand edits.
- Root `npm run build` and `npm run lint` run all workspaces with `--workspaces --if-present`.
- API scripts embed a local default `DATABASE_URL`; local PostgreSQL is Docker Compose service `postgres` on host port `55432`.
- TypeScript is strict. Web uses bundler/React JSX settings; API overrides to CommonJS, Node resolution, decorators, declarations, and `dist` emit.
- ESLint is a shared flat config. API files get Node/Jest globals and disable the React Refresh rule.
- Web alias `@` maps only to `apps/web/src`; both web and API tsconfigs map `@kapool/shared` to shared source.

## ANTI-PATTERNS (THIS PROJECT)

- Do not treat this as a single frontend-only project; it is now a web/API/shared monorepo.
- Do not add Next.js files/dependencies; the web app is React/Vite.
- Do not expand routing, state management, backend scope, or shared contracts without a concrete need. React Router already exists; avoid further route growth unless it solves history/deep-link behavior.
- Do not edit generated `apps/*/dist/` files or derive rules from them.
- Do not commit `.env*`, credentials, API keys, billing data, or private credentials.
- Do not assume API source currently consumes `@kapool/shared`; it declares the dependency but still uses local DTO/body types.

## UNIQUE STYLES

- Preserve KAPOOL’s mobile-first dark navy + mint visual identity and student/campus mobility tone.
- Visible UI work needs browser QA at primary viewport `390x844`; also check no horizontal overflow.
- Design draft artifacts in `docs/design-drafts/` are not runtime assets. Move approved assets into `apps/web` before use.

## COMMANDS

```bash
npm install
npm run dev:web
docker compose up -d postgres
npm run dev:api
npm run db:migrate
npm run db:seed
npm run test:api
npm run lint
npm run build
npm run preview:web
```

## NOTES

- There is no root `test` script; automated tests currently mean `npm run test:api`.
- There is no committed Playwright/Cypress/Vitest web suite. Use manual browser QA for visible UI changes.
- Shared enum/status values, Prisma enums, API validation arrays, and web shared types must stay synchronized when contracts change.
- Existing README mentions React Router as a future addition, but code already uses React Router for `/login`, `/app`, `/admin`.
