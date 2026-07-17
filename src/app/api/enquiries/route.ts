import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { enquiries } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

const EnquirySchema = z.object({
  type: z.enum(["vip", "corporate", "custom", "contact", "sourcing"]),
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  vehicleSlug: z.string().optional(),
  message: z.string().max(3000).default(""),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = EnquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the enquiry details" }, { status: 400 });
  }
  const input = parsed.data;
  const db = await getDb();
  await db.insert(enquiries).values({
    type: input.type,
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    vehicleSlug: input.vehicleSlug ?? null,
    message: input.message,
  });
  await sendEmail({
    to: process.env.ADMIN_NOTIFY_EMAIL ?? "hello@h06rentals.com",
    subject:
      input.type === "sourcing"
        ? `SOURCING REQUEST — ${input.vehicleSlug ?? "vehicle"} for ${input.name} (act fast)`
        : `New ${input.type} enquiry — ${input.name}`,
    text: `Name: ${input.name}\nPhone: ${input.phone}\nEmail: ${input.email || "—"}\nVehicle: ${input.vehicleSlug ?? "—"}\n\n${input.message}`,
  });
  return NextResponse.json({ ok: true });
}
