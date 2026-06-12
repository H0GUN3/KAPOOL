# KAPOOL API + DB Visual QA Checklist

Use this checklist after UI changes that should be verified with real API data rather than frontend-only error states.

## Startup

1. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

2. Apply migrations and seed deterministic local data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. Start the API server:

   ```bash
   npm run dev:api
   ```

4. Start the web server in a separate terminal:

   ```bash
   npm run dev:web
   ```

## Accounts

- Passenger: `passenger@kapool.local` / `kapool-local-demo`
- Driver: `driver@kapool.local` / `kapool-local-demo`
- Admin: `admin@kapool.local` / `kapool-local-demo`

## Mobile Viewport

- Primary viewport: `390x844`
- Secondary checks: `375x812`, `430x932`
- Confirm no horizontal page overflow on checked screens.

## Flow Checks

### Login

- Login screen renders without clipped text or horizontal overflow.
- Inputs remain at least `44px` tall.
- Demo login CTA is visually dominant and reachable with thumb-zone layout.
- Invalid login error does not shift layout excessively.

### Home

- API ride list loads from the backend instead of showing only the error state.
- Region/date filters remain tappable and readable.
- Ride cards emphasize route, departure time, seats, driver, and fare.
- Empty/error states remain readable if the API or filters return no rides.
- Bottom navigation remains fixed and does not cover key content.

### Ride Detail

- Selecting a ride opens detail without losing route context.
- Detail hero, map preview, info cards, driver card, reservation CTA, and chat entry stay visually ordered.
- Passenger reservation request feedback is visible and not hidden below the fold.
- Driver account can see reservation management states when seeded data supports it.
- Report panel remains secondary to reservation/chat actions.

### Chat

- Approved/allowed chat room shows pinned ride context, message list, presets, and input bar.
- Denied/error chat state is readable and does not look broken.
- Message bubbles have readable contrast and stable spacing.
- Disabled send/preset states are clearly disabled.

## Browser Checks

- Console warnings/errors are absent except expected backend state during negative tests.
- Network requests to `/rides`, reservations, reports, and chat endpoints hit the intended API URL.
- No new layout shift appears after API data loads.

## Final Verification

- `npm run lint`
- `npm run build`
- Optional: capture screenshots for login, home, detail, and chat at `390x844`.
- Store QA screenshots under a task-specific evidence folder, for example
  `.sisyphus/evidence/api-db-visual-qa/`, instead of the repository root.
