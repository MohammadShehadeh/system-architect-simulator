import {
  Box,
  Boxes,
  Cloud,
  Database,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  ListOrdered,
  Network,
  Radio,
  Search,
  Server,
  Settings2,
  Shield,
  Users,
  Warehouse,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ComponentType } from "@/lib/architecture/types";

export const COMPONENT_ICONS: Record<ComponentType, LucideIcon> = {
  client: Users,
  cdn: Globe,
  "load-balancer": Layers,
  "api-gateway": Shield,
  "api-server": Server,
  microservice: Boxes,
  "auth-service": KeyRound,
  worker: Settings2,
  websocket: Radio,
  redis: Zap,
  postgres: Database,
  nosql: HardDrive,
  search: Search,
  "object-storage": Box,
  "data-warehouse": Warehouse,
  queue: ListOrdered,
};

export const COMPONENT_COLORS: Record<
  ComponentType,
  { bg: string; ring: string; icon: string; dot: string }
> = {
  client: {
    bg: "bg-slate-500/10",
    ring: "ring-slate-500/30",
    icon: "text-slate-600 dark:text-slate-300",
    dot: "#64748b",
  },
  cdn: {
    bg: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    icon: "text-sky-600 dark:text-sky-400",
    dot: "#0ea5e9",
  },
  "load-balancer": {
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/30",
    icon: "text-violet-600 dark:text-violet-400",
    dot: "#8b5cf6",
  },
  "api-gateway": {
    bg: "bg-indigo-500/10",
    ring: "ring-indigo-500/30",
    icon: "text-indigo-600 dark:text-indigo-400",
    dot: "#6366f1",
  },
  "api-server": {
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    dot: "#3b82f6",
  },
  microservice: {
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    dot: "#06b6d4",
  },
  "auth-service": {
    bg: "bg-fuchsia-500/10",
    ring: "ring-fuchsia-500/30",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    dot: "#d946ef",
  },
  worker: {
    bg: "bg-yellow-500/10",
    ring: "ring-yellow-500/30",
    icon: "text-yellow-600 dark:text-yellow-400",
    dot: "#eab308",
  },
  websocket: {
    bg: "bg-pink-500/10",
    ring: "ring-pink-500/30",
    icon: "text-pink-600 dark:text-pink-400",
    dot: "#ec4899",
  },
  redis: {
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
    dot: "#f43f5e",
  },
  postgres: {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    dot: "#10b981",
  },
  nosql: {
    bg: "bg-teal-500/10",
    ring: "ring-teal-500/30",
    icon: "text-teal-600 dark:text-teal-400",
    dot: "#14b8a6",
  },
  search: {
    bg: "bg-orange-500/10",
    ring: "ring-orange-500/30",
    icon: "text-orange-600 dark:text-orange-400",
    dot: "#f97316",
  },
  "object-storage": {
    bg: "bg-stone-500/10",
    ring: "ring-stone-500/30",
    icon: "text-stone-600 dark:text-stone-400",
    dot: "#78716c",
  },
  "data-warehouse": {
    bg: "bg-lime-500/10",
    ring: "ring-lime-500/30",
    icon: "text-lime-600 dark:text-lime-400",
    dot: "#84cc16",
  },
  queue: {
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    icon: "text-amber-600 dark:text-amber-400",
    dot: "#f59e0b",
  },
};

export { Cloud, Network };
