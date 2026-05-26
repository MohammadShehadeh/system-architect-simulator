"use client";

import { useCallback } from "react";

import {
  COMPONENT_DESCRIPTIONS,
  COMPONENT_LABELS,
  type ComponentType,
} from "@/lib/architecture/types";
import { cn } from "@/lib/utils";

import {
  COMPONENT_COLORS,
  COMPONENT_ICONS,
} from "./component-icons";

const GROUPS: { label: string; items: ComponentType[] }[] = [
  {
    label: "Traffic",
    items: ["client", "cdn"],
  },
  {
    label: "Routing",
    items: ["load-balancer", "api-gateway"],
  },
  {
    label: "Compute",
    items: ["api-server", "microservice", "auth-service", "worker", "websocket"],
  },
  {
    label: "Data",
    items: ["redis", "postgres", "nosql", "search"],
  },
  {
    label: "Storage & Analytics",
    items: ["object-storage", "data-warehouse"],
  },
  {
    label: "Async",
    items: ["queue"],
  },
];

interface Props {
  onPick?: (type: ComponentType) => void;
}

export function ComponentPalette({ onPick }: Props) {
  const onDragStart = useCallback(
    (event: React.DragEvent, type: ComponentType) => {
      event.dataTransfer.setData("application/component-type", type);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  return (
    <div className="flex flex-col gap-3">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1 px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </div>
          <div className="flex flex-col gap-1">
            {group.items.map((type) => {
              const Icon = COMPONENT_ICONS[type];
              const colors = COMPONENT_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  onClick={() => onPick?.(type)}
                  title={COMPONENT_DESCRIPTIONS[type]}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md border border-transparent bg-card px-2 py-1.5 text-left transition-all",
                    "hover:border-border hover:bg-accent/40 active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    "cursor-grab active:cursor-grabbing"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md ring-1",
                      colors.bg,
                      colors.ring
                    )}
                  >
                    <Icon className={cn("size-3.5", colors.icon)} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-medium">
                      {COMPONENT_LABELS[type]}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {COMPONENT_DESCRIPTIONS[type]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
