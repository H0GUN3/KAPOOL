# KAPOOL Design Draft Lab

This folder is the design experiment space for GPT image model drafts and related review notes.

Use it to explore visual directions before changing the actual React/Vite app. Drafts in this folder are not production UI, runtime assets, or implementation requirements until they are explicitly selected and translated into a handoff.

## Purpose

- Generate and compare KAPOOL design proposals without mixing draft assets into app code.
- Preserve the prompt, output, and decision history behind each design direction.
- Convert an approved image draft into concrete implementation notes for `apps/web/src`.
- Keep the current mobile-first KAPOOL identity: dark navy, mint accents, practical campus mobility, and student-first clarity.

## Recommended Batch Structure

Create one folder per design exploration batch:

```txt
docs/design-drafts/
└── 2026-05-home-refresh/
    ├── brief.md
    ├── prompts/
    │   ├── v001.md
    │   └── v002.md
    ├── outputs/
    │   ├── v001-a.png
    │   └── v002-a.png
    ├── reviews/
    │   └── selection.md
    └── handoff.md
```

## Workflow

1. Write `brief.md` before generating images.
   - Target screen or component
   - User goal and product context
   - Required states, such as default, empty, loading, or error
   - Visual constraints, such as mobile viewport and KAPOOL color direction
   - Non-goals, such as no new routing, backend, or state-management assumptions

2. Save every image prompt under `prompts/`.
   - Record the model, date, image size or aspect ratio, and full prompt text.
   - Note what changed from the previous prompt version.
   - Do not store API keys, `.env` values, billing data, or private credentials.

3. Save generated candidates under `outputs/`.
   - Use stable names such as `v001-a.png`, `v001-b.png`, and `v002-a.png`.
   - Treat these images as review artifacts, not app assets.

4. Select a candidate in `reviews/selection.md`.
   - Explain which draft was selected and why.
   - Record rejected candidates and the reason they were not chosen.
   - Prefer product fit, implementation fit, accessibility, and existing KAPOOL identity over visual polish alone.

5. Translate the selected draft into `handoff.md`.
   - List what should be adopted.
   - List what should not be adopted.
   - Map the change to likely implementation targets.
   - Define verification steps before the design is considered implemented.

## Adoption Rules

- Full screen concepts map to `apps/web/src/screens/`.
- Reusable cards, badges, navigation, inputs, and layout pieces map to `apps/web/src/components/`.
- Colors, shadows, radius, spacing, and shared prototype tokens map to `apps/web/src/lib/theme.ts`.
- Global CSS changes should be rare and map to `apps/web/src/index.css` only when theme or component-level styles are not enough.
- Runtime image assets should move into the web app only after approval. Do not point app code directly at draft images in this folder.

## Review Criteria

- Does the draft support the KAPOOL user task clearly?
- Does it preserve the mobile-first dark navy and mint visual identity?
- Can it be implemented with the current React/Vite structure?
- Does it avoid implying new backend, routing, or state-management work?
- Are text contrast, touch targets, and information hierarchy likely to pass mobile QA?
- Is the design specific to campus carpooling instead of generic SaaS styling?

## Implementation Verification

After an approved draft is implemented in app code, run the normal project checks:

```bash
npm run lint
npm run build
```

For visible UI changes, also perform browser QA with the primary mobile viewport `390x844` and confirm there is no horizontal overflow.
