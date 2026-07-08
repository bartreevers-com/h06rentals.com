"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { addOns, bookings, enquiries, staffUsers, vehicleRates, vehicles } from "@/lib/db/schema";
import {
  adminPassword,
  createSession,
  destroySession,
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
    const rows = await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.phone, identifier))
      .limit(1);
    const user = rows[0];
    if (user && user.isActive && verifyPassword(password, user.passwordHash)) {
      await createSession({ userId: user.id, role: user.role as StaffRole, name: user.name });
      redirect(user.role === "driver" ? "/admin/trips" : "/admin/bookings");
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
  await db.update(bookings).set({ status, updatedAt: new Date() }).where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
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
  if (!["admin", "sales", "driver"].includes(role)) return { error: "Choose a role" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const db = await getDb();
  const existing = await db.select().from(staffUsers).where(eq(staffUsers.phone, phone)).limit(1);
  if (existing[0]) return { error: "That phone number already has an account" };
  await db.insert(staffUsers).values({
    name,
    phone,
    email: email || null,
    role,
    passwordHash: hashPassword(password),
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
