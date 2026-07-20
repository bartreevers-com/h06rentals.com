"use server";

import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  addOns,
  bookings,
  enquiries,
  kpis,
  kpiScores,
  payments,
  staffUsers,
  vehicleRates,
  vehicles,
} from "@/lib/db/schema";
import { KPI_TEMPLATES } from "@/lib/kpi-templates";
import { sendEmail } from "@/lib/email";
import { createBookingRecord } from "@/lib/booking-service";
import {
  emailBookingCancelled,
  emailBookingConfirmed,
  emailBookingPriced,
} from "@/lib/notifications";
import {
  adminPassword,
  createSession,
  destroySession,
  getSession,
  hasRole,
  hashPassword,
  verifyPassword,
  type StaffRole,
} from "@/lib/admin-auth";

async function requireRole(...roles: StaffRole[]) {
  const session = await hasRole(...roles);
  if (!session) redirect("/admin");
  return session;
}

/* ── auth ────────────────────────────────────────────────────── */

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Break-glass owner login via env password ("owner" or blank identifier).
  if ((identifier === "" || identifier.toLowerCase() === "owner") && password === adminPassword()) {
    await createSession({ userId: 0, role: "owner", name: "Owner" });
    redirect("/admin/bookings");
  }

  if (identifier && password) {
    const db = await getDb();
    // forgiving phone match: +234 803…, 0803…, spaces and dashes all land
    // on the same account (accounts are stored as 0XXXXXXXXXX)
    const digits = identifier.replace(/\D/g, "");
    const candidates = [...new Set([identifier, digits, digits.length >= 10 ? `0${digits.slice(-10)}` : ""])].filter(
      Boolean,
    );
    let user: typeof staffUsers.$inferSelect | undefined;
    for (const candidate of candidates) {
      const rows = await db.select().from(staffUsers).where(eq(staffUsers.phone, candidate)).limit(1);
      if (rows[0]) {
        user = rows[0];
        break;
      }
    }
    if (user && user.isActive && user.role !== "staff" && verifyPassword(password, user.passwordHash)) {
      await createSession({ userId: user.id, role: user.role as StaffRole, name: user.name });
      redirect(
        user.role === "driver"
          ? "/admin/trips"
          : user.role === "hr"
            ? "/admin/performance"
            : ["hiring_manager", "assessor"].includes(user.role)
              ? "/admin/recruitment"
              : "/admin/bookings",
      );
    }
  }
  return { error: "Incorrect phone number or password" };
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin");
}

/* ── bookings (admin + sales) ────────────────────────────────── */

export async function setBookingStatusAction(formData: FormData) {
  await requireRole("owner", "admin", "sales");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const allowed = ["pending_payment", "pending_confirmation", "confirmed", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) return;
  const db = await getDb();
  const [updated] = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  // the customer always hears about status changes that matter to them
  if (updated) {
    if (status === "confirmed") await emailBookingConfirmed(updated);
    if (status === "cancelled") await emailBookingCancelled(updated);
  }
  revalidatePath("/admin/bookings");
}

/** Owner/admin set the final price on concierge-quoted (VIP, wedding,
 *  custom) bookings — the customer immediately receives a payment link. */
export async function setBookingPriceAction(formData: FormData) {
  await requireRole("owner", "admin");
  const id = Number(formData.get("id"));
  const price = Math.round(Number(formData.get("finalPrice")));
  if (!id || !Number.isFinite(price) || price <= 0) return;
  const db = await getDb();
  const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  const b = rows[0];
  if (!b) return;
  const [updated] = await db
    .update(bookings)
    .set({
      quoteTotal: price,
      amountDue: price,
      isEstimate: false,
      quoteBreakdown: [{ label: "Concierge-confirmed price", amountNgn: price }],
      status: b.status === "pending_confirmation" || b.status === "pending_payment" ? "pending_payment" : b.status,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, id))
    .returning();
  if (updated) await emailBookingPriced(updated);
  revalidatePath("/admin/bookings");
}

/** Staff create a booking for a client who called in — the client gets the
 *  same emails and payment link as a web booking. */
export async function createAdminBookingAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await requireRole("owner", "admin", "sales");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string, fallback: number) => {
    const n = Number(formData.get(k));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
  };

  if (str("customerName").length < 2) return { error: "Customer name is required" };
  if (str("customerPhone").length < 7) return { error: "Customer phone is required" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str("customerEmail")))
    return { error: "A valid customer email is required — it's where their notifications go" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str("pickupDate"))) return { error: "Pickup date is required" };
  if (!/^\d{2}:\d{2}$/.test(str("pickupTime"))) return { error: "Pickup time is required" };
  if (str("pickupLocation").length < 2) return { error: "Pickup location is required" };

  const result = await createBookingRecord(
    {
      tripType: str("tripType"),
      vehicleSlug: str("vehicleSlug") || undefined,
      chauffeurTier: str("chauffeurTier") || undefined,
      pickupLocation: str("pickupLocation"),
      destination: str("destination") || undefined,
      destinationState: str("destinationState") || undefined,
      pickupDate: str("pickupDate"),
      pickupTime: str("pickupTime"),
      numDays: num("numDays", 1),
      passengers: num("passengers", 1),
      luggage: Math.max(0, Math.round(Number(formData.get("luggage")) || 0)),
      flightNumber: str("flightNumber") || undefined,
      notes: str("notes") ? `[Phone-in booking] ${str("notes")}` : "[Phone-in booking]",
      addOnSlugs: [],
      customerName: str("customerName"),
      customerPhone: str("customerPhone"),
      customerEmail: str("customerEmail"),
      paymentOption: str("paymentOption") === "deposit" ? "deposit" : str("paymentOption") === "full" ? "full" : "pay_later",
    },
    { source: "admin", createdBy: session.name },
  );

  if (result.error !== undefined) return { error: result.error };
  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings?created=${result.booking.ref}`);
}

/** Deleting records is the owner's privilege alone. */
export async function deleteBookingAction(formData: FormData) {
  await requireRole("owner");
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  await db.delete(payments).where(eq(payments.bookingId, id));
  await db.delete(bookings).where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/trips");
}

export async function deleteEnquiryAction(formData: FormData) {
  await requireRole("owner");
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  await db.delete(enquiries).where(eq(enquiries.id, id));
  revalidatePath("/admin/enquiries");
}

export async function saveAdminNotesAction(formData: FormData) {
  await requireRole("owner", "admin", "sales");
  const id = Number(formData.get("id"));
  const notes = String(formData.get("adminNotes") ?? "");
  if (!id) return;
  const db = await getDb();
  await db.update(bookings).set({ adminNotes: notes, updatedAt: new Date() }).where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
}

export async function assignDriverAction(formData: FormData) {
  await requireRole("owner", "admin", "sales");
  const id = Number(formData.get("id"));
  const driverIdRaw = String(formData.get("driverId") ?? "");
  if (!id) return;
  const driverId = driverIdRaw === "" ? null : Number(driverIdRaw);
  const db = await getDb();
  if (driverId !== null) {
    const rows = await db
      .select()
      .from(staffUsers)
      .where(and(eq(staffUsers.id, driverId), eq(staffUsers.role, "driver")))
      .limit(1);
    if (!rows[0]) return;
  }
  await db
    .update(bookings)
    .set({ assignedDriverId: driverId, updatedAt: new Date() })
    .where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/trips");
}

/* ── driver trip flow ────────────────────────────────────────── */

export async function startTripAction(formData: FormData) {
  const session = await requireRole("driver", "admin", "owner");
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  const b = rows[0];
  if (!b) return;
  if (session.role === "driver" && b.assignedDriverId !== session.userId) return;
  await db
    .update(bookings)
    .set({ tripStartedAt: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, id));
  revalidatePath("/admin/trips");
  revalidatePath("/admin/bookings");
}

export async function completeTripAction(formData: FormData) {
  const session = await requireRole("driver", "admin", "owner");
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  const b = rows[0];
  if (!b) return;
  if (session.role === "driver" && b.assignedDriverId !== session.userId) return;
  await db
    .update(bookings)
    .set({ tripCompletedAt: new Date(), status: "completed", updatedAt: new Date() })
    .where(eq(bookings.id, id));
  revalidatePath("/admin/trips");
  revalidatePath("/admin/bookings");
}

/* ── fleet & rates (admin only) ──────────────────────────────── */

export async function toggleVehicleAction(formData: FormData) {
  await requireRole("owner", "admin");
  const slug = String(formData.get("slug"));
  const db = await getDb();
  const rows = await db.select().from(vehicles).where(eq(vehicles.slug, slug)).limit(1);
  const v = rows[0];
  if (!v) return;
  await db
    .update(vehicles)
    .set({ isAvailable: !v.isAvailable, updatedAt: new Date() })
    .where(eq(vehicles.slug, slug));
  revalidatePath("/admin/fleet");
  revalidatePath("/fleet");
  revalidatePath("/");
}

export async function updateVehicleAction(formData: FormData) {
  await requireRole("owner", "admin");
  const slug = String(formData.get("slug"));
  const db = await getDb();
  const tagline = String(formData.get("tagline") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  await db
    .update(vehicles)
    .set({ tagline, imageUrl: imageUrl || null, updatedAt: new Date() })
    .where(eq(vehicles.slug, slug));
  revalidatePath("/admin/fleet");
  revalidatePath(`/fleet/${slug}`);
}

export async function updateRatesAction(formData: FormData) {
  await requireRole("owner", "admin");
  const slug = String(formData.get("slug"));
  const fields = [
    "airportTransfer",
    "twelveHours",
    "twentyFourHours",
    "multiDayDaily",
    "interstateBase",
    "interstateChauffeur",
  ] as const;
  const values: Record<string, number> = {};
  for (const f of fields) {
    const n = Number(formData.get(f));
    if (!Number.isFinite(n) || n < 0) return;
    values[f] = Math.round(n);
  }
  const db = await getDb();
  await db
    .update(vehicleRates)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(vehicleRates.vehicleSlug, slug));
  revalidatePath("/admin/fleet");
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${slug}`);
}

/* ── add-ons (admin only) ────────────────────────────────────── */

export async function updateAddOnAction(formData: FormData) {
  await requireRole("owner", "admin");
  const slug = String(formData.get("slug"));
  const priceRaw = String(formData.get("priceNgn") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const priceNgn = priceRaw === "" ? null : Math.max(0, Math.round(Number(priceRaw)));
  if (priceRaw !== "" && !Number.isFinite(priceNgn)) return;
  const db = await getDb();
  await db.update(addOns).set({ priceNgn, isActive }).where(eq(addOns.slug, slug));
  revalidatePath("/admin/addons");
  revalidatePath("/book");
}

/* ── enquiries (admin + sales) ───────────────────────────────── */

export async function setEnquiryStatusAction(formData: FormData) {
  await requireRole("owner", "admin", "sales");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["new", "responded", "closed"].includes(status)) return;
  const db = await getDb();
  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
  revalidatePath("/admin/enquiries");
}

/* ── team management (admin only) ────────────────────────────── */

export async function createStaffAction(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireRole("owner");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { error: "Please add a name" };
  if (phone.length < 7) return { error: "Please add a phone number — it's their login" };
  if (!["owner", "admin", "sales", "driver", "hr", "staff", "hiring_manager", "assessor"].includes(role))
    return { error: "Choose a role" };
  if (role !== "staff" && password.length < 8) return { error: "Password must be at least 8 characters" };
  const db = await getDb();
  const existing = await db.select().from(staffUsers).where(eq(staffUsers.phone, phone)).limit(1);
  if (existing[0]) return { error: "That phone number already has an account" };
  await db.insert(staffUsers).values({
    name,
    phone,
    email: email || null,
    role,
    // tracked-only staff never sign in; give them an unusable random password
    passwordHash: hashPassword(role === "staff" && !password ? crypto.randomUUID() : password),
  });
  revalidatePath("/admin/team");
  return { ok: `${name} added — they sign in with ${phone} and the password you set` };
}

export async function toggleStaffAction(formData: FormData) {
  const session = await requireRole("owner");
  const id = Number(formData.get("id"));
  if (!id || id === session.userId) return; // can't deactivate yourself
  const db = await getDb();
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
  const user = rows[0];
  if (!user) return;
  await db.update(staffUsers).set({ isActive: !user.isActive }).where(eq(staffUsers.id, id));
  revalidatePath("/admin/team");
}

/** Owner promotes or demotes any staff account's role. Their open session
 *  keeps the old role until it expires (max 12h) or they sign in again. */
export async function setStaffRoleAction(formData: FormData) {
  const session = await requireRole("owner");
  const id = Number(formData.get("id"));
  const role = String(formData.get("role"));
  const allowed = ["owner", "admin", "sales", "driver", "hr", "hiring_manager", "assessor", "staff"];
  if (!id || id === session.userId || !allowed.includes(role)) return;
  const db = await getDb();
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
  if (!rows[0] || rows[0].role === role) return;
  await db.update(staffUsers).set({ role }).where(eq(staffUsers.id, id));
  revalidatePath("/admin/team");
}

/* ── performance (owner + HR only) ───────────────────────────── */

async function requirePerf() {
  return requireRole("owner", "hr");
}

export async function createKpiAction(formData: FormData) {
  await requirePerf();
  const staffId = Number(formData.get("staffId"));
  const title = String(formData.get("title") ?? "").trim();
  const cadence = String(formData.get("cadence")) === "daily" ? "daily" : "weekly";
  const target = Math.max(1, Math.round(Number(formData.get("target")) || 1));
  const weight = Math.min(5, Math.max(1, Math.round(Number(formData.get("weight")) || 3)));
  if (!staffId || title.length < 3) return;
  const db = await getDb();
  await db.insert(kpis).values({ staffId, title, cadence, target, weight });
  revalidatePath("/admin/performance");
}

export async function applyKpiTemplateAction(formData: FormData) {
  await requirePerf();
  const staffId = Number(formData.get("staffId"));
  const templateKey = String(formData.get("template"));
  const template = KPI_TEMPLATES[templateKey];
  if (!staffId || !template) return;
  const db = await getDb();
  const existing = await db.select().from(kpis).where(eq(kpis.staffId, staffId));
  const have = new Set(existing.map((k) => k.title.toLowerCase()));
  for (const t of template.kpis) {
    if (!have.has(t.title.toLowerCase())) {
      await db.insert(kpis).values({ staffId, ...t });
    }
  }
  revalidatePath("/admin/performance");
}

export async function toggleKpiAction(formData: FormData) {
  await requirePerf();
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  const rows = await db.select().from(kpis).where(eq(kpis.id, id)).limit(1);
  if (!rows[0]) return;
  await db.update(kpis).set({ isActive: !rows[0].isActive }).where(eq(kpis.id, id));
  revalidatePath("/admin/performance");
}

/** Deleting a KPI (and its history) stays with the owner. */
export async function deleteKpiAction(formData: FormData) {
  await requireRole("owner");
  const id = Number(formData.get("id"));
  if (!id) return;
  const db = await getDb();
  await db.delete(kpiScores).where(eq(kpiScores.kpiId, id));
  await db.delete(kpis).where(eq(kpis.id, id));
  revalidatePath("/admin/performance");
}

/** HR records the numbers for one KPI across a week — upserts per period. */
export async function recordScoresAction(formData: FormData) {
  const session = await requirePerf();
  const kpiId = Number(formData.get("kpiId"));
  if (!kpiId) return;
  const db = await getDb();
  const kpiRows = await db.select().from(kpis).where(eq(kpis.id, kpiId)).limit(1);
  if (!kpiRows[0]) return;
  const note = String(formData.get("note") ?? "").trim() || null;

  const entries: { periodDate: string; achieved: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("achieved:")) continue;
    const periodDate = key.slice("achieved:".length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodDate)) continue;
    const raw = String(value).trim();
    if (raw === "") continue; // untouched day — leave unscored
    const achieved = Math.max(0, Math.round(Number(raw)));
    if (!Number.isFinite(achieved)) continue;
    entries.push({ periodDate, achieved });
  }
  for (const e of entries) {
    await db
      .insert(kpiScores)
      .values({ kpiId, periodDate: e.periodDate, achieved: e.achieved, note, recordedBy: session.name })
      .onConflictDoUpdate({
        target: [kpiScores.kpiId, kpiScores.periodDate],
        set: { achieved: e.achieved, note, recordedBy: session.name },
      });
  }
  revalidatePath("/admin/performance");
}

export async function resetStaffPasswordAction(_prev: { error?: string; ok?: string } | null, formData: FormData) {
  await requireRole("owner");
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (!id) return { error: "Missing user" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const db = await getDb();
  await db.update(staffUsers).set({ passwordHash: hashPassword(password) }).where(eq(staffUsers.id, id));
  revalidatePath("/admin/team");
  return { ok: "Password updated" };
}

/* ── login-details onboarding (owner only) ───────────────────── */

/** Readable, strong initial password, e.g. H06-K3TP-W7XM.
 *  No ambiguous characters; ~41 bits from a CSPRNG. */
function generateInitialPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  const pick = (i: number) => alphabet[bytes[i] % alphabet.length];
  return `H06-${pick(0)}${pick(1)}${pick(2)}${pick(3)}-${pick(4)}${pick(5)}${pick(6)}${pick(7)}`;
}

async function resetAndEmailLogin(user: {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}): Promise<"sent" | "failed" | "skipped"> {
  if (!user.email || user.role === "staff") return "skipped";
  const password = generateInitialPassword();
  const db = await getDb();
  await db.update(staffUsers).set({ passwordHash: hashPassword(password) }).where(eq(staffUsers.id, user.id));

  const firstName = user.name.split(" ")[0];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.h06rentals.com";
  const result = await sendEmail({
    to: user.email,
    subject: "Your H06 Office login",
    text: [
      `Dear ${firstName},`,
      ``,
      `Your H06 Office account is ready.`,
      ``,
      `Sign in at: ${site}/admin`,
      `Phone number: ${user.phone}`,
      `Password: ${password}`,
      ``,
      `Your role (${user.role.replace("_", " ")}) decides what you see when you sign in.`,
      `Keep this password private. Once signed in you can change it any time — tap "Password" next to your name.`,
      ``,
      `H06 Rentals — Operations`,
    ].join("\n"),
    logBody: `[login details for ${user.name} — password redacted from log]`,
  });
  return result.sent ? "sent" : "failed";
}

export async function emailLoginDetailsAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireRole("owner");
  const id = Number(formData.get("id"));
  const db = await getDb();
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
  const user = rows[0];
  if (!user) return { error: "User not found" };
  if (!user.email) return { error: "No email on file — add one first" };
  if (user.role === "staff") return { error: "Staff accounts have no sign-in — nothing to send" };
  if (!user.isActive) return { error: "Account is deactivated — reactivate it first" };
  const outcome = await resetAndEmailLogin(user);
  revalidatePath("/admin/team");
  if (outcome !== "sent")
    return {
      error: `The password WAS reset, but the email to ${user.email} did not send — the address may not exist or the email service rejected it. Set a password manually and share it directly.`,
    };
  return { ok: `New password set and emailed to ${user.email}` };
}

/** Reset every active, sign-in-capable account to a fresh password and email
 *  each person their own login. The passwords are never shown on screen and
 *  are redacted from the email log. */
export async function emailAllLoginsAction(
  _prev: { error?: string; ok?: string } | null,
  _formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  await requireRole("owner");
  const db = await getDb();
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.isActive, true));
  let sent = 0;
  const failed: string[] = [];
  const skipped: string[] = [];
  for (const user of rows) {
    const outcome = await resetAndEmailLogin(user);
    if (outcome === "sent") sent++;
    else if (outcome === "failed") failed.push(`${user.name} (${user.email})`);
    else skipped.push(`${user.name} (${user.role === "staff" ? "no sign-in role" : "no email"})`);
  }
  revalidatePath("/admin/team");
  const parts = [`New passwords set; emails sent to ${sent} people`];
  if (failed.length)
    parts.push(`⚠ did NOT send to: ${failed.join(", ")} — set passwords manually for them`);
  if (skipped.length) parts.push(`skipped: ${skipped.join(", ")}`);
  return { ok: parts.join(" · ") };
}

/** Any signed-in staff member changes their own password: current password
 *  required, new one at least 8 characters. The break-glass owner login has
 *  no account row — its password lives in the environment. */
export async function changeMyPasswordAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const session = await getSession();
  if (!session) redirect("/admin");
  if (session.userId === 0)
    return { error: "The owner sign-in password is set in the server environment, not here" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  if (next !== confirm) return { error: "New passwords don't match" };

  const db = await getDb();
  const rows = await db.select().from(staffUsers).where(eq(staffUsers.id, session.userId)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return { error: "Account not found" };
  if (!verifyPassword(current, user.passwordHash)) return { error: "Current password is incorrect" };

  await db.update(staffUsers).set({ passwordHash: hashPassword(next) }).where(eq(staffUsers.id, user.id));
  return { ok: "Password changed — use the new one next time you sign in" };
}
