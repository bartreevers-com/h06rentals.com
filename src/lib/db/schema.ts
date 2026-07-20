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

/** KPIs assigned to a staff member by HR — daily or weekly, with a target
 *  and a weight so important duties count more. */
export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  title: text("title").notNull(),
  cadence: text("cadence").notNull(), // daily | weekly
  target: integer("target").notNull().default(1),
  weight: integer("weight").notNull().default(3), // 1-5
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Manual score entries by HR. periodDate = the day (daily KPIs) or the
 *  week's Monday (weekly KPIs). One row per KPI per period. */
export const kpiScores = pgTable("kpi_scores", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").notNull(),
  periodDate: text("period_date").notNull(), // YYYY-MM-DD
  achieved: integer("achieved").notNull().default(0),
  note: text("note"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Kpi = typeof kpis.$inferSelect;
export type KpiScore = typeof kpiScores.$inferSelect;

/* ═══════════════ Recruitment module (Phase 1) ═══════════════ */

/** A vacancy and its full configuration. Question/stage/eligibility/scoring
 *  configs are JSONB; guarded edits after publication snapshot the previous
 *  config into vacancy_audit. */
export const vacancies = pgTable("vacancies", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(), // e.g. H06-VAC-0001
  slug: text("slug").notNull().unique(), // public URL slug
  title: text("title").notNull(),
  department: text("department").notNull(),
  hiringManager: text("hiring_manager"),
  engagementType: text("engagement_type").notNull().default("full_time"),
  location: text("location").notNull().default("Lagos, Nigeria"),
  workArrangement: text("work_arrangement").notNull().default("on_site"),
  openings: integer("openings").notNull().default(1),
  summary: text("summary").notNull().default(""),
  responsibilities: jsonb("responsibilities").$type<string[]>().notNull().default([]),
  essentials: jsonb("essentials").$type<string[]>().notNull().default([]),
  desirables: jsonb("desirables").$type<string[]>().notNull().default([]),
  competencies: jsonb("competencies").$type<{ name: string; weight: number }[]>().notNull().default([]),
  compensation: text("compensation"), // shown publicly only if compensationPublic
  compensationPublic: boolean("compensation_public").notNull().default(false),
  opensAt: timestamp("opens_at"),
  closesAt: timestamp("closes_at"),
  expectedStart: text("expected_start"),
  questions: jsonb("questions")
    .$type<{ id: string; label: string; type: "text" | "textarea" | "yes_no" | "link"; required: boolean; eligibility?: boolean }[]>()
    .notNull()
    .default([]),
  requiredDocs: jsonb("required_docs").$type<{ cv: boolean; supporting: boolean; video: boolean; audio: boolean }>()
    .notNull()
    .default({ cv: true, supporting: false, video: false, audio: false }),
  stages: jsonb("stages").$type<string[]>().notNull().default([]),
  panel: jsonb("panel").$type<number[]>().notNull().default([]), // staff_users ids
  privacyVersion: text("privacy_version").notNull().default("1.0"),
  retentionDays: integer("retention_days").notNull().default(180),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Every vacancy action: who, when, why, and the config it replaced. */
export const vacancyAudit = pgTable("vacancy_audit", {
  id: serial("id").primaryKey(),
  vacancyId: integer("vacancy_id").notNull(),
  actor: text("actor").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  previousConfig: jsonb("previous_config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Candidate accounts — entirely separate from staff. Verified by email OTP. */
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** An application. `submitted` freezes the exact submitted version; later
 *  candidate corrections live in application_amendments. */
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  ref: text("ref").notNull().unique(), // APP-00001
  vacancyId: integer("vacancy_id").notNull(),
  candidateId: integer("candidate_id").notNull(),
  status: text("status").notNull().default("draft"),
  form: jsonb("form").$type<Record<string, unknown>>().notNull().default({}), // working draft
  submitted: jsonb("submitted").$type<Record<string, unknown> | null>().default(null), // frozen at submission
  submittedAt: timestamp("submitted_at"),
  privacyVersion: text("privacy_version"),
  privacyAcknowledgedAt: timestamp("privacy_acknowledged_at"),
  talentPoolConsent: boolean("talent_pool_consent").notNull().default(false),
  talentPoolConsentAt: timestamp("talent_pool_consent_at"),
  lawfulBasis: text("lawful_basis").notNull().default("legitimate_interest"),
  eligibilityResult: text("eligibility_result"), // pass | fail | manual
  retentionExpiry: timestamp("retention_expiry"),
  legalHold: boolean("legal_hold").notNull().default(false),
  anonymisedAt: timestamp("anonymised_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Versioned candidate corrections — the original is never overwritten. */
export const applicationAmendments = pgTable("application_amendments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Every status change: actor, timestamp, reason, override flag. */
export const applicationAudit = pgTable("application_audit", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  actor: text("actor").notNull(),
  actorRole: text("actor_role").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  isOverride: boolean("is_override").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Uploaded files. storage_path is private; access only via signed URLs. */
export const applicationFiles = pgTable("application_files", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  kind: text("kind").notNull(), // cv | supporting | video | audio
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  storageDriver: text("storage_driver").notNull(), // supabase | local
  scanStatus: text("scan_status").notNull().default("not_scanned"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fileAccessLog = pgTable("file_access_log", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  actor: text("actor").notNull(),
  action: text("action").notNull(), // signed_url | denied
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Candidate-facing communications with delivery status. */
export const candidateComms = pgTable("candidate_comms", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull(),
  applicationId: integer("application_id"),
  template: text("template").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // sent | logged | failed
  sentBy: text("sent_by").notNull().default("system"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Internal notes — never exposed to candidates. */
export const applicationNotes = pgTable("application_notes", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  author: text("author").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** HR eligibility screening — a human decision, never automated. The most
 *  recent row is the current result; older rows preserve the history. */
export const screenings = pgTable("screenings", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  result: text("result").notNull(), // eligible | not_eligible | needs_review
  meetsEssentials: boolean("meets_essentials").notNull().default(false),
  reason: text("reason").notNull(),
  notes: text("notes"),
  reviewer: text("reviewer").notNull(),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

/** One scorecard per assessor per application. Hidden from other assessors
 *  until their own is submitted. Edits append to `revisions`, never erase. */
export const scorecards = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  assessorId: integer("assessor_id").notNull(), // staff_users.id (0 = owner)
  assessorName: text("assessor_name").notNull(),
  scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}), // competency id → 1..5
  evidence: text("evidence").notNull().default(""),
  strengths: text("strengths").notNull().default(""),
  concerns: text("concerns").notNull().default(""),
  recommendation: text("recommendation"), // strong_yes | yes | neutral | no
  weightedTotal: integer("weighted_total"), // 0–100, computed server-side
  submittedAt: timestamp("submitted_at"),
  revisions: jsonb("revisions")
    .$type<{ scores: Record<string, number>; weightedTotal: number | null; reason: string; at: string }[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  mode: text("mode").notNull().default("online"), // online | physical
  locationOrLink: text("location_or_link").notNull().default(""),
  interviewers: jsonb("interviewers").$type<number[]>().notNull().default([]), // staff_users ids
  status: text("status").notNull().default("scheduled"), // scheduled | rescheduled | cancelled | completed
  attendance: text("attendance"), // attended | no_show
  reminderSentAt: timestamp("reminder_sent_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** AI-assisted analysis — an assistant, never a decision-maker. Always
 *  rendered with the mandatory human-review label. */
export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  model: text("model").notNull(),
  summary: text("summary").notNull(),
  evidence: jsonb("evidence")
    .$type<{ observation: string; source: string; quote: string }[]>()
    .notNull()
    .default([]),
  missingInfo: jsonb("missing_info").$type<string[]>().notNull().default([]),
  followUpQuestions: jsonb("follow_up_questions").$type<string[]>().notNull().default([]),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** General recruitment audit beyond status changes: views, screening,
 *  interviews, scores, AI runs, finalist selection, owner decisions. */
export const recruitmentEvents = pgTable("recruitment_events", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  vacancyId: integer("vacancy_id"),
  applicationId: integer("application_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Vacancy = typeof vacancies.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationFile = typeof applicationFiles.$inferSelect;
export type Screening = typeof screenings.$inferSelect;
export type Scorecard = typeof scorecards.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;

/** Marketing/notification list — every customer who books or enquires,
 *  whether or not their payment succeeded. */
export const emailList = pgTable("email_list", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  source: text("source").notNull().default("booking"), // booking | admin_booking | enquiry
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type VehicleRate = typeof vehicleRates.$inferSelect;
export type AddOn = typeof addOns.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type InterstateSurcharge = typeof interstateSurcharges.$inferSelect;
