# KAPOOL UI Design Pass

## Scope

- Mobile primary flow polish for `login -> home -> ride detail -> chat`
- Project root: `/home/gnho1236/projects/Network`
- Frontend root: `/home/gnho1236/projects/Network/apps/web`

## Direction

- Visual direction: `Campus Transit Pocketbook`
- Preserve the existing dark navy + mint identity
- Emphasize practical, student-first campus mobility flow over generic SaaS styling
- Improve hierarchy, card polish, CTA clarity, spacing, and chat readability without changing routing or API behavior

## Changed Files

- `/home/gnho1236/projects/Network/apps/web/src/lib/theme.ts`
- `/home/gnho1236/projects/Network/apps/web/src/screens/LoginScreen.tsx`
- `/home/gnho1236/projects/Network/apps/web/src/screens/HomeScreen.tsx`
- `/home/gnho1236/projects/Network/apps/web/src/screens/DetailScreen.tsx`
- `/home/gnho1236/projects/Network/apps/web/src/screens/ChatScreen.tsx`
- `/home/gnho1236/projects/Network/apps/web/src/components/RideCard.tsx`
- `/home/gnho1236/projects/Network/apps/web/src/components/DemoNotice.tsx`

## What Changed

- Extended theme tokens for stronger card, border, CTA, and shadow consistency
- Refined login hero copy, spacing, input surfaces, and primary CTA hierarchy
- Improved home header, filter/date strip rhythm, ride list framing, and card readability
- Polished `RideCard` with better route emphasis, timing chips, stronger card surface, and keyboard/focus accessibility
- Improved detail screen hierarchy, CTA surfaces, reservation state cards, and report panel readability
- Improved chat header, pinned ride context, message readability, disabled states, and input ergonomics
- Kept API calls, screen state logic, routing behavior, and mock/prototype structure intact

## Verification

- LSP diagnostics on `apps/web/src`: passed, errors `0`
- `npm run lint`: passed
- `npm run build`: passed
- Playwright mobile sanity check: viewport `390x844`
  - `/login`: renders correctly
  - `/app` home: renders correctly
  - `/app` chat error-state: renders correctly
  - horizontal overflow: not detected in verified screens
  - console warnings: none observed

## Notes

- Browser console showed `ERR_CONNECTION_REFUSED` for `http://127.0.0.1:3000/rides` while checking the frontend alone.
- This was expected because the API server was not running during the frontend-only visual sanity check.
- No frontend runtime errors tied to the UI polish itself were observed.

## Remaining QA

- Run frontend with API server + PostgreSQL together and verify actual ride data flow
- Re-check `ride detail -> chat` flow after selecting a real ride from loaded API data
- Capture screenshots for before/after design review if needed
- Decide whether to add project-local `design-meta` or related skill composition under `.opencode/skills/`
