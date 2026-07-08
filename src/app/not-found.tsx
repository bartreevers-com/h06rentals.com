import Link from "next/link";
import { Mark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-5 pt-20 text-center">
      <Mark variant="silver" size={64} className="opacity-60" />
      <h1 className="display text-3xl text-cream">This corridor is empty</h1>
      <p className="max-w-sm text-sm text-muted">
        The page you&apos;re after isn&apos;t in the showroom. The fleet, however, is right this way.
      </p>
      <div className="flex gap-3">
        <Link href="/fleet" className="btn btn-primary btn-md">Enter the showroom</Link>
        <Link href="/" className="btn btn-ghost btn-md">Home</Link>
      </div>
    </div>
  );
}
