import crypto from "crypto";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "../admin-auth";
import { VEHICLE_GALLERIES } from "../vehicle-gallery-data";

type Db = import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;

/**
 * Seed data carried over from the live h06rentals.com platform
 * (fleet, rates, add-ons and interstate surcharges extracted from the
 * production booking engine on 2026-07-08).
 */
export async function seedIfEmpty(db: Db) {
  await seedRecruitmentIfEmpty(db);
  await seedStaffIfMissing(db);
  const existing = await db.select({ n: sql<number>`count(*)` }).from(schema.vehicles);
  if (Number(existing[0]?.n ?? 0) > 0) {
    await syncGalleries(db);
    return;
  }

  await db.insert(schema.vehicles).values([
    {
      slug: "prado_2020",
      name: "Toyota Land Cruiser Prado 2020",
      year: "2020",
      category: "suv",
      tier: "core",
      tagline: "Reliable luxury SUV for city and interstate travel",
      description:
        "The workhorse of Lagos executive travel. Quiet, composed and commanding — the Prado 2020 handles Victoria Island traffic and interstate expressways with equal ease.",
      features: ["7 Seats", "Leather Interior", "Climate Control", "Reverse Camera"],
      seats: 7,
      baggageCapacity: 4,
      excessLuggageCharge: 10000,
      bestFor: ["Airport transfers", "Corporate movement", "Interstate travel"],
      sortOrder: 10,
    },
    {
      slug: "prado_2022",
      name: "Toyota Land Cruiser Prado 2022",
      year: "2022",
      category: "suv",
      tier: "core",
      tagline: "Premium SUV with enhanced comfort and safety features",
      description:
        "The refreshed Prado adds a premium sound system, sunroof and 360° camera to an already formidable executive package.",
      features: ["7 Seats", "Premium Sound", "Sunroof", "360° Camera"],
      seats: 7,
      baggageCapacity: 4,
      excessLuggageCharge: 10000,
      bestFor: ["Executive chauffeur", "Corporate movement", "Events"],
      sortOrder: 20,
    },
    {
      slug: "gx460_2020",
      name: "Lexus GX460 2020",
      year: "2020",
      category: "luxury",
      tier: "core",
      tagline: "Executive luxury SUV — Mark Levinson audio, adaptive suspension",
      description:
        "Lexus refinement with true presence. Mark Levinson audio and adaptive suspension make every journey feel first class.",
      features: ["7 Seats", "Mark Levinson Audio", "Adaptive Suspension", "Leather Interior"],
      seats: 7,
      baggageCapacity: 4,
      excessLuggageCharge: 10000,
      bestFor: ["VIP movement", "Weddings & occasions", "Executive chauffeur"],
      sortOrder: 30,
    },
    {
      slug: "gx460_2022",
      name: "Lexus GX460 2022",
      year: "2022",
      category: "luxury",
      tier: "core",
      tagline: "Latest GX460 — refined luxury with commanding presence",
      description:
        "The flagship of our instant-booking fleet. Ventilated seats, 360° camera, and the quiet confidence Lagos expects of a Lexus.",
      features: ["7 Seats", "Mark Levinson Audio", "Ventilated Seats", "360° Camera"],
      seats: 7,
      baggageCapacity: 4,
      excessLuggageCharge: 10000,
      bestFor: ["VIP movement", "Weddings & occasions", "High-profile guests"],
      sortOrder: 40,
    },
    {
      slug: "hilux_2022",
      name: "Toyota Hilux 2022 V6 XR5",
      year: "2022",
      category: "pickup",
      tier: "core",
      tagline: "Rugged V6 performance — ideal for security and logistics operations",
      description:
        "A V6 Hilux built for escort, security and logistics work. Heavy-duty capability with a professional crew cab.",
      features: ["5 Seats", "V6 Engine", "4WD", "Heavy Duty"],
      seats: 5,
      baggageCapacity: 3,
      excessLuggageCharge: 10000,
      bestFor: ["Security escort", "Logistics", "Interstate support"],
      sortOrder: 50,
    },
    // ── VIP wing (concierge-priced) ──────────────────────────────
    {
      slug: "lx600",
      name: "Lexus LX600",
      year: "2023",
      category: "exotic",
      tier: "vip",
      tagline: "The flagship Lexus — executive travel redefined",
      description: "The pinnacle of Lexus luxury. Priced and prepared by our concierge for each engagement.",
      features: ["Flagship Luxury", "Rear Executive Seating", "Mark Levinson Audio"],
      seats: 5,
      bestFor: ["Heads of state & C-suite", "High-profile arrivals"],
      sortOrder: 110,
    },
    {
      slug: "lx570",
      name: "Lexus LX570",
      year: "2022",
      category: "exotic",
      tier: "vip",
      tagline: "Full-size luxury SUV with commanding road presence",
      features: ["Full-size Luxury", "Commanding Presence"],
      seats: 7,
      bestFor: ["VIP convoys", "Executive travel"],
      sortOrder: 120,
    },
    {
      slug: "gwagon_2023",
      name: "Mercedes-Benz G-Wagon 2023",
      year: "2023",
      category: "exotic",
      tier: "vip",
      tagline: "The icon. Unmistakable, uncompromising",
      features: ["Iconic Design", "Statement Arrival"],
      seats: 5,
      bestFor: ["Statement arrivals", "Music & entertainment", "Weddings"],
      sortOrder: 130,
    },
    {
      slug: "landcruiser_2022",
      name: "Toyota Land Cruiser 2022",
      year: "2022",
      category: "exotic",
      tier: "vip",
      tagline: "Legendary off-road capability meets executive comfort",
      features: ["Legendary Capability", "Executive Comfort"],
      seats: 7,
      bestFor: ["Interstate convoys", "Executive travel"],
      sortOrder: 140,
    },
    {
      slug: "landcruiser_2024",
      name: "Toyota Land Cruiser 2024",
      year: "2024",
      category: "exotic",
      tier: "vip",
      tagline: "New generation Land Cruiser — power, prestige, performance",
      features: ["New Generation", "Prestige"],
      seats: 7,
      bestFor: ["Prestige movement", "Long-range travel"],
      sortOrder: 150,
    },
    {
      slug: "prado_2025",
      name: "Toyota Prado 2025",
      year: "2025",
      category: "exotic",
      tier: "vip",
      tagline: "The all-new Prado — first of its kind in Lagos",
      features: ["All-new Design", "Latest Technology"],
      seats: 7,
      bestFor: ["First impressions", "Corporate flagships"],
      sortOrder: 160,
    },
    {
      slug: "range_rover",
      name: "Range Rover",
      year: "—",
      category: "exotic",
      tier: "vip",
      tagline: "British luxury, Lagos presence",
      features: ["British Luxury"],
      seats: 5,
      bestFor: ["Weddings", "VIP arrivals"],
      sortOrder: 170,
    },
    {
      slug: "rolls_royce",
      name: "Rolls-Royce",
      year: "—",
      category: "exotic",
      tier: "vip",
      tagline: "The ultimate arrival",
      features: ["Ultimate Luxury"],
      seats: 4,
      bestFor: ["Weddings", "Once-in-a-lifetime moments"],
      sortOrder: 180,
    },
    {
      slug: "urus",
      name: "Lamborghini Urus",
      year: "—",
      category: "exotic",
      tier: "vip",
      tagline: "Super-SUV performance",
      features: ["Super-SUV"],
      seats: 4,
      bestFor: ["Statement occasions"],
      sortOrder: 190,
    },
    {
      slug: "armoured",
      name: "Armoured Vehicles",
      year: "—",
      category: "exotic",
      tier: "vip",
      tagline: "Discreet certified protection for security-conscious movement",
      features: ["Certified Armour", "Discreet Protection"],
      seats: 5,
      bestFor: ["Security-conscious movement", "High-risk itineraries"],
      sortOrder: 200,
    },
    {
      slug: "luxury_bus",
      name: "Luxury Buses",
      year: "—",
      category: "bus",
      tier: "vip",
      tagline: "Group movement without compromise",
      features: ["Group Travel", "Executive Interior"],
      seats: 14,
      bestFor: ["Corporate groups", "Event logistics", "Wedding parties"],
      sortOrder: 210,
    },
  ]);

  await db.insert(schema.vehicleRates).values([
    { vehicleSlug: "prado_2020", airportTransfer: 125000, twelveHours: 170000, twentyFourHours: 300000, multiDayDaily: 300000, interstateBase: 170000, interstateChauffeur: 80000 },
    { vehicleSlug: "prado_2022", airportTransfer: 125000, twelveHours: 250000, twentyFourHours: 450000, multiDayDaily: 450000, interstateBase: 250000, interstateChauffeur: 80000 },
    { vehicleSlug: "gx460_2020", airportTransfer: 150000, twelveHours: 300000, twentyFourHours: 550000, multiDayDaily: 550000, interstateBase: 300000, interstateChauffeur: 100000 },
    { vehicleSlug: "gx460_2022", airportTransfer: 150000, twelveHours: 350000, twentyFourHours: 600000, multiDayDaily: 600000, interstateBase: 350000, interstateChauffeur: 100000 },
    { vehicleSlug: "hilux_2022", airportTransfer: 100000, twelveHours: 150000, twentyFourHours: 250000, multiDayDaily: 250000, interstateBase: 150000, interstateChauffeur: 70000 },
  ]);

  await db.insert(schema.addOns).values([
    { slug: "meet_greet", label: "Meet & Greet", description: "Driver meets you at arrivals with a name board", priceNgn: 15000, sortOrder: 10 },
    { slug: "vip_airport_protocol", label: "VIP Airport Protocol", description: "Dedicated personal assistant — fast-track through all airport processes", priceNgn: 100000, sortOrder: 20 },
    { slug: "chauffeur_spy_police", label: "Spy Police Chauffeur Upgrade", description: "Certified police officer with security training — ideal for high-profile travel", priceNgn: 20000, sortOrder: 30 },
    { slug: "security_escort", label: "Security Escort", description: "Fully kitted MOPOL escort vehicle — rates vary by region", priceNgn: null, sortOrder: 40 },
    { slug: "extra_driver", label: "Extra Driver", description: "Second driver for extended or relay trips", priceNgn: null, sortOrder: 50 },
    { slug: "visa_on_arrival", label: "Visa on Arrival Assistance", description: "Dedicated support for visa-on-arrival processing at MMIA", priceNgn: null, sortOrder: 60 },
  ]);

  await db.insert(schema.interstateSurcharges).values([
    { state: "Ogun", region: "South West", surcharge: "0.35" },
    { state: "Oyo", region: "South West", surcharge: "0.38" },
    { state: "Osun", region: "South West", surcharge: "0.40" },
    { state: "Ondo", region: "South West", surcharge: "0.42" },
    { state: "Ekiti", region: "South West", surcharge: "0.45" },
    { state: "Edo", region: "South South", surcharge: "0.50" },
    { state: "Delta", region: "South South", surcharge: "0.55" },
    { state: "Bayelsa", region: "South South", surcharge: "0.60" },
    { state: "Rivers", region: "South South", surcharge: "0.62" },
    { state: "Akwa Ibom", region: "South South", surcharge: "0.65" },
    { state: "Cross River", region: "South South", surcharge: "0.70" },
    { state: "Anambra", region: "South East", surcharge: "0.50" },
    { state: "Imo", region: "South East", surcharge: "0.55" },
    { state: "Enugu", region: "South East", surcharge: "0.58" },
    { state: "Abia", region: "South East", surcharge: "0.60" },
    { state: "Ebonyi", region: "South East", surcharge: "0.65" },
    { state: "Kwara", region: "North Central", surcharge: "0.65" },
    { state: "Kogi", region: "North Central", surcharge: "0.68" },
    { state: "Benue", region: "North Central", surcharge: "0.70" },
    { state: "Abuja", region: "North Central", surcharge: "0.75" },
  ]);

  await db.insert(schema.settings).values([
    { key: "whatsapp_number", value: "2349139999533" },
    { key: "business_email", value: "hello@h06rentals.com" },
    { key: "deposit_percent", value: "50" },
    { key: "bank_transfer_details", value: "Account details are shared by our concierge on WhatsApp after booking." },
  ]);

  await syncGalleries(db);
}

/** The H06 team roster (provided by the owner, 2026-07-20). Idempotent:
 *  matched against existing accounts by phone (last 10 digits) or email, so
 *  nobody is duplicated and nothing existing is touched. New accounts get an
 *  unguessable random password — the owner sets real ones from Team →
 *  Reset password. `staff` roles have no sign-in either way. */
const STAFF_ROSTER: { name: string; phone: string; email: string; role: string }[] = [
  { name: "Happy Omoruyi", phone: "9134668915", email: "ohappy@h06rentals.com", role: "owner" }, // Managing Director
  { name: "Bartholomew Inyang", phone: "8135331188", email: "ibart@h06rentals.com", role: "owner" }, // General Manager
  { name: "Lateefat Adedayo-Aiyegbusi", phone: "8148102662", email: "alateefat@h06rentals.com", role: "hr" }, // HR Manager
  { name: "Mohammed Sanusi", phone: "7033958191", email: "smohammed@h06rentals.com", role: "admin" }, // Operations Manager
  { name: "Samson Oyedele", phone: "9139999533", email: "osamson@h06rentals.com", role: "sales" }, // Sales Manager
  { name: "King Ekpedeme", phone: "9121739055", email: "eking@h06rentals.com", role: "staff" }, // Maintenance Manager
  { name: "Bukola Alonge", phone: "9139578024", email: "abukola@h06rentals.com", role: "staff" }, // Social Media Manager
  { name: "Olasumbo Banjoko", phone: "7074532272", email: "bolasumbo@h06rentals.com", role: "sales" }, // Accountant/Office Assistant
  { name: "Ifedayo Daramola", phone: "7074532276", email: "h06driver4@gmail.com", role: "driver" },
  { name: "Olajide Salawu", phone: "8086890281", email: "h06driver2@gmail.com", role: "driver" },
  { name: "Michael Freeman", phone: "8149937116", email: "h06driver7@gmail.com", role: "driver" },
  { name: "Festus Moses", phone: "8084972069", email: "h06driver3@gmail.com", role: "driver" },
  { name: "Okechukwu Igbokwe", phone: "9130548281", email: "h06driver1@gmail.com", role: "driver" },
  { name: "Akorede Lawal", phone: "7074532270", email: "h06driver5@gmail.com", role: "driver" },
  { name: "Olushola Olusesan", phone: "7074532275", email: "sola.olusesan@gmail.com", role: "driver" },
  { name: "Akin Bandele", phone: "9139578080", email: "h06driver6@gmail.com", role: "driver" },
  { name: "Preye Sitoru", phone: "9021223649", email: "joepreye@gmail.com", role: "driver" },
  { name: "Chimaobi Okere", phone: "7074540827", email: "okerechimaobimark1995@gmail.com", role: "driver" },
];

/** Last 10 digits — matches 0913…, +234913… and bare 913… alike. */
function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

async function seedStaffIfMissing(db: Db) {
  const existing = await db
    .select({ phone: schema.staffUsers.phone, email: schema.staffUsers.email })
    .from(schema.staffUsers);
  const phones = new Set(existing.map((e) => phoneKey(e.phone)));
  const emails = new Set(existing.map((e) => (e.email ?? "").toLowerCase()).filter(Boolean));

  for (const member of STAFF_ROSTER) {
    if (phones.has(phoneKey(member.phone)) || emails.has(member.email.toLowerCase())) continue;
    await db.insert(schema.staffUsers).values({
      name: member.name,
      phone: `0${member.phone}`,
      email: member.email,
      role: member.role,
      passwordHash: hashPassword(crypto.randomUUID()),
      isActive: true,
    });
    phones.add(phoneKey(member.phone));
    emails.add(member.email.toLowerCase());
  }

  // One-time correction: the first roster deploy created the MD and GM as
  // admin before the owner confirmed they are owners. Only flips the exact
  // originally-seeded value; a deliberate later demotion won't be re-promoted
  // unless it lands back on 'admin'. Safe to delete once the team is settled.
  const { and, eq, inArray } = await import("drizzle-orm");
  await db
    .update(schema.staffUsers)
    .set({ role: "owner" })
    .where(
      and(
        inArray(schema.staffUsers.email, ["ohappy@h06rentals.com", "ibart@h06rentals.com"]),
        eq(schema.staffUsers.role, "admin"),
      ),
    );
}

/** The launch vacancy: Podcast Host & Brand Creator — the voice of the
 *  new H06 podcast and the on-camera face of the brand. Published and open.
 *  Idempotent: creates on an empty DB; if the untouched original seed is
 *  found (pre-podcast title), it is updated in place. */
const PODCAST_VACANCY = {
  title: "Podcast Host & Brand Creator",
  department: "Brand & Experience",
  hiringManager: "Owner",
  engagementType: "full_time",
  location: "Lekki, Lagos",
  workArrangement: "hybrid",
  openings: 1,
  summary:
    "Host the new H06 podcast and become the voice of the brand. Long-form conversation, sharp improvisation, real curiosity — on mic, on camera and everywhere H06 shows up. We care about presence and judgement, not a CV full of titles.",
  responsibilities: [
    "Host and produce the H06 podcast: plan guests, lead conversations, own the show's voice",
    "Front H06 brand content across Instagram, TikTok and YouTube",
    "Turn podcast moments into clips and campaigns with the marketing team",
    "Welcome VIP clients at the showroom and on signature experiences",
    "Represent H06 at events, launches and partner activations",
  ],
  essentials: [
    "Exceptional conversational ability — you listen as well as you talk",
    "Confident improviser: unscripted moments are where you shine",
    "Clear, fluent spoken English on mic and on camera",
    "Reliable and prepared — shows ship on schedule",
    "Based in Lagos or able to relocate",
  ],
  desirables: [
    "A portfolio of hosting, podcast, radio or presenting work",
    "An existing audience or community",
    "Experience in luxury, hospitality or automotive",
    "Yoruba and/or Pidgin fluency",
  ],
  competencies: [
    { name: "Conversation & listening", weight: 20 },
    { name: "Improvisation", weight: 15 },
    { name: "Intelligence & curiosity", weight: 15 },
    { name: "Humour", weight: 10 },
    { name: "Fluency & clarity", weight: 10 },
    { name: "Reliability & preparation", weight: 10 },
    { name: "Brand judgement", weight: 10 },
    { name: "Commercial & content instinct", weight: 10 },
  ],
  compensation: "Competitive base + content performance bonus",
  compensationPublic: false,
  expectedStart: "September 2026",
  questions: [
    {
      id: "q1",
      label: "Why should you be the voice of H06? Tell us in your own words.",
      type: "textarea" as const,
      required: true,
    },
    {
      id: "q2",
      label: "Link to audio or video of you talking — hosting, a podcast, a voice note story, anything real",
      type: "link" as const,
      required: true,
    },
    {
      id: "q3",
      label: "Who would be your dream first podcast guest, and what would you ask them?",
      type: "textarea" as const,
      required: true,
    },
    {
      id: "q4",
      label: "Are you available to work evenings and weekends when recordings or VIP bookings require it?",
      type: "yes_no" as const,
      required: true,
      eligibility: true,
    },
  ],
  requiredDocs: { cv: true, supporting: false, video: true, audio: false },
  stages: [
    "Eligibility screening",
    "Shortlist review",
    "On-mic interview",
    "Final assessment (live recording brief)",
    "Owner review & offer",
  ],
};

async function seedRecruitmentIfEmpty(db: Db) {
  const { eq } = await import("drizzle-orm");
  const existing = await db.select({ n: sql<number>`count(*)` }).from(schema.vacancies);

  if (Number(existing[0]?.n ?? 0) > 0) {
    // one-time in-place upgrade of the untouched original seed to the podcast brief
    const rows = await db
      .select()
      .from(schema.vacancies)
      .where(eq(schema.vacancies.reference, "H06-VAC-0001"))
      .limit(1);
    const v = rows[0];
    if (v && v.title === "Founding Host & Brand Creator") {
      await db
        .update(schema.vacancies)
        .set({ ...PODCAST_VACANCY, updatedAt: new Date() })
        .where(eq(schema.vacancies.id, v.id));
      await db.insert(schema.vacancyAudit).values({
        vacancyId: v.id,
        actor: "System seed",
        actorRole: "owner",
        action: "updated: refocused as Podcast Host & Brand Creator (approved brief)",
      });
    }
    return;
  }

  const [vacancy] = await db
    .insert(schema.vacancies)
    .values({
      ...PODCAST_VACANCY,
      reference: "H06-VAC-0001",
      slug: "podcast-host-brand-creator",
      opensAt: new Date("2026-07-19T00:00:00Z"),
      closesAt: new Date("2026-08-31T23:59:59Z"),
      panel: [],
      privacyVersion: "1.0",
      retentionDays: 180,
      status: "published",
      createdBy: "System seed",
      approvedBy: "Owner",
      approvedAt: new Date("2026-07-20T00:00:00Z"),
    })
    .returning();

  await db.insert(schema.vacancyAudit).values([
    { vacancyId: vacancy.id, actor: "System seed", actorRole: "owner", action: "created" },
    { vacancyId: vacancy.id, actor: "Owner", actorRole: "owner", action: "internal_review → approved" },
    { vacancyId: vacancy.id, actor: "Owner", actorRole: "owner", action: "approved → published" },
  ]);
}

/** Keep vehicle galleries exactly in step with vehicle-gallery-data.ts —
 *  the code is the source of truth until an admin gallery editor exists. */
async function syncGalleries(db: Db) {
  const { eq } = await import("drizzle-orm");
  const { ALL_GALLERY_SLUGS } = await import("../vehicle-gallery-data");
  for (const slug of ALL_GALLERY_SLUGS) {
    const gallery = VEHICLE_GALLERIES[slug] ?? [];
    await db
      .update(schema.vehicles)
      .set({ gallery })
      .where(eq(schema.vehicles.slug, slug));
  }
}
