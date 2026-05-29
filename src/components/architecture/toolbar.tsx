"use client";

import { useState } from "react";
import {
  LayoutTemplate,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/ui/info-hint";
import {
  useArchitectureStore,
  useTemporalStore,
} from "@/lib/store/architecture-store";
import { TEMPLATES_BY_ID } from "@/lib/architecture/templates";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { cn } from "@/lib/utils";

import { TemplatesDialog } from "./templates-dialog";

/**
 * Traffic patterns shape how request volume changes over the course of a run.
 * Descriptions mirror the engine's trafficFactor() so the help text stays
 * truthful to what the simulation actually does.
 */
const PATTERN_OPTIONS: {
  value:
    | "constant"
    | "ramp"
    | "spike"
    | "wave"
    | "daily"
    | "black-friday"
    | "viral";
  label: string;
  description: string;
}[] = [
  {
    value: "constant",
    label: "Constant",
    description: "Steady, unchanging load — the simplest baseline.",
  },
  {
    value: "ramp",
    label: "Ramp up",
    description:
      "Climbs gradually from light to ~2× load. Great for finding the breaking point.",
  },
  {
    value: "spike",
    label: "Spike",
    description: "Runs flat, then jumps to 5× at the halfway mark.",
  },
  {
    value: "wave",
    label: "Wave",
    description: "Rises and falls repeatedly (0.2×–1.8×) — a natural ebb and flow.",
  },
  {
    value: "daily",
    label: "Daily cycle",
    description: "A compressed day: morning ramp, midday, evening peak, overnight lull.",
  },
  {
    value: "black-friday",
    label: "Black Friday",
    description: "Calm, then a sudden jump to a sustained 5× rush — a planned sale.",
  },
  {
    value: "viral",
    label: "Viral growth",
    description: "Accelerating, exponential growth plateauing near 8× — a post going viral.",
  },
];

export function Toolbar() {
  const status = useSimulationStore((s) => s.status);
  const setStatus = useSimulationStore((s) => s.setStatus);
  const reset = useSimulationStore((s) => s.reset);
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);

  const clear = useArchitectureStore((s) => s.clear);
  const nodeCount = useArchitectureStore((s) => s.nodes.length);
  const activeTemplateId = useArchitectureStore((s) => s.activeTemplateId);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const pastStates = useTemporalStore((s) => s.pastStates.length);
  const futureStates = useTemporalStore((s) => s.futureStates.length);

  const [templatesOpen, setTemplatesOpen] = useState(false);

  const isRunning = status === "running";
  const isPaused = status === "paused";

  const activeTemplate = activeTemplateId
    ? TEMPLATES_BY_ID[activeTemplateId]
    : null;

  const onPlay = () => {
    if (isPaused) {
      setStatus("running");
    } else {
      reset();
      setStatus("running");
    }
  };

  return (
    <>
      <div className="flex h-12 items-center gap-1.5 border-b bg-card px-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={isRunning ? "outline" : "default"}
            onClick={onPlay}
            disabled={nodeCount === 0}
            className="h-8 gap-1.5"
          >
            {isPaused ? (
              <>
                <Play className="size-3.5" /> Resume
              </>
            ) : (
              <>
                <Play className="size-3.5" /> Start
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus("paused")}
            disabled={!isRunning}
            className="h-8 gap-1.5"
          >
            <Pause className="size-3.5" /> Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus("idle")}
            disabled={status === "idle"}
            className="h-8 gap-1.5"
          >
            <Square className="size-3.5" /> Stop
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              reset();
            }}
            className="h-8 gap-1.5"
            title="Reset metrics"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
            Pattern
            <InfoHint side="bottom">
              <p className="mb-1.5 font-medium text-primary-foreground">
                How request volume changes over a run:
              </p>
              <ul className="space-y-1">
                {PATTERN_OPTIONS.map((p) => (
                  <li key={p.value}>
                    <span className="font-medium">{p.label}:</span>{" "}
                    {p.description}
                  </li>
                ))}
              </ul>
            </InfoHint>
          </span>
          <Select
            value={config.pattern}
            onValueChange={(v) =>
              setConfig({ pattern: v as typeof config.pattern })
            }
          >
            <SelectTrigger size="sm" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATTERN_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
            Load
            <InfoHint side="bottom">
              Multiplies the whole pattern up or down. 1× uses each client&apos;s
              configured RPS; 10× simulates ten times the traffic. Crank it up to
              probe how much headroom your design really has.
            </InfoHint>
          </span>
          <Select
            value={String(config.trafficMultiplier)}
            onValueChange={(v) => setConfig({ trafficMultiplier: Number(v) })}
          >
            <SelectTrigger size="sm" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5×</SelectItem>
              <SelectItem value="1">1×</SelectItem>
              <SelectItem value="2">2×</SelectItem>
              <SelectItem value="5">5×</SelectItem>
              <SelectItem value="10">10×</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => setTemplatesOpen(true)}
        >
          <LayoutTemplate className="size-3.5" />
          Templates
        </Button>

        {activeTemplate && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
              {activeTemplate.name}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => undo()}
            disabled={pastStates === 0}
            title="Undo"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => redo()}
            disabled={futureStates === 0}
            title="Redo"
          >
            <Redo2 className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => {
              reset();
              clear();
            }}
            disabled={nodeCount === 0}
            title="Clear canvas"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Badge
            variant={
              status === "running"
                ? "success"
                : status === "paused"
                  ? "warning"
                  : status === "completed"
                    ? "secondary"
                    : "outline"
            }
            className={cn(
              "h-6 gap-1.5 px-2 capitalize",
              status === "running" && "animate-pulse"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "running" && "bg-emerald-500",
                status === "paused" && "bg-amber-500",
                status === "idle" && "bg-muted-foreground",
                status === "completed" && "bg-slate-400"
              )}
            />
            {status}
          </Badge>
        </div>
      </div>

      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </>
  );
}
