// Inline brand mark. Lowercase `h` glyph used as both the favicon (with
// rounded-square enclosure) and inline on the site (just the glyph, picks
// up currentColor). Keep this file the only source of truth — if the path
// changes, update app/icon.svg in lockstep.

interface Props {
  size?: number;
  withFrame?: boolean;
  className?: string;
}

const PATH =
  "M10.5 9 V23 M10.5 14.5 Q10.5 12 13 12 H19 Q21.5 12 21.5 14.5 V23";

export function HunchMark({ size = 24, withFrame = false, className }: Props) {
  if (withFrame) {
    return (
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect width="32" height="32" rx="7" fill="currentColor" />
        <path
          d={PATH}
          stroke="black"
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d={PATH}
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Combined mark + wordmark. Used in headers / nav.
export function HunchLogo({
  size = 24,
  className,
  withFrame = false,
}: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <HunchMark size={size} withFrame={withFrame} />
      <span className="text-base font-medium tracking-tight">hunch</span>
    </span>
  );
}
