# AGENTS.md

## Application

- This is a Next.js App Router / React / TypeScript / Tailwind CSS application.
- Match the organization of `fishjoongo-renewal`: routes in `src/app`, reusable UI in `src/components`, domain/data helpers in `src/lib`.
- The previous Flutter project is archived under `legacy/flutter` for comparison and rollback. Do not use Flutter for the active application.

## Firebase

- Keep the existing Firebase Auth project and Firestore collections: `staff`, `brands`, `fishing_rods`, `quote_records`.
- Only enabled staff can access data. System settings remain restricted to the existing administrator UID.
- Preserve legacy rod price maps and quote snapshots. Purchase prices round down per unit to 1,000 won; sale prices round up per unit before quantity multiplication.
- Equipment categories/products live in `equipment_categories` / `equipment_products`; only enabled staff can read/write them. Never seed production catalogues automatically.
- Quote items are a true rod/equipment union. Only rods have a length; use the common item helpers and preserve legacy records without a kind as rods.
- Equipment option groups and choices are data, not fixed category-specific fields. Keep stable IDs, explicit template merging, and per-quote component/name/price snapshots. Catalogue edits must not reprice existing quotes.
- Equipment direct prices stay exact: negotiated base plus signed component adjustments per unit, multiplied by item quantity once. Unknown reference prices are null, distinct from zero; incomplete reference totals/rates must display as unknown.
- Never replace/import production collections without an explicit user action and a confirmation in the UI.
- Local configuration is supplied through `.env.local`, `FIREBASE_WEB_API_KEY`, or the existing ignored `.vscode/dart_defines.local.json`. Never print or commit actual local credentials.

## Build and verification

- Use Node.js 22 LTS (22.13+) or Node.js 24 LTS.
- Install: `npm ci`
- Develop: `npm run dev`
- Check: `npm run lint && npm run typecheck && npm test && npm run build`
- Browser regression: `npm run test:browser` uses development-only in-memory demo data, never production Firebase writes.
- Keep demo mode disabled in production. The deployment script rejects it.

## Deployment

- Cloudflare Pages project: `fishjoongo-helper`
- Production domain: `https://fishjoongo-helper.pages.dev`
- Production branch: `master`
- Always deploy with `scripts/deploy_pages.sh`.
- Next.js uses static export; deploy the `out` directory. Firebase performs authenticated data access in the browser.
- Do not enable offline-first caching. Keep the Flutter service-worker cleanup so existing users receive the new web app.
- Runtime document IDs use query parameters on fixed routes (`/quotes/detail?id=...`) because Pages static export cannot prebuild arbitrary Firestore IDs.

## UI

- New text inputs must use `Input` / `Textarea` from `src/components/ui.tsx` so mouse and keyboard focus selects all text.
- Use shared formatters in `src/lib/format.ts`; user-facing dates use `Asia/Seoul`.
- Design first for laptop viewports at 1280×720 and 1366×768; keep 390px mobile usable too.
- Use compact horizontal navigation and short panels. Keep totals and the save action visible while editing a quote.
- Quantity Enter moves to the next length; Ctrl/Cmd+Enter applies the rod group. Keep keyboard focus and select-all behavior intact.
