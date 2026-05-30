import {
  Box,
  Boxes,
  HardDrive,
  Network,
  Server,
  Share2,
  type LucideIcon,
} from "lucide-react";

import type { EntityStatus, EntityType } from "@/lib/proxmox/types";

export const ENTITY_ICONS: Record<EntityType, LucideIcon> = {
  host: Server,
  vm: Boxes,
  container: Box,
  bridge: Network,
  vnet: Share2,
  storage: HardDrive,
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  host: "Node",
  vm: "VM",
  container: "Container",
  bridge: "Bridge",
  vnet: "SDN VNet",
  storage: "Storage",
};

/** Tailwind classes for the icon chip + a hex dot for the minimap. */
export const ENTITY_ACCENT: Record<
  EntityType,
  { bg: string; icon: string; dot: string }
> = {
  host: {
    bg: "bg-indigo-500/10 ring-indigo-500/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    dot: "#6366f1",
  },
  vm: {
    bg: "bg-blue-500/10 ring-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    dot: "#3b82f6",
  },
  container: {
    bg: "bg-cyan-500/10 ring-cyan-500/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    dot: "#06b6d4",
  },
  bridge: {
    bg: "bg-violet-500/10 ring-violet-500/30",
    icon: "text-violet-600 dark:text-violet-400",
    dot: "#8b5cf6",
  },
  vnet: {
    bg: "bg-fuchsia-500/10 ring-fuchsia-500/30",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    dot: "#d946ef",
  },
  storage: {
    bg: "bg-amber-500/10 ring-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
    dot: "#f59e0b",
  },
};

export const STATUS_DOT: Record<EntityStatus, string> = {
  running: "bg-emerald-500",
  online: "bg-emerald-500",
  stopped: "bg-slate-400",
  offline: "bg-red-500",
  unknown: "bg-amber-500",
};

export const STATUS_LABEL: Record<EntityStatus, string> = {
  running: "Running",
  online: "Online",
  stopped: "Stopped",
  offline: "Offline",
  unknown: "Unknown",
};
