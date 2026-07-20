import "server-only";
import { getDb } from "./db";
import { emailLog } from "./db/schema";

/**
 * Email delivery: uses Resend when RESEND_API_KEY is set, otherwise logs the
 * message to the email_log table so nothing is lost before keys are added.
 */
export async function sendEmail(opts: { to: string; subject: string; text: string }) {
  const db = await getDb();
  const from = process.env.EMAIL_FROM ?? "H06 Rentals <bookings@h06rentals.com>";
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from, to: opts.to, subject: opts.subject, text: opts.text });
      await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: opts.text, status: "sent" });
      return { sent: true };
    } catch (err) {
      console.error("[email] send failed", err);
      await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: opts.text, status: "failed" });
      return { sent: false };
    }
  }
  await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: opts.text, status: "logged" });
  // no key = nothing was sent; print the whole message so dev flows (e.g. OTP) stay usable
  console.log(`[email:logged] to=${opts.to} subject=${opts.subject}\n${opts.text}`);
  return { sent: false };
}
