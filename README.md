# H06 Rentals — Luxury Showroom & Booking Platform

A full-stack rebuild of [h06rentals.com](https://www.h06rentals.com): an immersive digital
showroom, instant-quote booking engine, secure payments, WhatsApp concierge handoff, and an
operations dashboard for the H06 team.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS 4** — emerald/charcoal/bronze design system built from the H06 brand marks
- **Framer Motion** — restrained, premium motion
- **Drizzle ORM + Postgres** — Supabase (or any Postgres) in production, embedded PGlite locally
- **Paystack** — server-side initialisation + HMAC-verified webhooks; labelled mock gateway until keys are added
- **Resend** — email confirmations (logged to `email_log` until keys are added)

## Running locally

```bash
npm install
npm run dev        # embedded Postgres (PGlite) at .data/ — zero setup
```

The database self-provisions: schema is created and seeded with the live H06 fleet, rates,
add-ons and interstate surcharge card on first boot.

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin — dev password `h06admin`

## Deploying (Vercel + Supabase)

1. Create a Supabase project → copy the **connection string** (URI, pooled).
2. `vercel` (or import the repo in the Vercel dashboard) with env vars:
   - `DATABASE_URL` — the Supabase connection string *(required)*
   - `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` — *(required)*
   - `PAYSTACK_SECRET_KEY` — `sk_test_…` first, `sk_live_…` when ready *(optional — mock checkout until set)*
   - `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` *(optional — emails logged until set)*
   - `NEXT_PUBLIC_SITE_URL` — e.g. `https://www.h06rentals.com`
   - `NEXT_PUBLIC_GA_ID` — e.g. `G-EFVF6QF9RP`
3. Tables and seed data are created automatically on first request.
4. In the Paystack dashboard, point the **webhook URL** to `https://<domain>/api/webhooks/paystack`.

## Architecture notes

- **Quotes are always recomputed server-side** (`src/lib/quote.ts`) — the client's numbers are
  never trusted. Custom-quote items are flagged `isEstimate` and labelled
  *“Estimated quote. Final confirmation by H06 concierge.”*
- **Payments settle idempotently** (`src/lib/payments.ts`) via callback verification *and*
  webhook — whichever lands first wins, duplicates are ignored.
- **360° vehicle assets**: `vehicles.frames_360` accepts an ordered array of frame URLs
  (8+ frames activates drag-to-rotate in `Turntable360`). Until real assets exist, an honest
  blueprint-style silhouette is shown, clearly marked as replaceable.
- **Brand mark system** (`public/brand/`): emerald = primary surfaces, silver/black =
  functional UI + favicons, bronze = VIP wing and payment-success moments only.
