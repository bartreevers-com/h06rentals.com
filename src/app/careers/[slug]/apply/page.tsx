import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { launchGate } from "@/lib/launch-gate";
import { getCandidate } from "@/lib/candidate-auth";
import { applicationFilesFor, draftApplication, getVacancyBySlug, vacancyIsOpen } from "@/lib/recruitment/repo";
import { ApplyForm, type ApplyVacancy } from "./ApplyForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply — Careers at H06 Rentals",
  robots: { index: false },
};

export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  await launchGate();
  const { slug } = await params;
  const vacancy = await getVacancyBySlug(slug);
  if (!vacancy || !["published", "paused", "closed"].includes(vacancy.status)) notFound();

  if (!vacancyIsOpen(vacancy)) {
    return (
      <div className="mx-auto max-w-2xl px-5 pb-20 pt-32 lg:px-8">
        <div className="glass p-8 text-center">
          <h1 className="display text-3xl text-cream">Applications closed</h1>
          <p className="mt-3 text-sm text-muted">
            {vacancy.title} is no longer accepting applications.
          </p>
          <Link href="/careers" className="btn btn-primary btn-md mt-6">
            See open roles
          </Link>
        </div>
      </div>
    );
  }

  const candidate = await getCandidate();
  let existing: { id: number; ref: string; status: string; form: Record<string, unknown> } | null = null;
  let files: { id: number; kind: string; filename: string }[] = [];
  if (candidate) {
    const app = await draftApplication(vacancy.id, candidate.id);
    if (app) {
      existing = { id: app.id, ref: app.ref, status: app.status, form: app.form };
      files = (await applicationFilesFor(app.id)).map((f) => ({ id: f.id, kind: f.kind, filename: f.filename }));
    }
  }

  const applyVacancy: ApplyVacancy = {
    id: vacancy.id,
    title: vacancy.title,
    slug: vacancy.slug,
    reference: vacancy.reference,
    privacyVersion: vacancy.privacyVersion,
    retentionDays: vacancy.retentionDays,
    closesAt: vacancy.closesAt ? vacancy.closesAt.toISOString() : null,
    questions: vacancy.questions,
    requiredDocs: vacancy.requiredDocs,
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 lg:px-8">
      <Link
        href={`/careers/${vacancy.slug}`}
        className="text-xs uppercase tracking-widest text-muted hover:text-cream"
      >
        ← Back to role
      </Link>
      <p className="eyebrow eyebrow-emerald mb-2 mt-6">Application — {vacancy.reference}</p>
      <h1 className="display text-3xl text-cream md:text-4xl">{vacancy.title}</h1>
      <ApplyForm
        vacancy={applyVacancy}
        signedInEmail={candidate?.email ?? null}
        existing={existing}
        existingFiles={files}
      />
    </div>
  );
}
