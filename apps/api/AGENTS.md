# API KNOWLEDGE BASE

## OVERVIEW

NestJS API workspace with Prisma/PostgreSQL persistence, JWT-like demo auth, HTTP endpoints, WebSocket chat, and Jest integration-style specs.

## STRUCTURE

```txt
apps/api/
├── src/main.ts          # Nest bootstrap, listens on PORT or 3000
├── src/app.module.ts    # central controller/service registration
├── src/auth/            # login, token, guard, roles
├── src/rides/           # ride list/detail/create
├── src/reservations/    # reservation state + settlement payment flows
├── src/chat/            # chat HTTP + Socket.IO gateway
├── src/reports/         # report creation and context checks
├── src/admin/           # admin report review endpoints
├── src/prisma/          # PrismaModule/PrismaService
├── prisma/              # schema, migration, seed
└── test/                # Jest specs
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API composition | `src/app.module.ts` | Feature controllers/services are wired centrally, not as feature modules. |
| Database model | `prisma/schema.prisma` | Source of persisted enums/models. |
| Deterministic local data | `prisma/seed.ts` | Demo accounts and seeded domain state. |
| Auth and roles | `src/auth/` | `AuthGuard`, `@Roles`, token payloads. |
| Dense reservation logic | `src/reservations/reservations.service.ts` | Status transitions, seat mutation, payments, access checks. |
| Dense report logic | `src/reports/reports.service.ts` | Context authorization and admin detail shaping. |
| Realtime chat | `src/chat/chat.gateway.ts` | Socket.IO events and room behavior. |
| API tests | `test/*.spec.ts` | Jest + `@nestjs/testing` + `supertest`; chat uses `socket.io-client`. |

## CONVENTIONS

- API commands set a default local `DATABASE_URL`; start PostgreSQL with `docker compose up -d postgres` when DB behavior matters.
- Prisma schema reads `env("DATABASE_URL")`; local Docker host port is `55432`.
- Keep controller methods thin; domain checks and response shaping live in services.
- Keep Prisma response mappers close to the service that owns the endpoint.
- If changing enum/status values, synchronize Prisma schema, local validation arrays, `packages/shared`, and web usage.
- `@kapool/shared` is configured but not currently imported by API source. Migrate intentionally; do not assume shared types already enforce API contracts.

## ANTI-PATTERNS

- Do not create feature modules casually; the current API is centralized in `AppModule`.
- Do not bypass `AuthGuard`/role checks for protected ride, reservation, chat, report, or admin flows.
- Do not edit `dist/` output.
- Do not run migrations or seed against a non-local database unless explicitly requested.

## VERIFY

```bash
docker compose up -d postgres
npm run test:api
npm run lint -w @kapool/api
npm run build -w @kapool/api
```

For code changes, run the closest affected API spec when practical; root `npm run test:api` runs the whole API suite.
