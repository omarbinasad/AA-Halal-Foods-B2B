@AGENTS.md

# b2b-commerce — project guide

Next.js (App Router, TypeScript, Tailwind v4) frontend for a B2B wholesale store. Mock defaults: Bangladesh, BDT (৳), Asia/Dhaka
(configurable in `src/config/site.ts`). Product origin (e.g. Japan) is a product field, separate from the store location.
The backend (Laravel or Django) is not chosen yet; all data currently comes from mock repositories.

## Where things live
- `src/app/(store)` public storefront · `src/app/(auth)` login/register · `src/app/account` customer portal · `src/app/admin` admin panel
- `src/config/site.ts` brand name, logo, contact, navigation — the only place for branding
- `src/config/storefront.ts` Home copy and image paths (null → labelled placeholder; files go in /public/images) · `src/components/storefront` Home sections · `src/app/(store)/(pages)` route group gives non-Home store pages their container (URLs unchanged)
- `public/brand` logo/brand marks · `public/images` fixed site images · product photos come from the backend media host — the only exception is the development import below (`public/images/products`, `public/images/categories`)
- `scripts/import-woocommerce.ts` (`npm run import:woocommerce`) development import from the old WooCommerce store → `src/lib/data/fixtures/woocommerce-catalog.json` + local images + `docs/woocommerce-import-report.md`; credentials only in git-ignored `.env.local`; the app and builds never contact WordPress · `src/lib/html/sanitize.ts` allowlist sanitizer for imported HTML
- `src/app/globals.css` design tokens (colors, radius, charts) as CSS variables, light + `[data-theme="dark"]`; theme script + toggle in `src/components/ui/theme*.tsx`
- `src/components/ui` shared primitives · `src/components/layout` area navigation · `src/components/<feature>` feature UI
- `src/lib/types` domain types · `src/lib/data/mock` mock records · `src/lib/data/repositories` interfaces + implementations
- `src/lib/auth/session.ts` mock viewer (NOT real auth)
- `src/lib/validation` shared form/"server" validation · `src/app/admin/*/actions.ts` server actions (the only write path; they call repositories)
- `src/lib/orders` pure order money calc (integer paisa, half-up) + status flow, shared by mock data and admin previews; covered by `npm test` (`tests/*.test.ts`, Node test runner)
- `src/lib/pricing/engine.ts` pure B2B price/quantity rule engine (documented precedence, paisa math); the reference the backend must match — tested in `tests/pricing-engine.test.ts`
- `src/lib/shipping/engine.ts` pure shipping zone matching + rate calculation (sample rates in mock data) — tested in `tests/shipping-engine.test.ts`
- `src/lib/tax/engine.ts` pure tax rate matching + calculation (fictional demo rates; orders store tax snapshots) — tested in `tests/tax-engine.test.ts`
- `src/lib/payments/methods.ts` payment method availability/validation (settings only — no processing, no secrets) — tested in `tests/payment-methods.test.ts`
- Demo editing: the mock catalog, orders, customers, rules, settings, shipping zones, tax and payment methods are in-memory stores on `globalThis` (not reliable on Vercel serverless — see docs/backend-api.md §7) — label any editable screen with `DemoEditingNotice`
- `docs/backend-api.md` backend API contract — update it when types or repository interfaces change
- `docs/FEATURE_SCOPE.md` feature inventory and status — update statuses when a feature changes; a screen alone is not "done"

## Rules
- Build one requested feature at a time; avoid unrelated changes.
- Follow the existing structure and reuse existing components before adding new ones.
- Keep the frontend independent of the future Laravel/Django backend: pages call repositories (`@/lib/data`), never mock files or fetch URLs directly.
- Use TypeScript types from `@/lib/types`; format money/dates only via `@/lib/format`.
- Never calculate prices, taxes or shipping in UI components; those are backend rules (mock logic stays in `src/lib/data/mock`). The only exception: clearly labelled admin previews may call the shared pure engines in `src/lib/orders`, `src/lib/pricing`, `src/lib/shipping` and `src/lib/tax`.
- Use color tokens (never hard-coded colors) so light and dark mode both work.
- Server Components by default; add `"use client"` only to small interactive leaves, never to whole pages or layouts.
- Keep product lists paginated and filtered server-side; never send the entire catalog to the browser.
- Every listing uses `ListToolbar` + `SortHeader` (`src/components/ui/list-controls.tsx`) + `Pagination`, parses params with `src/lib/list-params.ts`, and passes them to a repository `ListQuery` — no client-side filtering.
- Use `next/image` with `sizes` for product images; no base64 product images.
- Never publicly cache customer-specific prices, orders, or account data.
- Mobile-first; check layouts at 430px width.
- Never present mock authentication, payment, or order submission as real functionality.
- Keep admin-only code under `src/app/admin` / `src/components/admin` so it never loads on public pages.
- Do not add any real company name to code, metadata, docs, or placeholder content.
- Never present a tax rate as the current legal rate; demo rates must be labelled fictional. Tax stays off by default.
- Never collect card data, store gateway secrets in client code/browser storage, process payments, or mark orders paid on method selection.
- For multi-file changes make a brief plan; for simple changes work directly.
- Inspect only relevant files, run relevant checks (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`), report results concisely.
