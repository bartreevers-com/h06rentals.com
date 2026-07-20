/**
 * Loading states that know their place: nothing is rendered for the first
 * 1.5 seconds, so navigation never *looks* slow. Only when the network is
 * genuinely making the visitor wait do three quiet dots appear.
 */
export type LoaderVariant = "emerald" | "glass";

export function PageLoader({ variant: _variant = "emerald" }: { variant?: LoaderVariant }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="h06-quiet-loader" aria-label="Loading">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
