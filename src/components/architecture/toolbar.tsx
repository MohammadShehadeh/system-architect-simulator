"use client";

import {
  Pause,
  Play,
  RotateCcw,
  Square,
  Undo2,
  Redo2,
  Trash2,
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
import {
  useArchitectureStore,
  useTemporalStore,
  type PresetKey,
} from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { cn } from "@/lib/utils";

export function Toolbar() {
  const status = useSimulationStore((s) => s.status);
  const setStatus = useSimulationStore((s) => s.setStatus);
  const reset = useSimulationStore((s) => s.reset);
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);

  const loadPreset = useArchitectureStore((s) => s.loadPreset);
  const clear = useArchitectureStore((s) => s.clear);
  const nodeCount = useArchitectureStore((s) => s.nodes.length);

  const undo = useTemporalStore((s) => s.undo);
  const redo = useTemporalStore((s) => s.redo);
  const pastStates = useTemporalStore((s) => s.pastStates.length);
  const futureStates = useTemporalStore((s) => s.futureStates.length);

  const isRunning = status === "running";
  const isPaused = status === "paused";

  const onPlay = () => {
    if (isPaused) {
      setStatus("running");
    } else {
      reset();
      setStatus("running");
    }
  };

  return (
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
        <span className="text-[10px] uppercase text-muted-foreground">
          Pattern
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
            <SelectItem value="constant">Constant</SelectItem>
            <SelectItem value="ramp">Ramp up</SelectItem>
            <SelectItem value="spike">Spike</SelectItem>
            <SelectItem value="wave">Wave</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] uppercase text-muted-foreground">
          Load
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

      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground mr-1">
          Preset
        </span>
        {(
          [
            { id: "monolith" as PresetKey, label: "Monolith" },
            { id: "with-cache" as PresetKey, label: "Cache" },
            { id: "scaled" as PresetKey, label: "Scaled" },
          ]
        ).map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => {
              reset();
              loadPreset(p.id);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

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
  );
}
