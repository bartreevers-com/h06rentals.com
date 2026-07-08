"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { addOns, bookings, enquiries, vehicleRates, vehicles } from "@/lib/db/schema";
import {
  adminPassword,
  createAdminSession,
  destroyAdminSession,
  isAdmin,
} from "@/lib/admin-auth";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password !== adminPassword()) {
    return { error: "Incorrect password" };
  }
  await createAdminSession();
  redirect("/admin/bookings");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin");
}

export async function setBookingStatusAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const allowed = ["pending_payment", "pending_confirmation", "confirmed", "completed", "cancelled"];
  if (!id || !allowed.includes(status)) return;
  const db = await getDb();
  await db.update(bookings).set({ status, updatedAt: new Date() }).where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
}

export async function saveAdminNotesAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const notes = String(formData.get("adminNotes") ?? "");
  if (!id) return;
  const db = await getDb();
  await db.update(bookings).set({ adminNotes: notes, updatedAt: new Date() }).where(eq(bookings.id, id));
  revalidatePath("/admin/bookings");
}

export async function toggleVehicleAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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

export async function updateAddOnAction(formData: FormData) {
  await requireAdmin();
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

export async function setEnquiryStatusAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["new", "responded", "closed"].includes(status)) return;
  const db = await getDb();
  await db.update(enquiries).set({ status }).where(eq(enquiries.id, id));
  revalidatePath("/admin/enquiries");
}
