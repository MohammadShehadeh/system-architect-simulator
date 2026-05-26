"use client";

import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMPONENT_DOCS } from "@/lib/architecture/docs";
import {
  COMPONENT_DESCRIPTIONS,
  COMPONENT_LABELS,
  type ComponentType,
} from "@/lib/architecture/types";
import { cn } from "@/lib/utils";

import { COMPONENT_COLORS, COMPONENT_ICONS } from "./component-icons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentType: ComponentType;
}

export function ComponentDocsDialog({
  open,
  onOpenChange,
  componentType,
}: Props) {
  const doc = COMPONENT_DOCS[componentType];
  const Icon = COMPONENT_ICONS[componentType];
  const colors = COMPONENT_COLORS[componentType];

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[92vw] max-w-2xl flex-col">
        <DialogHeader className="shrink-0 border-b p-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg ring-1",
                colors.bg,
                colors.ring
              )}
            >
              <Icon className={cn("size-6", colors.icon)} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{doc.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {doc.oneLine}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What it does
              </h3>
              <p className="text-sm leading-relaxed">{doc.whatItDoes}</p>
            </section>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <FactCard
                icon={Timer}
                label="Typical latency"
                value={doc.typicalLatency}
              />
              <FactCard
                icon={DollarSign}
                label="Cost model"
                value={doc.costModel}
              />
              <FactCard icon={Zap} label="Capacity" value={doc.capacity} />
            </div>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Bulleted
                title="When to use"
                items={doc.whenToUse}
                icon={CheckCircle2}
                iconClass="text-emerald-500"
              />
              <Bulleted
                title="When NOT to use"
                items={doc.whenNotToUse}
                icon={XCircle}
                iconClass="text-rose-500"
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Real-world examples
              </h3>
              <ul className="space-y-1.5 text-sm">
                {doc.realWorldExamples.map((ex, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">▸</span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3.5" /> Common pitfalls
              </h3>
              <ul className="space-y-1.5 text-sm">
                {doc.commonPitfalls.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-600 dark:text-amber-400">▸</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Configuration knobs
              </h3>
              <div className="space-y-2">
                {Object.entries(doc.configHelp).map(([key, value]) => (
                  <div key={key} className="rounded-md border bg-muted/30 p-2.5">
                    <div className="font-mono text-xs font-semibold">{key}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 text-xs leading-snug">{value}</div>
    </div>
  );
}

function Bulleted({
  title,
  items,
  icon: Icon,
  iconClass,
}: {
  title: string;
  items: string[];
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("size-3.5", iconClass)} /> {title}
      </h3>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComponentInfo({ type }: { type: ComponentType }) {
  return (
    <span className="text-xs">
      <span className="font-medium">{COMPONENT_LABELS[type]}:</span>{" "}
      <span className="text-muted-foreground">
        {COMPONENT_DESCRIPTIONS[type]}
      </span>
    </span>
  );
}
