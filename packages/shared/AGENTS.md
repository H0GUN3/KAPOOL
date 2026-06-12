# SHARED CONTRACTS KNOWLEDGE BASE

## OVERVIEW

TypeScript contract package for cross-app roles, statuses, DTOs, and frontend-facing domain response shapes.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| All exports | `src/index.ts` | Single contract barrel. |
| Package export behavior | `package.json` | Exports raw `./src/index.ts`; no built `dist` artifact. |
| Type checking | `tsconfig.json` | Extends root strict config. |

## CONVENTIONS

- Keep this package implementation-free: types, constants, DTOs, and serializable domain shapes only.
- Web imports this package broadly; API declares the dependency but currently uses local DTO/body types.
- When changing request/response shapes, update `apps/web/src/lib/api.ts` and relevant screens/components in the same scoped change.
- Keep shared role/status constants synchronized with Prisma enums in `apps/api/prisma/schema.prisma` and API validation arrays.
- Prefer additive contract changes when possible; removing or renaming fields needs coordinated web/API updates.
- Keep UI-only props out of shared contracts.

## ANTI-PATTERNS

- Do not add React, Nest, Prisma, browser, or Node runtime dependencies here.
- Do not move mock data into this package; prototype data belongs in `apps/web/src/lib/theme.ts` until contract needs justify extraction.
- Do not assume API type safety from this package until API source actually imports it.

## VERIFY

```bash
npm run lint -w @kapool/shared
npm run build -w @kapool/shared
npm run build
```

Use the full root build for contract changes because web is the active shared-contract consumer.
