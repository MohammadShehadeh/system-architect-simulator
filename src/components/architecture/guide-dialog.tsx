"use client";

import {
  GaugeCircle,
  LayoutTemplate,
  MousePointerClick,
  Play,
  Plug,
  Sliders,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LEGEND: {
  label: string;
  dot: string;
  meaning: string;
}[] = [
  {
    label: "Healthy",
    dot: "bg-emerald-500",
    meaning: "Comfortably within capacity — plenty of headroom.",
  },
  {
    label: "Degraded",
    dot: "bg-amber-500",
    meaning: "Latency is climbing or errors are creeping in.",
  },
  {
    label: "Overloaded",
    dot: "bg-orange-500",
    meaning: "Near or past its limit — this is your bottleneck.",
  },
  {
    label: "Failed",
    dot: "bg-red-500",
    meaning: "Saturated and dropping requests. Scale it or relieve load.",
  },
];

export function GuideDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[92vw] max-w-2xl flex-col">
        <DialogHeader className="shrink-0 border-b p-5 pb-4 pr-12">
          <DialogTitle>How the simulator works</DialogTitle>
          <DialogDescription className="mt-1">
            Design a distributed system on the canvas, drive it with simulated
            production traffic, and watch where it bends or breaks.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-5">
            <Step
              n={1}
              icon={MousePointerClick}
              title="Add components"
              body={
                <>
                  Drag any component from the <strong>Components</strong> palette
                  on the left onto the canvas. Not sure what something is?{" "}
                  <strong>Click it in the palette</strong> to open a full guide —
                  what it does, when to use it, real-world examples, cost, and
                  common pitfalls.
                </>
              }
            />
            <Step
              n={2}
              icon={Plug}
              title="Wire them together"
              body={
                <>
                  Drag from a node&apos;s <strong>right handle</strong> (output)
                  to another node&apos;s <strong>left handle</strong> (input) to
                  connect them. Each edge shows an arrow for the direction
                  requests flow and is tinted with its source component&apos;s
                  colour so you can trace a path at a glance.
                </>
              }
            />
            <Step
              n={3}
              icon={Sliders}
              title="Tune configuration"
              body={
                <>
                  Click any node to select it, then open the{" "}
                  <strong>Config</strong> tab on the right to adjust instances,
                  capacity, caching, replicas, and more. Every field has a hint,
                  and the <strong>book icon</strong> opens that component&apos;s
                  full guide.
                </>
              }
            />
            <Step
              n={4}
              icon={Play}
              title="Run a simulation"
              body={
                <>
                  Pick a <strong>traffic pattern</strong> and a{" "}
                  <strong>load multiplier</strong> in the toolbar, then press{" "}
                  <strong>Start</strong>. Traffic flows through your design in
                  real time. Watch <strong>Metrics</strong> for throughput and
                  latency, and <strong>Insights</strong> for bottlenecks, SLO
                  compliance, and cost.
                </>
              }
            />

            <section className="rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <GaugeCircle className="size-3.5" /> Reading the canvas
              </h3>

              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium">
                  Node status (the dot on each node)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STATUS_LEGEND.map((s) => (
                    <div key={s.label} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1 size-2.5 shrink-0 rounded-full",
                          s.dot
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{s.label}</div>
                        <div className="text-[11px] leading-snug text-muted-foreground">
                          {s.meaning}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <p>
                  <strong className="text-foreground">Saturation bar</strong> —
                  how close a component is to its capacity limit. It climbs from
                  green to red as a component fills up.
                </p>
                <p>
                  <strong className="text-foreground">Per-node metrics</strong>{" "}
                  — once traffic is flowing, each node shows its live RPS, CPU,
                  and error rate.
                </p>
                <p>
                  <strong className="text-foreground">Edges</strong> — the arrow
                  points downstream (the direction a request travels); the
                  colour matches the source component.
                </p>
              </div>
            </section>

            <section className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <LayoutTemplate className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed">
                <strong>New here?</strong> Open <strong>Templates</strong> to
                load a production-grade design modeled on a real company, then
                press Start to see how it behaves under load.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/30">
          {n}
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </section>
  );
}
