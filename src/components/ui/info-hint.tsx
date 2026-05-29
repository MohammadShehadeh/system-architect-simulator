"use client";

import * as React from "react";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A small, unobtrusive "info" affordance that reveals an explanation on hover
 * or keyboard focus. Built for a learning context: any piece of jargon in the
 * UI (P99, SLO, saturation, a traffic pattern…) can be annotated inline
 * without cluttering the layout.
 *
 * The trigger is a focusable <span> rather than a <button> so it can be nested
 * inside other interactive elements (cards, labels) without producing invalid
 * nested-button markup.
 */
export function InfoHint({
  children,
  side = "top",
  className,
  iconClassName,
  label = "More information",
}: {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
  label?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="note"
          aria-label={label}
          tabIndex={0}
          className={cn(
            "inline-flex cursor-help items-center text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
            className
          )}
        >
          <Info className={cn("size-3", iconClassName)} />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[260px] font-normal normal-case leading-relaxed tracking-normal text-pretty"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
