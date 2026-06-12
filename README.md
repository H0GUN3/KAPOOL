# KAPOOL

KAPOOL is a mobile-first Kunsan University carpool service. It provides role-based flows for passengers, drivers, and administrators: ride search, ride registration, reservation approval, ride-request chat, approved ride chat, report handling, and admin operation messaging.

## Tech Stack

- React, Vite, TypeScript, Tailwind CSS
- NestJS, Prisma, PostgreSQL
- Socket.IO for realtime chat
- npm workspaces
- Shared TypeScript contracts in `packages/shared`

## Getting Started

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Apply migrations and seed deterministic local data:

```bash
npm run db:migrate
npm run db:seed
```

Run the API server:

```bash
npm run dev:api
```

Run the web app:

```bash
npm run dev:web
```

The web dev server is fixed to `http://127.0.0.1:5198`. The local PostgreSQL service is exposed on host port `55432`.

## Demo Accounts

Seed data includes demo users for the main roles:

- Passenger: use the passenger quick-login button
- Driver: use the driver quick-login button
- Admin: `admin@kapool.local` / `kapool-local-demo`

## Core Features

- Login with passenger, driver, and admin roles
- Ride browsing, detail view, and date/search filtering
- Driver ride registration and reservation management
- Passenger reservation request and cancellation
- Approved reservation chat rooms
- Ride-request chat rooms for open carpool requests
- Report submission from ride detail context
- Admin report dashboard with status filters and operation chat
- Realtime chat delivery through Socket.IO
- Automatic closing of past rides from API reads

## Project Structure

```txt
.
├── apps/
│   ├── web/                  # React/Vite mobile-first web app
│   │   ├── public/           # Static assets and icons
│   │   └── src/
│   │       ├── App.tsx       # Route/session shell
│   │       ├── components/   # Reusable UI pieces
│   │       ├── lib/          # API wrappers, theme, helpers
│   │       └── screens/      # Login, home, detail, chat, admin, profile flows
│   └── api/                  # NestJS API workspace
│       ├── prisma/           # Prisma schema, migrations, seed
│       ├── src/              # Auth, rides, reservations, chat, reports, admin
│       └── test/             # Jest API specs
├── packages/
│   └── shared/               # Shared DTOs and domain contracts
├── docs/                     # Product, QA, and presentation notes
├── package.json              # Root workspace scripts
├── package-lock.json         # npm workspace lockfile
├── tsconfig.json             # Shared TypeScript base configuration
└── eslint.config.mjs         # Shared ESLint flat config
```

## Useful Commands

```bash
npm run dev:web
npm run dev:api
npm run db:migrate
npm run db:seed
npm run test:api
npm run lint
npm run build
npm run preview:web
```

Workspace-specific checks are also available:

```bash
npm run lint -w @kapool/web
npm run build -w @kapool/web
npm run lint -w @kapool/api
npm run build -w @kapool/api
npm run build -w @kapool/shared
```

## Verification

Before handoff, run the relevant checks for the changed area. For visible web changes, also verify the mobile viewport at `390x844` and confirm there is no horizontal overflow.

For full project confidence, use:

```bash
npm run test:api
npm run lint
npm run build
```

## Notes

- This repository uses npm workspaces, not pnpm or yarn.
- API scripts use the local Docker PostgreSQL default unless `DATABASE_URL` is overridden.
- Shared enum/status values, Prisma enums, API validation arrays, and web shared types should stay synchronized.
- Do not edit generated `dist/` files.
- Do not commit `.env*`, credentials, API keys, or private data.
