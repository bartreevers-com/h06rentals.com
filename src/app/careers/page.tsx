import type { Metadata } from "next";
import Link from "next/link";
import { launchGate } from "@/lib/launch-gate";
import { Reveal } from "@/components/Reveal";
import { publishedVacancies, vacancyIsOpen } from "@/lib/recruitment/repo";

export const metadata: Metadata = {
  title: "Careers — Join H06 Rentals, Lagos",
  description:
    "Open roles at H06 Rentals: hosting, driving, sales, operations and more. Build Lagos's most considered luxury mobility brand with us.",
};

// Served from the edge cache and refreshed in the background every minute —
// visitors get an instant response; the database is off the hot path.
export const revalidate = 60;

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

export default async function CareersPage() {
  await launchGate();
  const vacancies = await publishedVacancies();
  const now = new Date();

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 lg:px-8">
      <Reveal>
        <p className="eyebrow eyebrow-emerald mb-3">Careers at H06</p>
        <h1 className="display text-4xl text-cream md:text-5xl">Build the brand with us</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          H06 is a small team doing considered work — luxury mobility, hosted properly. When we
          open a role, it appears here. Every application is read by a person.
        </p>
      </Reveal>

      <div className="mt-12 space-y-5">
        {vacancies.length === 0 && (
          <Reveal>
            <div className="glass p-8 text-sm text-muted">
              No roles are open right now. Follow{" "}
              <a
                href="https://www.instagram.com/h06rentals"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cream hover:text-emerald-glow"
              >
                @h06rentals
              </a>{" "}
              — new openings are announced there first.
            </div>
          </Reveal>
        )}

        {vacancies.map((v, i) => {
          const open = vacancyIsOpen(v, now);
          return (
            <Reveal key={v.id} delay={i * 0.05}>
              <Link
                href={`/careers/${v.slug}`}
                className="glass block p-7 transition hover:border-emerald-glow/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow mb-2">{v.department}</p>
                    <h2 className="display text-2xl text-cream">{v.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{v.summary}</p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{ENGAGEMENT_LABELS[v.engagementType] ?? v.engagementType}</p>
                    <p className="mt-1">
                      {v.location} · {ARRANGEMENT_LABELS[v.workArrangement] ?? v.workArrangement}
                    </p>
                    {v.closesAt && open && (
                      <p className="mt-1">
                        Closes{" "}
                        {v.closesAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                      </p>
                    )}
                    {!open && <p className="mt-1 text-cream/70">Applications closed</p>}
                  </div>
                </div>
                <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-glow">
                  {open ? "View role & apply →" : "View role →"}
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={0.15}>
        <div className="glass-subtle mt-12 p-6 text-xs leading-relaxed text-muted">
          Already applied?{" "}
          <Link href="/careers/dashboard" className="text-cream hover:text-emerald-glow">
            Sign in to your candidate dashboard
          </Link>{" "}
          to track status, withdraw or send a correction. How we handle your data:{" "}
          <Link href="/careers/privacy" className="text-cream hover:text-emerald-glow">
            recruitment privacy notice
          </Link>
          .
        </div>
      </Reveal>
    </div>
  );
}
