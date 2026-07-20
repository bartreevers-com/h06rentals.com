import type { Metadata } from "next";
import Link from "next/link";
import { launchGate } from "@/lib/launch-gate";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Recruitment Privacy Notice — H06 Rentals",
  description: "How H06 Rentals handles candidate information during recruitment.",
};

/** Version 1.0 — referenced by vacancies.privacy_version. If this notice
 *  changes materially, bump the version here AND on new vacancies. */
export default async function RecruitmentPrivacyPage() {
  await launchGate();
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 lg:px-8">
      <Reveal>
        <p className="eyebrow eyebrow-emerald mb-3">Version 1.0 — July 2026</p>
        <h1 className="display text-4xl text-cream">Recruitment privacy notice</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This notice explains how H06 Rentals (&quot;H06&quot;, &quot;we&quot;) handles your
          information when you apply for a role with us. It applies to everything you provide
          through our careers pages. Our general site privacy policy is{" "}
          <Link href="/privacy" className="text-cream hover:text-emerald-glow">
            here
          </Link>
          .
        </p>
      </Reveal>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="eyebrow mb-2 text-cream">Who is responsible</h2>
          <p>
            H06 Rentals, 1 Gbangbala Street, Ikate, Lekki, Lagos, Nigeria is the data controller
            for recruitment. Questions or requests:{" "}
            <a href="mailto:hello@h06rentals.com" className="text-cream hover:text-emerald-glow">
              hello@h06rentals.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">What we collect</h2>
          <p>
            Only what you give us: your name, email, phone number, general location, links you
            choose to share, your answers to the application questions, and any files you upload
            (CV, supporting documents, video or audio submissions). We deliberately do not ask for
            your date of birth, religion, marital status, health information, ethnicity or a
            photograph — none of that is needed to assess an application.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">Why we process it (lawful basis)</h2>
          <p>
            We process your application because it is necessary to take steps toward a possible
            contract with you, and on our legitimate interest in running a fair, documented
            recruitment process. Core recruitment processing is <em>not</em> based on consent — we
            will never make progressing your application conditional on optional consents.
          </p>
          <p className="mt-2">
            The one thing that is consent-based is the optional <strong>talent pool</strong>: if
            you tick that (it is unticked by default), we keep your details for up to 12 months to
            contact you about future roles. You can withdraw that consent at any time from your
            dashboard or by emailing us, without affecting your current application.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">Who sees it</h2>
          <p>
            Access is role-restricted and logged: the HR team, the hiring manager for the role, and
            assessors on the interview panel — each only sees what their role requires. Files are
            stored privately and served through short-lived signed links; there are no public file
            URLs. Our infrastructure providers (hosting, database, file storage, email delivery)
            process data on our behalf under their standard data-processing terms.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">How long we keep it</h2>
          <p>
            Each vacancy states a retention period (typically 180 days after the process ends for
            unsuccessful applications). After that, your data is deleted or anonymised unless a
            legal obligation requires longer, you have joined the talent pool, or you are hired —
            in which case relevant records transfer to your staff file. Withdrawn applications
            follow the same schedule from the date of withdrawal.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">Your rights</h2>
          <p>
            You can ask for a copy of your data, correct it (your dashboard has a &quot;send a
            correction&quot; option — corrections are attached alongside your original answers, and
            the original submission is preserved for fairness), withdraw your application, object
            to processing, or ask for earlier deletion. Write to{" "}
            <a href="mailto:hello@h06rentals.com" className="text-cream hover:text-emerald-glow">
              hello@h06rentals.com
            </a>{" "}
            from your application email and we respond within 30 days. You may also complain to the
            Nigeria Data Protection Commission.
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-2 text-cream">Automated decisions</h2>
          <p>
            Simple eligibility questions (for example, right to work) are screened automatically,
            but no application is rejected without a person reviewing it. Final decisions are
            always made by people.
          </p>
        </section>
      </div>

      <Link href="/careers" className="btn btn-primary btn-md mt-12">
        Back to careers
      </Link>
    </div>
  );
}
