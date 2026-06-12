# WEB APP KNOWLEDGE BASE

## OVERVIEW

React/Vite frontend workspace for the KAPOOL mobile-first prototype.

## STRUCTURE

```txt
apps/web/
├── index.html
├── src/
│   ├── main.tsx       # React + BrowserRouter bootstrap
│   ├── App.tsx        # auth/session, route table, screen switching
│   ├── components/    # reusable UI
│   ├── screens/       # mobile page flows
│   ├── lib/api.ts     # backend fetch wrappers
│   └── lib/theme.ts   # tokens and prototype data
└── vite.config.ts     # React plugin, @ alias to src
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Route/session/screen flow | `src/App.tsx` | Local auth session in `localStorage`; React Router wraps in `main.tsx`. |
| Page-level UI | `src/screens/` | `DetailScreen.tsx`, `RegisterScreen.tsx`, and `ChatScreen.tsx` are dense. |
| Shared UI pieces | `src/components/` | Keep presentational where practical. |
| API integration | `src/lib/api.ts` | One fetch boundary; default base URL is `VITE_API_BASE_URL ?? http://127.0.0.1:3000`. |
| Theme/mock data | `src/lib/theme.ts` | Type domain-shaped mock data with `@kapool/shared`. |
| Global styles | `src/index.css` | Tailwind v4 import; global CSS should stay rare. |

## CONVENTIONS

- Preserve the dark navy + mint KAPOOL visual system and mobile-first layout.
- Put reusable UI in `src/components/`; screen-specific layout/copy stays in `src/screens/`.
- Do not extract helpers/components unless reused or clarifying a real domain concept.
- Keep `App.tsx` screen strings and bottom-nav state aligned when adding or changing screens.
- Use `@kapool/shared` for API/domain payload types; keep UI-only props local.
- Keep temporary prototype data in `src/lib/theme.ts` until a real API/contract split is justified.

## ANTI-PATTERNS

- Do not reintroduce Next.js.
- Do not add another state-management library unless `App.tsx` state is a demonstrated blocker.
- Do not broaden React Router usage just because routing exists; most app screens still switch in memory.
- Do not reference assets directly from `docs/design-drafts/` at runtime.

## VERIFY

```bash
npm run lint -w @kapool/web
npm run build -w @kapool/web
```

For visible UI changes, run browser QA at `390x844`, confirm no horizontal overflow, and check console/network noise.
