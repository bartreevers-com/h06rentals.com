import Link from "next/link";
import { GarageRun } from "@/components/GarageRun";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-5 px-5 pt-20 text-center">
      <h1 className="display text-3xl text-cream">This corridor is empty</h1>
      <p className="max-w-sm text-sm text-muted">
        The page you&apos;re after isn&apos;t in the showroom. The fleet, however, is right this way.
      </p>
      <div className="flex gap-3">
        <Link href="/fleet" className="btn btn-primary btn-md">Enter the showroom</Link>
        <Link href="/" className="btn btn-ghost btn-md">Home</Link>
      </div>

      {/* the unlisted H06 run — our nod to the offline dinosaur */}
      <GarageRun />
    </div>
  );
}
