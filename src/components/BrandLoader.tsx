/**
 * The glass mark, swirling — H06's loading state. Emerald for the showroom,
 * clear glass for the back office. Server-safe; all motion lives in
 * globals.css.
 */
const RENDERS = {
  emerald: "/brand/render-emerald-alpha.png",
  glass: "/brand/render-glass-alpha.png",
} as const;

export type LoaderVariant = keyof typeof RENDERS;

export function BrandLoader({ size = 84, variant = "emerald" }: { size?: number; variant?: LoaderVariant }) {
  return (
    <div className="h06-loader" style={{ width: size, height: size }}>
      <div className={`h06-loader-ring ${variant === "glass" ? "h06-loader-ring-glass" : ""}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={RENDERS[variant]}
        alt="Loading"
        width={size}
        height={size}
        className="h06-loader-mark"
        draggable={false}
      />
    </div>
  );
}

/** Full-viewport centred loading state for route segments. The swirl stays
 *  invisible for the first 600ms — it appears only when the network is
 *  actually slow, never as a flash on quick navigations. */
export function PageLoader({ variant = "emerald" }: { variant?: LoaderVariant }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h06-loader-defer">
        <BrandLoader variant={variant} />
      </div>
    </div>
  );
}
