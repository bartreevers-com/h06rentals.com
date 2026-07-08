import Image from "next/image";
import Link from "next/link";

const VARIANT_SRC = {
  emerald: "/brand/mark-emerald.png",
  offwhite: "/brand/mark-offwhite.png",
  silver: "/brand/mark-silver.png",
  bronze: "/brand/mark-bronze.png",
  black: "/brand/mark-black.png",
} as const;

export type LogoVariant = keyof typeof VARIANT_SRC;

export function Mark({
  variant = "emerald",
  size = 36,
  className,
  priority,
}: {
  variant?: LogoVariant;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={VARIANT_SRC[variant]}
      alt="H06"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}

export function LogoLockup({
  variant = "emerald",
  size = 34,
  href = "/",
}: {
  variant?: LogoVariant;
  size?: number;
  href?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 group" aria-label="H06 Rentals home">
      <Mark variant={variant} size={size} priority />
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-semibold tracking-[0.22em] text-cream">H06</span>
        <span className="text-[0.58rem] tracking-[0.42em] text-muted uppercase mt-1">Rentals</span>
      </span>
    </Link>
  );
}
