import { redirect } from "next/navigation";
import { hasRole } from "@/lib/admin-auth";
import { listEnquiries } from "@/lib/repo";
import { customerWaLink } from "@/lib/whatsapp";
import { deleteEnquiryAction, setEnquiryStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  new: "border-emerald-glow/40 text-emerald-glow",
  responded: "border-emerald-glow/40 text-emerald-glow",
  closed: "border-cream/20 text-muted",
};

export default async function AdminEnquiries() {
  const session = await hasRole("owner", "admin", "sales");
  if (!session) redirect("/admin");
  const rows = await listEnquiries();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-2xl text-cream">Enquiries</h1>
        {(session.role === "owner" || session.role === "admin") && (
          <a href="/admin/export/enquiries" className="btn btn-ghost btn-sm" download>
            Enquiries CSV
          </a>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">VIP requests, corporate accounts and contact messages.</p>

      {rows.length === 0 ? (
        <div className="glass-subtle mt-8 p-10 text-center text-sm text-muted">No enquiries yet.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((e) => (
            <div key={e.id} className="glass-subtle p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cream/20 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider text-cream-dim">
                  {e.type}
                </span>
                <span className="text-sm font-medium text-cream">{e.name}</span>
                <span className="text-xs text-muted">{e.phone}{e.email ? ` · ${e.email}` : ""}</span>
                {e.vehicleSlug && <span className="text-xs text-cream-dim">{e.vehicleSlug}</span>}
                <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-wider ${TONE[e.status]}`}>
                  {e.status}
                </span>
              </div>
              {e.message && <p className="mt-3 text-sm leading-relaxed text-cream-dim">{e.message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={customerWaLink(e.phone, `Hello ${e.name}, this is H06 Rentals concierge — thank you for your enquiry.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm"
                >
                  WhatsApp reply
                </a>
                {(["responded", "closed"] as const).map((s) => (
                  <form key={s} action={setEnquiryStatusAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="status" value={s} />
                    <button className="btn btn-ghost btn-sm" disabled={e.status === s}>
                      Mark {s}
                    </button>
                  </form>
                ))}
                {session.role === "owner" && (
                  <form action={deleteEnquiryAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn btn-ghost btn-sm !border-red-400/40 !text-red-300">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
