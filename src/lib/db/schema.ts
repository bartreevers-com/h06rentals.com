import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";

/** Fleet vehicles. tier: "core" = instantly bookable with fixed rates,
 *  "vip" = exotic/bespoke, priced by concierge. */
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  year: text("year").notNull(),
  category: text("category").notNull(), // suv | luxury | pickup | exotic | bus
  tier: text("tier").notNull().default("core"), // core | vip
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  seats: integer("seats").notNull().default(5),
  baggageCapacity: integer("baggage_capacity").notNull().default(4),
  excessLuggageCharge: integer("excess_luggage_charge").notNull().default(10000),
  bestFor: jsonb("best_for").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  /** Ordered 360° turntable frame URLs. Empty = 360 assets pending. */
  frames360: jsonb("frames_360").$type<string[]>().notNull().default([]),
  interiorImages: jsonb("interior_images").$type<string[]>().notNull().default([]),
  /** Representative photo gallery shown on the vehicle page (cards keep the
   *  blueprint icons). credit = attribution line for licensed imagery. */
  gallery: jsonb("gallery")
    .$type<{ src: string; credit?: string }[]>()
    .notNull()
    .default([]),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Rates in naira for core-tier vehicles. */
export const vehicleRates = pgTable("vehicle_rates", {
  id: serial("id").primaryKey(),
  vehicleSlug: text("vehicle_slug").notNull().unique(),
  airportTransfer: integer("airport_transfer").notNull(),
  twelveHours: integer("twelve_hours").notNull(),
  twentyFourHours: integer("twenty_four_hours").notNull(),
  multiDayDaily: integer("multi_day_daily").notNull(),
  interstateBase: integer("interstate_base").notNull(),
  interstateChauffeur: integer("interstate_chauffeur").notNull().default(80000),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const addOns = pgTable("add_ons", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  priceNgn: integer("price_ngn"), // null = custom quote
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const interstateSurcharges = pgTable("interstate_surcharges", {
  id: serial("id").primaryKey(),
  state: text("state").notNull().unique(),
  region: text("region").notNull(),
  surcharge: numeric("surcharge", { precision: 4, scale: 2 }).notNull(), // 0.35 = +35%
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull().unique(), // H06-00042
  status: text("status").notNull().default("pending_payment"),
  // pending_payment | pending_confirmation | confirmed | completed | cancelled
  tripType: text("trip_type").notNull(),
  vehicleSlug: text("vehicle_slug"),
  vehicleName: text("vehicle_name"),
  chauffeurTier: text("chauffeur_tier"), // regular | spy_police (chauffeur-only trips)
  pickupLocation: text("pickup_location").notNull(),
  destination: text("destination"),
  destinationState: text("destination_state"),
  pickupDate: text("pickup_date").notNull(),
  pickupTime: text("pickup_time").notNull(),
  returnDate: text("return_date"),
  numDays: integer("num_days").notNull().default(1),
  passengers: integer("passengers").notNull().default(1),
  luggage: integer("luggage").notNull().default(0),
  flightNumber: text("flight_number"),
  notes: text("notes"),
  addOns: jsonb("add_ons")
    .$type<{ slug: string; label: string; priceNgn: number | null }[]>()
    .notNull()
    .default([]),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  quoteTotal: integer("quote_total").notNull().default(0),
  quoteBreakdown: jsonb("quote_breakdown")
    .$type<{ label: string; amountNgn: number | null; note?: string }[]>()
    .notNull()
    .default([]),
  isEstimate: boolean("is_estimate").notNull().default(false),
  paymentOption: text("payment_option").notNull().default("pay_later"),
  // full | deposit | bank_transfer | pay_later
  amountDue: integer("amount_due").notNull().default(0),
  amountPaid: integer("amount_paid").notNull().default(0),
  adminNotes: text("admin_notes"),
  assignedDriverId: integer("assigned_driver_id"),
  tripStartedAt: timestamp("trip_started_at"),
  tripCompletedAt: timestamp("trip_completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  provider: text("provider").notNull(), // paystack | mock | bank_transfer
  reference: text("reference").notNull().unique(),
  amountNgn: integer("amount_ngn").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  channel: text("channel"),
  paidAt: timestamp("paid_at"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // vip | corporate | custom | contact
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  vehicleSlug: text("vehicle_slug"),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("new"), // new | responded | closed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLog = pgTable("email_log", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // sent | logged | failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Staff accounts for the operations dashboard. One login, three views:
 *  admin (everything), sales (bookings + enquiries), driver (own trips). */
export const staffUsers = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  role: text("role").notNull(), // admin | sales | driver
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StaffUser = typeof staffUsers.$inferSelect;

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleRate = typeof vehicleRates.$inferSelect;
export type AddOn = typeof addOns.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type InterstateSurcharge = typeof interstateSurcharges.$inferSelect;
