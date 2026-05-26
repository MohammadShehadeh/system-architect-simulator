"use client";

import { useMemo, useState } from "react";
import { Building2, Layers, Sparkles, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type Template,
  type TemplateCategory,
} from "@/lib/architecture/templates";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import { cn } from "@/lib/utils";

import { COMPONENT_COLORS, COMPONENT_ICONS } from "./component-icons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatesDialog({ open, onOpenChange }: Props) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadTemplate = useArchitectureStore((s) => s.loadTemplate);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const reset = useSimulationStore((s) => s.reset);
  const setStatus = useSimulationStore((s) => s.setStatus);

  const filtered = useMemo(() => {
    if (category === "all") return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  const selected = selectedId
    ? TEMPLATES.find((t) => t.id === selectedId) ?? null
    : null;

  const handleApply = (template: Template) => {
    reset();
    setStatus("idle");
    loadTemplate(template);
    setConfig({
      pattern: template.recommendedLoad.pattern,
      trafficMultiplier: template.recommendedLoad.multiplier,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[88vh] w-[95vw] max-w-[1400px] flex-col"
        showClose
      >
        <DialogHeader className="shrink-0 border-b p-5 pb-4 pr-12">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
              <Building2 className="size-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>Enterprise Architecture Templates</DialogTitle>
              <DialogDescription className="mt-1">
                Production-grade designs modeled after real companies. Click a card
                to preview, then apply to start simulating.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[180px_minmax(0,1fr)_380px] overflow-hidden">
          {/* Categories */}
          <aside className="flex min-h-0 flex-col border-r bg-muted/20">
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-2">
                <CategoryButton
                  active={category === "all"}
                  onClick={() => {
                    setCategory("all");
                  }}
                  icon={Sparkles}
                  label="All"
                  count={TEMPLATES.length}
                />
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const count = TEMPLATES.filter(
                    (t) => t.category === cat.id
                  ).length;
                  if (count === 0) return null;
                  return (
                    <CategoryButton
                      key={cat.id}
                      active={category === cat.id}
                      onClick={() => setCategory(cat.id)}
                      label={cat.label}
                      count={count}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </aside>

          {/* Grid */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                {filtered.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    selected={t.id === selectedId}
                    onSelect={() => setSelectedId(t.id)}
                    onApply={() => handleApply(t)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Detail pane */}
          <aside className="flex min-h-0 flex-col border-l bg-card">
            {selected ? (
              <TemplateDetail
                template={selected}
                onApply={() => handleApply(selected)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <Workflow className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">Pick a template</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hover or click any card to see details.
                </p>
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
        active
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <span className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-[10px] tabular-nums opacity-60">{count}</span>
    </button>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onApply,
}: {
  template: Template;
  selected: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  const types = Array.from(
    new Set(template.nodes.map((n) => n.data.type))
  ).slice(0, 6);

  return (
    <button
      onClick={onSelect}
      onDoubleClick={onApply}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-all",
        "hover:border-primary/40 hover:shadow-sm",
        selected && "border-primary ring-1 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight">
              {template.name}
            </span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
              {template.category}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {template.tagline}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {types.map((t) => {
          const Icon = COMPONENT_ICONS[t];
          const colors = COMPONENT_COLORS[t];
          return (
            <span
              key={t}
              className={cn(
                "flex size-5 items-center justify-center rounded ring-1",
                colors.bg,
                colors.ring
              )}
              title={t}
            >
              <Icon className={cn("size-2.5", colors.icon)} />
            </span>
          );
        })}
        {template.nodes.length > 6 && (
          <span className="text-[10px] text-muted-foreground">
            +{template.nodes.length - types.length}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="size-3" /> {template.nodes.length} components
        </span>
        <span>{template.edges.length} edges</span>
      </div>
    </button>
  );
}

function TemplateDetail({
  template,
  onApply,
}: {
  template: Template;
  onApply: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b p-4">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
          {template.category}
        </span>
        <h3 className="mt-2 text-base font-semibold">{template.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{template.tagline}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <Section title="Overview">
            <p className="text-xs leading-relaxed">{template.description}</p>
          </Section>

          <Section title="Inspired by">
            <div className="flex flex-wrap gap-1.5">
              {template.inspiredBy.map((co) => (
                <span
                  key={co}
                  className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium"
                >
                  {co}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Key concepts">
            <ul className="space-y-1.5 text-xs">
              {template.keyConcepts.map((c, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-muted-foreground">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Recommended load">
            <div className="rounded-md border bg-muted/30 p-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <span className="capitalize">
                  {template.recommendedLoad.pattern.replace("-", " ")}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {template.recommendedLoad.multiplier}× load
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {template.recommendedLoad.description}
              </p>
            </div>
          </Section>

          <Section title="Scaling challenges">
            <ul className="space-y-1.5 text-xs">
              {template.scalingPoints.map((s, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-muted-foreground">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t p-3">
        <Button onClick={onApply} className="w-full" size="sm">
          Apply template
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}
