/**
 * The emerald glass mark, swirling — H06's loading state.
 * Server-safe; all motion lives in globals.css.
 */
export function BrandLoader({ size = 84 }: { size?: number }) {
  return (
    <div className="h06-loader" style={{ width: size, height: size }}>
      <div className="h06-loader-ring" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/render-emerald-alpha.png"
        alt="Loading"
        width={size}
        height={size}
        className="h06-loader-mark"
        draggable={false}
      />
    </div>
  );
}

/** Full-viewport centred loading state for route segments. */
export function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <BrandLoader />
    </div>
  );
}
