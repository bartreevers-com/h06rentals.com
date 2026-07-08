/**
 * Elegant line-art vehicle silhouettes used while studio photography and 360°
 * assets for each vehicle are in production. Deliberately drawn as "spec
 * sheet" blueprints so nothing pretends to be a real photo of the car.
 */
export function VehicleSilhouette({
  category,
  className,
  stroke = "rgba(63, 174, 133, 0.75)",
}: {
  category: string;
  className?: string;
  stroke?: string;
}) {
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (category === "pickup") {
    return (
      <svg viewBox="0 0 400 170" className={className} aria-hidden>
        <path
          {...common}
          d="M28 130 L28 102 Q28 90 42 88 L96 82 L122 46 Q126 38 138 38 L204 38 Q214 38 216 48 L220 84 L356 88 Q370 90 373 100 L377 122 Q379 130 368 130 L348 130 M306 130 L140 130 M90 130 L38 130 Q28 130 28 126 Z"
        />
        <path {...common} d="M136 48 L204 48 L207 78 L114 82 Z" opacity={0.55} />
        <path {...common} d="M226 90 L350 92" opacity={0.4} />
        <circle {...common} cx="115" cy="130" r="25" />
        <circle {...common} cx="327" cy="130" r="25" />
        <circle {...common} cx="115" cy="130" r="10" opacity={0.5} />
        <circle {...common} cx="327" cy="130" r="10" opacity={0.5} />
      </svg>
    );
  }

  if (category === "bus") {
    return (
      <svg viewBox="0 0 400 170" className={className} aria-hidden>
        <path
          {...common}
          d="M30 130 L30 48 Q30 32 48 32 L336 32 Q360 32 364 52 L370 108 Q372 130 354 130 L338 130 M300 130 L128 130 M86 130 L46 130 Q30 130 30 122 Z"
        />
        <path {...common} d="M54 48 L94 48 L94 80 L54 80 Z" opacity={0.5} />
        <path {...common} d="M114 48 L154 48 L154 80 L114 80 Z" opacity={0.5} />
        <path {...common} d="M174 48 L214 48 L214 80 L174 80 Z" opacity={0.5} />
        <path {...common} d="M234 48 L274 48 L274 80 L234 80 Z" opacity={0.5} />
        <path {...common} d="M294 48 L336 48 L342 80 L294 80 Z" opacity={0.5} />
        <circle {...common} cx="107" cy="130" r="23" />
        <circle {...common} cx="319" cy="130" r="23" />
      </svg>
    );
  }

  if (category === "exotic") {
    // boxy G-Wagon-style profile
    return (
      <svg viewBox="0 0 400 170" className={className} aria-hidden>
        <path
          {...common}
          d="M30 130 L30 96 Q30 86 42 84 L100 80 L116 44 Q120 34 132 34 L306 34 Q318 34 320 46 L324 80 L352 86 Q366 90 368 100 L372 122 Q374 130 362 130 L344 130 M310 130 L142 130 M90 130 L40 130 Q30 130 30 126 Z"
        />
        <path {...common} d="M132 44 L196 44 L196 76 L118 78 Z" opacity={0.55} />
        <path {...common} d="M208 44 L296 44 L308 76 L208 76 Z" opacity={0.55} />
        <path {...common} d="M52 96 L80 96" opacity={0.6} />
        <circle {...common} cx="116" cy="130" r="26" />
        <circle {...common} cx="326" cy="130" r="26" />
        <circle {...common} cx="116" cy="130" r="10" opacity={0.5} />
        <circle {...common} cx="326" cy="130" r="10" opacity={0.5} />
      </svg>
    );
  }

  // default: suv / luxury SUV profile
  return (
    <svg viewBox="0 0 400 170" className={className} aria-hidden>
      <path
        {...common}
        d="M30 132 L30 102 Q30 90 44 88 L108 80 L136 42 Q142 32 156 32 L290 32 Q302 32 308 42 L332 80 L354 86 Q368 90 370 100 L374 124 Q376 132 364 132 L346 132 M310 132 L144 132 M92 132 L40 132 Q30 132 30 128 Z"
      />
      <path {...common} d="M150 42 L204 42 L204 74 L124 78 Z" opacity={0.55} />
      <path {...common} d="M216 42 L284 42 L302 74 L216 74 Z" opacity={0.55} />
      <path {...common} d="M54 98 L82 98" opacity={0.6} />
      <circle {...common} cx="118" cy="132" r="26" />
      <circle {...common} cx="328" cy="132" r="26" />
      <circle {...common} cx="118" cy="132" r="10" opacity={0.5} />
      <circle {...common} cx="328" cy="132" r="10" opacity={0.5} />
    </svg>
  );
}
