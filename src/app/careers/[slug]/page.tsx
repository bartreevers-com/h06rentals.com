import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { launchGate } from "@/lib/launch-gate";
import { Reveal } from "@/components/Reveal";
import { getSession } from "@/lib/admin-auth";
import { getVacancyBySlug, isRecruitRole, vacancyIsOpen } from "@/lib/recruitment/repo";

export const dynamic = "force-dynamic";

const ENGAGEMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  freelance: "Freelance",
};

const ARRANGEMENT_LABELS: Record<string, string> = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t hairline pt-8">
      <h2 className="display text-xl text-cream">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm leading-relaxed text-cream-dim">
      {items.map((r) => (
        <li key={r} className="flex gap-3">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-glow" />
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
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

  const facts: [string, string][] = [
    ["Engagement", ENGAGEMENT_LABELS[v.engagementType] ?? v.engagementType],
    ["Location", v.location],
    ["Arrangement", ARRANGEMENT_LABELS[v.workArrangement] ?? v.workArrangement],
    ...(v.expectedStart ? ([["Expected start", v.expectedStart]] as [string, string][]) : []),
    ...(v.compensationPublic && v.compensation
      ? ([["Compensation", v.compensation]] as [string, string][])
      : []),
    ...(v.closesAt
      ? ([
          [
            "Apply by",
            v.closesAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          ],
        ] as [string, string][])
      : []),
    ["Reference", v.reference],
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-28 lg:px-8">
      {previewing && (
        <div className="glass-subtle mb-6 border-amber-400/30 p-3 text-xs text-amber-300">
          Staff preview — this vacancy is {v.status.replace("_", " ")} and not visible to the public.
        </div>
      )}

      <Reveal>
        <Link href="/careers" className="text-xs uppercase tracking-widest text-muted hover:text-cream">
          ← All roles
        </Link>
        <p className="eyebrow eyebrow-emerald mb-3 mt-6">{v.department}</p>
        <h1 className="display max-w-3xl text-4xl text-cream md:text-5xl">{v.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {ENGAGEMENT_LABELS[v.engagementType] ?? v.engagementType} · {v.location} ·{" "}
          {ARRANGEMENT_LABELS[v.workArrangement] ?? v.workArrangement}
        </p>
      </Reveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* the job description */}
        <Reveal delay={0.05}>
          <div className="space-y-8">
            <section>
              <h2 className="display text-xl text-cream">About the role</h2>
              <p className="mt-4 text-[15px] leading-[1.8] text-cream/90">{v.summary}</p>
            </section>

            {v.responsibilities.length > 0 && (
              <Section title="What you'll do">
                <BulletList items={v.responsibilities} />
              </Section>
            )}

            {v.essentials.length > 0 && (
              <Section title="What you must bring">
                <BulletList items={v.essentials} />
              </Section>
            )}

            {v.desirables.length > 0 && (
              <Section title="It also helps if you have">
                <BulletList items={v.desirables} />
              </Section>
            )}

            {v.stages.length > 0 && (
              <Section title="How we hire">
                <ol className="space-y-3 text-sm leading-relaxed text-cream-dim">
                  {v.stages.map((s, i) => (
                    <li key={s} className="flex items-start gap-3.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-glow/40 text-[11px] font-semibold text-emerald-glow">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 text-xs leading-relaxed text-muted">
                  Every application is read by a person. Interviews are scored independently by a
                  panel against published competencies, and the final decision is made by our
                  leadership — never by software.
                </p>
              </Section>
            )}

            <section className="border-t hairline pt-8 text-xs leading-relaxed text-muted">
              Your information is handled under our{" "}
              <Link href="/careers/privacy" className="text-cream hover:text-emerald-glow">
                recruitment privacy notice
              </Link>{" "}
              (v{v.privacyVersion}). We never ask for your date of birth, religion, marital status,
              ethnicity or a photograph — none of it is needed to assess an application.
            </section>
          </div>
        </Reveal>

        {/* role at a glance */}
        <Reveal delay={0.1}>
          <aside className="lg:sticky lg:top-28">
            <div className="glass p-6">
              <h2 className="eyebrow mb-5">Role at a glance</h2>
              <dl className="space-y-3.5 text-sm">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-widest text-muted">{label}</dt>
                    <dd className="mt-0.5 text-cream">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 border-t hairline pt-6">
                {open ? (
                  <>
                    <Link href={`/careers/${v.slug}/apply`} className="btn btn-primary btn-md w-full">
                      Apply for this role
                    </Link>
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                      10–20 minutes. Save a draft and come back any time before the closing date.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {v.status === "paused"
                      ? "Applications are temporarily paused — check back soon."
                      : "This role is no longer accepting applications."}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </Reveal>
      </div>

      {open && (
        <Reveal delay={0.12}>
          <div className="glass mt-14 flex flex-wrap items-center justify-between gap-5 p-7">
            <div>
              <h2 className="display text-2xl text-cream">Sound like you?</h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                We care about presence and judgement, not a perfect CV. If the role fits, show us.
              </p>
            </div>
            <Link href={`/careers/${v.slug}/apply`} className="btn btn-primary btn-lg">
              Start application
            </Link>
          </div>
        </Reveal>
      )}
    </div>
  );
}
