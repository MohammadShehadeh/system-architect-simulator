import {
  Cloud,
  Database,
  Globe,
  Layers,
  ListOrdered,
  Server,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ComponentType } from "@/lib/architecture/types";

export const COMPONENT_ICONS: Record<ComponentType, LucideIcon> = {
  client: Users,
  cdn: Globe,
  "load-balancer": Layers,
  "api-server": Server,
  redis: Zap,
  postgres: Database,
  queue: ListOrdered,
};

export const COMPONENT_COLORS: Record<
  ComponentType,
  { bg: string; ring: string; icon: string }
> = {
  client: {
    bg: "bg-slate-500/10",
    ring: "ring-slate-500/30",
    icon: "text-slate-600 dark:text-slate-300",
  },
  cdn: {
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    icon: "text-sky-600 dark:text-sky-400",
  },
  "load-balancer": {
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/30",
    icon: "text-violet-600 dark:text-violet-400",
  },
  "api-server": {
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
  },
  redis: {
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
  },
  postgres: {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  queue: {
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
  },
};

export { Cloud };
