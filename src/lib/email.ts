import "server-only";
import { getDb } from "./db";
import { emailLog } from "./db/schema";

/**
 * Email delivery: uses Resend when RESEND_API_KEY is set, otherwise logs the
 * message to the email_log table so nothing is lost before keys are added.
 *
 * Every message is wrapped in the branded H06 template (emerald on ink,
 * table-based inline styles for email-client compatibility). Callers pass
 * plain text; links are auto-detected. Pass `html` to override the body
 * markup while keeping the branded frame.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.h06rentals.com";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text → paragraphs with clickable links. */
function textToHtml(text: string): string {
  const linkified = escapeHtml(text).replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2E8B6A;text-decoration:underline;">$1</a>',
  );
  return linkified
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#d8dad6;">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

/** The branded frame: H06 mark, emerald rule, ink panel, quiet footer. */
export function renderBrandedEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#0b100d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b100d;">
<tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td align="center" style="padding-bottom:26px;">
    <img src="${SITE}/brand/mark-emerald.png" width="44" height="44" alt="H06" style="display:block;margin:0 auto 10px auto;"/>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:6px;color:#e8eaec;">H06<span style="color:#8a8f8b;letter-spacing:4px;font-size:12px;">&nbsp;&nbsp;RENTALS</span></div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;color:#8a8f8b;margin-top:6px;">LAGOS &middot; PRIVATE LUXURY MOBILITY</div>
  </td></tr>
  <tr><td style="height:2px;background:linear-gradient(90deg,transparent,#2E8B6A,transparent);background-color:#2E8B6A;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="background-color:#111814;border:1px solid #223028;border-top:none;border-radius:0 0 14px 14px;padding:32px 30px;font-family:Arial,Helvetica,sans-serif;">
    ${bodyHtml}
  </td></tr>
  <tr><td align="center" style="padding-top:26px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0 0 6px 0;font-size:12px;color:#8a8f8b;">H06 Rentals &middot; 1 Gbangbala Street, Ikate, Lekki, Lagos</p>
    <p style="margin:0;font-size:12px;">
      <a href="${SITE}" style="color:#2E8B6A;text-decoration:none;">h06rentals.com</a>
      <span style="color:#3a423d;">&nbsp;&middot;&nbsp;</span>
      <a href="mailto:hello@h06rentals.com" style="color:#2E8B6A;text-decoration:none;">hello@h06rentals.com</a>
      <span style="color:#3a423d;">&nbsp;&middot;&nbsp;</span>
      <a href="https://www.instagram.com/h06rentals" style="color:#2E8B6A;text-decoration:none;">@h06rentals</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Stored in email_log instead of the real body — use for credentials. */
  logBody?: string;
}) {
  const db = await getDb();
  const from = process.env.EMAIL_FROM ?? "H06 Rentals <bookings@h06rentals.com>";
  const html = renderBrandedEmail(opts.html ?? textToHtml(opts.text));
  const loggedBody = opts.logBody ?? opts.text;
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from, to: opts.to, subject: opts.subject, text: opts.text, html });
      await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: loggedBody, status: "sent" });
      return { sent: true };
    } catch (err) {
      console.error("[email] send failed", err);
      await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: loggedBody, status: "failed" });
      return { sent: false };
    }
  }
  await db.insert(emailLog).values({ to: opts.to, subject: opts.subject, body: loggedBody, status: "logged" });
  // no key = nothing was sent; print the whole message so dev flows (e.g. OTP) stay usable
  console.log(`[email:logged] to=${opts.to} subject=${opts.subject}\n${opts.text}`);
  return { sent: false };
}
