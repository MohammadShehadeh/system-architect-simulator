import * as React from "react";

import { cn } from "@/lib/utils";

const FRAUNCES_TEXT_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-fraunces), ui-serif, serif",
  fontWeight: 700,
  fontSize: "280px",
};

/**
 * The Palestinian flag bands + leading triangle, clipped to the M
 * letterform. The bands extend past the M's width so the clip mask is
 * what defines the shape, not the rectangles.
 */
function PalestineFlagFill() {
  return (
    <>
      <rect x="-10" y="-20" width="380" height="120" fill="#000000" />
      <rect x="-10" y="100" width="380" height="72" fill="#FFFFFF" />
      <rect x="-10" y="172" width="380" height="128" fill="#007A3D" />
      <polygon points="-10,-20 -10,300 170,138" fill="#CE1126" />
    </>
  );
}

/**
 * Square "M"-only mark, sized so the Fraunces bold M's serifs sit fully
 * inside the viewBox at small icon sizes (sidebar header, lockups,
 * favicons).
 */
function LogoMarkSvg({ className }: { className?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const mId = `mshmark-m-${uid}`;
  const clipId = `mshmark-clip-${uid}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-10 25 290 290"
      role="img"
      aria-hidden
      className={className}
    >
      <title>MSH Infra</title>
      <defs>
        <text id={mId} x="10" y="245" style={FRAUNCES_TEXT_STYLE}>
          M
        </text>
        <clipPath id={clipId}>
          <use href={`#${mId}`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <PalestineFlagFill />
      </g>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="MSH Infra"
      className={cn(
        "inline-flex size-6 shrink-0 text-foreground",
        className,
      )}
    >
      <LogoMarkSvg className="size-full" />
    </span>
  );
}

export function BrandLockup({
  className,
  logoClassName,
  textClassName,
  showText = true,
  tagline,
  taglineClassName,
}: {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  showText?: boolean;
  tagline?: string;
  taglineClassName?: string;
}) {
  if (tagline) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2.5 text-foreground",
          className,
        )}
      >
        <LogoMark className={cn("size-9 shrink-0", logoClassName)} />
        <span className="flex min-w-0 flex-col gap-0.5 leading-none">
          {showText && (
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-[0.08em]",
                textClassName,
              )}
            >
              Infra
            </span>
          )}
          <span
            className={cn(
              "truncate text-[11px] text-muted-foreground",
              taglineClassName,
            )}
          >
            {tagline}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-foreground",
        className,
      )}
    >
      <LogoMark className={cn("size-6", logoClassName)} />
      {showText && (
        <span
          className={cn(
            "text-sm font-semibold uppercase tracking-[0.06em]",
            textClassName,
          )}
        >
          Infra
        </span>
      )}
    </span>
  );
}
