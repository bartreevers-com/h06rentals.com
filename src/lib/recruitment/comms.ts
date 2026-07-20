import "server-only";
import { getDb } from "../db";
import { candidateComms } from "../db/schema";
import { sendEmail } from "../email";

/**
 * Candidate communications. Approved templates with variables, rendered
 * server-side, delivered via the existing email service, and logged with
 * delivery status. Internal notes never travel through here.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.h06rentals.com";

export interface TemplateVars {
  firstName?: string;
  vacancyTitle?: string;
  applicationRef?: string;
  closingDate?: string;
  detail?: string; // free slot for missing-info / instructions
}

const SIGNATURE = ["", "H06 Rentals — Careers", `${SITE_URL}/careers`].join("\n");

export const COMM_TEMPLATES: Record<
  string,
  { label: string; subject: (v: TemplateVars) => string; body: (v: TemplateVars) => string }
> = {
  submission_confirmation: {
    label: "Submission confirmation",
    subject: (v) => `Application received — ${v.vacancyTitle} (${v.applicationRef})`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `Thank you — your application for ${v.vacancyTitle} has been received.`,
        `Your reference is ${v.applicationRef}. Keep it for any correspondence.`,
        ``,
        `You can track your application, request a correction, or withdraw at any time:`,
        `${SITE_URL}/careers/dashboard`,
        SIGNATURE,
      ].join("\n"),
  },
  draft_reminder: {
    label: "Draft application reminder",
    subject: (v) => `Your ${v.vacancyTitle} application is waiting`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `You started an application for ${v.vacancyTitle} but haven't submitted it yet.`,
        v.closingDate ? `Applications close on ${v.closingDate}.` : ``,
        ``,
        `Pick up where you left off: ${SITE_URL}/careers/dashboard`,
        SIGNATURE,
      ].join("\n"),
  },
  missing_information: {
    label: "Missing information",
    subject: (v) => `Action needed on your application ${v.applicationRef}`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `We need a little more from you to progress your application for ${v.vacancyTitle}:`,
        ``,
        v.detail ?? "",
        ``,
        `Reply through your dashboard: ${SITE_URL}/careers/dashboard`,
        SIGNATURE,
      ].join("\n"),
  },
  correction_confirmation: {
    label: "Correction received",
    subject: (v) => `Correction received — ${v.applicationRef}`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `We've recorded your correction to application ${v.applicationRef}. Your original`,
        `submission is preserved and the amendment sits alongside it for the panel.`,
        SIGNATURE,
      ].join("\n"),
  },
  shortlist_invitation: {
    label: "Shortlist invitation",
    subject: (v) => `You've been shortlisted — ${v.vacancyTitle}`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `Good news: your application for ${v.vacancyTitle} (${v.applicationRef}) has been shortlisted.`,
        ``,
        v.detail ?? `We'll be in touch shortly with next steps.`,
        SIGNATURE,
      ].join("\n"),
  },
  rejection: {
    label: "Outcome — unsuccessful",
    subject: (v) => `Your application for ${v.vacancyTitle}`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `Thank you for the time and care you put into your application for ${v.vacancyTitle}.`,
        `After careful consideration we won't be taking it further on this occasion.`,
        ``,
        `We'd be glad to see you apply for future H06 roles.`,
        SIGNATURE,
      ].join("\n"),
  },
  withdrawal_confirmation: {
    label: "Withdrawal confirmation",
    subject: (v) => `Application withdrawn — ${v.applicationRef}`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `As requested, your application ${v.applicationRef} for ${v.vacancyTitle} has been withdrawn.`,
        `If this was a mistake, contact us and we can look into it.`,
        SIGNATURE,
      ].join("\n"),
  },
  talent_pool_request: {
    label: "Talent-pool consent request",
    subject: () => `May we keep your details for future H06 roles?`,
    body: (v) =>
      [
        `Dear ${v.firstName ?? "candidate"},`,
        ``,
        `We'd like to keep your details on file for future opportunities at H06.`,
        `This is entirely optional. You can grant or decline consent from your dashboard:`,
        `${SITE_URL}/careers/dashboard`,
        SIGNATURE,
      ].join("\n"),
  },
};

export type CommTemplate = keyof typeof COMM_TEMPLATES;

/** Render, send, and log a message — an approved template, or a manual
 *  one written by HR/Owner. Returns delivery status. */
export async function sendCandidateComm(
  opts: {
    candidateId: number;
    applicationId?: number;
    email: string;
    sentBy?: string;
  } & (
    | { template: CommTemplate; vars: TemplateVars; manual?: undefined }
    | { manual: { subject: string; body: string }; template?: undefined; vars?: undefined }
  ),
): Promise<"sent" | "logged" | "failed"> {
  let subject: string;
  let body: string;
  if (opts.manual) {
    subject = opts.manual.subject;
    body = [opts.manual.body, SIGNATURE].join("\n");
  } else {
    const tpl = COMM_TEMPLATES[opts.template];
    subject = tpl.subject(opts.vars);
    body = tpl.body(opts.vars);
  }
  let status: "sent" | "logged" | "failed";
  try {
    const result = await sendEmail({ to: opts.email, subject, text: body });
    status = result.sent ? "sent" : "logged";
  } catch {
    status = "failed";
  }
  const db = await getDb();
  await db.insert(candidateComms).values({
    candidateId: opts.candidateId,
    applicationId: opts.applicationId ?? null,
    template: opts.template ?? "manual",
    subject,
    body,
    status,
    sentBy: opts.sentBy ?? "system",
  });
  return status;
}

/** Render a template without sending — for admin preview. */
export function previewComm(template: keyof typeof COMM_TEMPLATES, vars: TemplateVars) {
  const tpl = COMM_TEMPLATES[template];
  return { subject: tpl.subject(vars), body: tpl.body(vars) };
}
