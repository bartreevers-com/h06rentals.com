import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Pre-launch gate, called at the top of every public page. Until LAUNCH_AT
 * (Sat 18 Jul 2026, 6:00 PM WAT) visitors are redirected to the countdown
 * landing page. Checked per-request, so the showroom opens itself at launch
 * time with no redeploy. The team browses early via the crew cookie
 * (set at /coming-soon?crew=1). Admin, APIs and booking receipts stay open.
 */
const LAUNCH_AT = process.env.LAUNCH_AT ?? "2026-07-18T18:00:00+01:00";

export function launched(): boolean {
  return Date.now() >= new Date(LAUNCH_AT).getTime();
}

export async function launchGate() {
  if (launched()) return;
  const jar = await cookies();
  if (jar.get("h06_crew")?.value === "1") return;
  redirect("/coming-soon");
}
