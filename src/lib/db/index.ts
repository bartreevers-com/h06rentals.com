import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

/**
 * Database driver selection:
 *  - DATABASE_URL set (production / Supabase / any Postgres) → postgres-js
 *  - otherwise (local dev & QA) → PGlite, persisted to .data/pglite
 * Both are real Postgres semantics, so dev and prod behave identically.
 */

type Db = import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  h06db?: Promise<Db>;
};

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 5, prepare: false });
    const db = drizzle(client, { schema }) as Db;
    await ensureSchema(db);
    await seedIfEmpty(db);
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const fs = await import("fs");
  const path = await import("path");
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema }) as unknown as Db;
  await ensureSchema(db);
  await seedIfEmpty(db);
  return db;
}

/** Idempotent DDL so the app self-provisions on first boot. */
async function ensureSchema(db: Db) {
  const { sql } = await import("drizzle-orm");
  const statements = DDL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }
}

export function getDb(): Promise<Db> {
  if (!globalForDb.h06db) {
    globalForDb.h06db = createDb();
  }
  return globalForDb.h06db;
}

const DDL = `
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'core',
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]',
  seats INTEGER NOT NULL DEFAULT 5,
  baggage_capacity INTEGER NOT NULL DEFAULT 4,
  excess_luggage_charge INTEGER NOT NULL DEFAULT 10000,
  best_for JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  frames_360 JSONB NOT NULL DEFAULT '[]',
  interior_images JSONB NOT NULL DEFAULT '[]',
  gallery JSONB NOT NULL DEFAULT '[]',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vehicle_rates (
  id SERIAL PRIMARY KEY,
  vehicle_slug TEXT NOT NULL UNIQUE,
  airport_transfer INTEGER NOT NULL,
  twelve_hours INTEGER NOT NULL,
  twenty_four_hours INTEGER NOT NULL,
  multi_day_daily INTEGER NOT NULL,
  interstate_base INTEGER NOT NULL,
  interstate_chauffeur INTEGER NOT NULL DEFAULT 80000,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS add_ons (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_ngn INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100
);
CREATE TABLE IF NOT EXISTS interstate_surcharges (
  id SERIAL PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  surcharge NUMERIC(4,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  trip_type TEXT NOT NULL,
  vehicle_slug TEXT,
  vehicle_name TEXT,
  chauffeur_tier TEXT,
  pickup_location TEXT NOT NULL,
  destination TEXT,
  destination_state TEXT,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL,
  return_date TEXT,
  num_days INTEGER NOT NULL DEFAULT 1,
  passengers INTEGER NOT NULL DEFAULT 1,
  luggage INTEGER NOT NULL DEFAULT 0,
  flight_number TEXT,
  notes TEXT,
  add_ons JSONB NOT NULL DEFAULT '[]',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  quote_total INTEGER NOT NULL DEFAULT 0,
  quote_breakdown JSONB NOT NULL DEFAULT '[]',
  is_estimate BOOLEAN NOT NULL DEFAULT FALSE,
  payment_option TEXT NOT NULL DEFAULT 'pay_later',
  amount_due INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amount_ngn INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT,
  paid_at TIMESTAMP,
  raw JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_slug TEXT,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS email_log (
  id SERIAL PRIMARY KEY,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_driver_id INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_started_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_completed_at TIMESTAMP;
CREATE TABLE IF NOT EXISTS kpis (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  cadence TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  weight INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS kpi_scores (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER NOT NULL,
  period_date TEXT NOT NULL,
  achieved INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  recorded_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (kpi_id, period_date)
);
CREATE TABLE IF NOT EXISTS email_list (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'booking',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;
