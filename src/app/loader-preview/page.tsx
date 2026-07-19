import type { Metadata } from "next";
import { BrandLoader } from "@/components/BrandLoader";

export const metadata: Metadata = {
  title: "Loader preview",
  robots: { index: false, follow: false },
};

/** Internal: preview the loading mark (matchday morph, solidarity colours). */
export default function LoaderPreview() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-ink">
      <BrandLoader size={180} />
      <p className="text-xs uppercase tracking-[0.3em] text-muted">The loading mark, as customers see it</p>
    </div>
  );
}
