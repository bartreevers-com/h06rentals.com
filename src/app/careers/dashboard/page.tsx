import type { Metadata } from "next";
import Link from "next/link";
import { launchGate } from "@/lib/launch-gate";
import { getCandidate } from "@/lib/candidate-auth";
import { applicationFilesFor, candidateApplications } from "@/lib/recruitment/repo";
import { CandidateSignIn } from "./CandidateSignIn";
import { ApplicationCard, SignOutButton, type DashboardApp } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Candidate dashboard — H06 Rentals Careers",
  robots: { index: false },
};

export default async function CandidateDashboard() {
  await launchGate();
  const candidate = await getCandidate();

  if (!candidate) {
    return (
      <div className="mx-auto max-w-md px-5 pb-20 pt-32 lg:px-8">
        <p className="eyebrow eyebrow-emerald mb-3">Candidate sign-in</p>
        <h1 className="display text-3xl text-cream">Check on your application</h1>
        <p className="mt-3 text-sm text-muted">
          Enter the email you applied with — we&apos;ll send a 6-digit code. No password needed.
        </p>
        <div className="glass mt-7 p-6">
          <CandidateSignIn />
        </div>
      </div>
    );
  }

  const rows = await candidateApplications(candidate.id);
  const apps: DashboardApp[] = [];
  for (const { application: a, vacancy: v } of rows) {
    const files = await applicationFilesFor(a.id);
    apps.push({
      id: a.id,
      ref: a.ref,
      status: a.status,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      talentPoolConsent: a.talentPoolConsent,
      vacancyTitle: v.title,
      vacancySlug: v.slug,
      vacancyOpen: v.status === "published",
      files: files.map((f) => ({ id: f.id, kind: f.kind, filename: f.filename })),
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow eyebrow-emerald mb-3">Candidate dashboard</p>
          <h1 className="display text-3xl text-cream md:text-4xl">
            {candidate.firstName ? `Hello, ${candidate.firstName}` : "Your applications"}
          </h1>
          <p className="mt-2 text-xs text-muted">Signed in as {candidate.email}</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-10 space-y-5">
        {apps.length === 0 && (
          <div className="glass p-8 text-sm text-muted">
            Nothing here yet.{" "}
            <Link href="/careers" className="text-cream hover:text-emerald-glow">
              Browse open roles
            </Link>{" "}
            to start an application.
          </div>
        )}
        {apps.map((app) => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </div>

      <p className="mt-10 text-[11px] leading-relaxed text-muted">
        Want a copy of your data, or to have it deleted sooner than our standard retention period?
        Email{" "}
        <a href="mailto:hello@h06rentals.com" className="text-cream hover:text-emerald-glow">
          hello@h06rentals.com
        </a>{" "}
        from this address. Full details in the{" "}
        <Link href="/careers/privacy" className="text-cream hover:text-emerald-glow">
          recruitment privacy notice
        </Link>
        .
      </p>
    </div>
  );
}
