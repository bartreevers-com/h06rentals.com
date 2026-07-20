import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { launchGate } from "@/lib/launch-gate";
import { Reveal } from "@/components/Reveal";
import { getSession } from "@/lib/admin-auth";
import { getVacancyBySlug, isRecruitRole, vacancyIsOpen } from "@/lib/recruitment/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVacancyBySlug(slug);
  if (!v || !["published", "paused", "closed"].includes(v.status)) return { title: "Careers — H06 Rentals" };
  return {
    title: `${v.title} — Careers at H06 Rentals`,
    description: v.summary.slice(0, 160),
  };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  await launchGate();
  const { slug } = await params;
  const v = await getVacancyBySlug(slug);
  if (!v) notFound();
  // unpublished vacancies are visible only as a preview to recruitment staff
  const isPublic = ["published", "paused", "closed"].includes(v.status);
  let previewing = false;
  if (!isPublic) {
    const staff = await getSession();
    if (!staff || !isRecruitRole(staff.role)) notFound();
    previewing = true;
  }
  const open = vacancyIsOpen(v);

  return (
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-28 lg:px-8">
      {previewing && (
        <div className="glass-subtle mb-6 border-amber-400/30 p-3 text-xs text-amber-300">
          Staff preview — this vacancy is {v.status.replace("_", " ")} and not visible to the public.
        </div>
      )}
      <Reveal>
        <Link href="/careers" className="text-xs uppercase tracking-widest text-muted hover:text-cream">
          ← All roles
        </Link>
        <p className="eyebrow eyebrow-emerald mb-3 mt-6">
          {v.department} · {v.reference}
        </p>
        <h1 className="display text-4xl text-cream md:text-5xl">{v.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>{v.location}</span>
          <span className="capitalize">{v.workArrangement.replace("_", "-")}</span>
          <span className="capitalize">{v.engagementType.replace("_", "-")}</span>
          {v.expectedStart && <span>Starts: {v.expectedStart}</span>}
          {v.compensationPublic && v.compensation && <span>{v.compensation}</span>}
          {v.closesAt && open && (
            <span>
              Apply by{" "}
              {v.closesAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-cream/90">{v.summary}</p>
      </Reveal>

      {v.responsibilities.length > 0 && (
        <Reveal delay={0.08}>
          <h2 className="eyebrow mb-3 mt-10">What you&apos;ll do</h2>
          <ul className="max-w-2xl space-y-2 text-sm leading-relaxed text-muted">
            {v.responsibilities.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="mt-0.5 text-emerald-glow">—</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {v.essentials.length > 0 && (
        <Reveal delay={0.1}>
          <h2 className="eyebrow mb-3 mt-10">You must have</h2>
          <ul className="max-w-2xl space-y-2 text-sm leading-relaxed text-muted">
            {v.essentials.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="mt-0.5 text-emerald-glow">—</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {v.desirables.length > 0 && (
        <Reveal delay={0.12}>
          <h2 className="eyebrow mb-3 mt-10">Even better if</h2>
          <ul className="max-w-2xl space-y-2 text-sm leading-relaxed text-muted">
            {v.desirables.map((r) => (
              <li key={r} className="flex gap-3">
                <span className="mt-0.5 text-emerald-glow">—</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <Reveal delay={0.15}>
        <div className="glass mt-12 p-7">
          {open ? (
            <>
              <h2 className="display text-2xl text-cream">Ready to apply?</h2>
              <p className="mt-2 text-sm text-muted">
                The application takes 10–20 minutes. You can save a draft and come back — we
                verify your email first so your work is never lost.
              </p>
              <Link href={`/careers/${v.slug}/apply`} className="btn btn-primary btn-lg mt-5">
                Start application
              </Link>
              <p className="mt-4 text-xs text-muted">
                Before you apply, read the{" "}
                <Link href="/careers/privacy" className="text-cream hover:text-emerald-glow">
                  recruitment privacy notice
                </Link>{" "}
                (v{v.privacyVersion}) — it explains exactly how we handle your information.
              </p>
            </>
          ) : (
            <>
              <h2 className="display text-2xl text-cream">
                {v.status === "paused" ? "Applications paused" : "Applications closed"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {v.status === "paused"
                  ? "This role is temporarily paused. Check back soon, or follow @h06rentals for updates."
                  : "This role is no longer accepting applications."}
              </p>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}
