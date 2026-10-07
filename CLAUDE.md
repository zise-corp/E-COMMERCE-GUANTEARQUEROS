# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Guante Arqueros Bolivia: public store + admin panel in a single Next.js 15 (App Router, React 19, strict TS) app. Drizzle ORM over PostgreSQL (postgres.js), Tailwind 3, ImageKit for images, YoPago for payments (QR + card). All UI copy, code comments and commit messages are in Spanish; currency is BOB. `README.md` is the authoritative long-form spec (checkout contract, security model, deployment) — read the relevant section before touching checkout, payments or auth. `INTEGRACION_PAGOS.md` covers the open issues with YoPago.

## Commands

```bash
npm run dev              # next dev --turbopack (output in .next-dev; prod build uses .next)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint via scripts/run-lint.mjs
npm run verify:sql       # applies all drizzle/ migrations to embedded PGlite and checks tables
npm run verify:checkout  # sessions, quotes, idempotency, YoPago callback, stock — on PGlite
npm run build
npm run clean            # delete .next and .next-dev
npm run db:generate -- --name <nombre>   # new migration from src/db/schema.ts
```

There is no test framework; `verify:sql` and `verify:checkout` are single assertion scripts (no per-test filter) that run on in-memory PGlite and never read `.env.local`. CI (`.github/workflows/ci.yml`) runs typecheck → lint → verify:sql → verify:checkout → build. A push to `main` auto-deploys to the VPS (`deploy.yml`, Docker Compose + Traefik, then `scripts/smoke-vps.mjs`).

**`.env.local` points at the real Supabase database.** Do not run `db:migrate`, `db:push`, `db:seed`, `admin:create` or any write against it unless explicitly asked. Migrations are never run as part of build or deploy.

## Architecture

- **Routes**: `src/app/(shop)/` is the storefront (`/{categoria}`, `/{categoria}/{sub}`, `/p/{slug}`, `/drei`, `/checkout/*`; legacy `/c/*` redirects). `src/app/admin/` is the panel; all admin writes are server actions in `src/app/admin/actions.ts`. `src/app/api/` holds search, cart refresh, discounts, orders/quote and payment endpoints.
- **Data layer**: `src/db/schema.ts` (all tables), `src/db/queries/*` (catalog, orders, payments, settings, auth, admin). `src/db/index.ts` exports a lazy `db` Proxy with a single global pool (small `max` because the Supabase pooler allows ~15 sessions; `prepare: false` for pgbouncer). Public reads are wrapped in `withFallback(...)` so the store renders empty instead of erroring; admin reads/writes and checkout must **not** use it — errors must surface.
- **Caching**: public catalog reads use Next's data cache tagged `PUBLIC_CATALOG_CACHE_TAG` (`src/lib/cache-tags.ts`) with 5‑minute ISR. Any admin write to categories/brands/products, and the YoPago callback when it decrements stock, must call `revalidateTag(PUBLIC_CATALOG_CACHE_TAG)`.
- **Auth/sessions** (`src/lib/session.ts`, `src/lib/admin-auth.ts`): HMAC-signed tokens with a `kind` purpose (`admin` | `order` | `quote`) that is verified on read. `src/middleware.ts` is only a first gate for `/admin/*`; every admin page/action must also call `requireAdmin()` (or `requireSuperAdmin()`), which re-checks user, role and session `version` against the DB. Role `superadmin` is confined to `/admin/superadmin` and can only reset the `admin` password.
- **Checkout flow**: cart in localStorage, active order per tab in sessionStorage. `POST /api/orders/quote` computes prices/stock/shipping/discount server-side and returns a signed 10‑minute quote (`src/lib/checkout-quote.ts`); `POST/PATCH /api/orders` require that quote plus an idempotency UUID and freeze amounts on the order. The `gq_order` cookie authorizes up to 10 orders; payment/confirmation pages require `?pedido=ID` owned by that cookie.
- **Payments** (`src/lib/yopago.ts`, `src/db/queries/payments.ts`): a `payment_attempts` row is persisted before calling YoPago (outside the DB transaction); callbacks (`/api/checkout/callback`, legacy `/api/payments/yopago/webhook`) authenticate headers, log to `payment_events`, decrement stock once, and mark `paid_inventory_review` when paid but out of stock. `/checkout/result` never confirms a payment. Charges only happen with `YOPAGO_MODE=live`; there is no simulator.
- **Money**: Postgres `numeric` comes back as strings. Use `src/lib/money.ts` (`formatBs`, `toDbNumeric`); round in cents; never `parseFloat` for values that get stored.
- **Validation**: zod schemas live in `src/lib/validators.ts` and are shared by API routes, server actions and the verify scripts.
- **Scripts outside Next** (`tsx`) must `import "@/lib/load-env"` first to load `.env.local`.
- Stock is per product, not per size. "Ofertas" and "Nuevos" are computed, protected system categories (`SYSTEM_CATEGORY_SLUGS` in `src/lib/slug.ts`).
- `referencias/handoff/` contains historical design prototypes; code is the source of truth. `netlify.toml` is legacy and unused.
