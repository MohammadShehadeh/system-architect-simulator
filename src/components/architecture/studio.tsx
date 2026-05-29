"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, LayoutTemplate } from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulation } from "@/lib/simulation/use-simulation";

import { ArchitectureCanvas } from "./architecture-canvas";
import { ComponentPalette } from "./component-palette";
import { GuideDialog } from "./guide-dialog";
import { InsightsPanel } from "./insights-panel";
import { MetricsPanel } from "./metrics-panel";
import { PropertyPanel } from "./property-panel";
import { TemplatesDialog } from "./templates-dialog";
import { Toolbar } from "./toolbar";
import { ValidationPanel } from "./validation-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Studio() {
  useSimulation();
  const loadTemplateById = useArchitectureStore((s) => s.loadTemplateById);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const seededRef = useRef(false);

  // Seed a starter design the first time the studio mounts so newcomers
  // aren't dropped onto a blank canvas. This runs once per session — unlike
  // before, clearing the canvas now genuinely leaves it empty rather than
  // immediately reloading the starter template.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (useArchitectureStore.getState().nodes.length === 0) {
      loadTemplateById("starter-cached");
    }
  }, [loadTemplateById]);

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <BrandLockup
          tagline="Design distributed systems · simulate production load · find bottlenecks"
          taglineClassName="hidden sm:inline"
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5"
            onClick={() => setGuideOpen(true)}
          >
            <GraduationCap className="size-3.5" /> Guide
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => setTemplatesOpen(true)}
          >
            <LayoutTemplate className="size-3.5" /> Templates
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <Toolbar />

      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_360px]">
        <aside className="flex min-h-0 flex-col border-r bg-card">
          <Tabs defaultValue="components" className="flex h-full flex-col">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="components" className="flex-1">
                  Components
                </TabsTrigger>
                <TabsTrigger value="status" className="flex-1">
                  Validation
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="components"
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              <div className="mb-2 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Drag to canvas · click to learn
              </div>
              <ComponentPalette />
            </TabsContent>
            <TabsContent
              value="status"
              className="min-h-0 flex-1 overflow-y-auto p-2"
            >
              <ValidationPanel />
            </TabsContent>
          </Tabs>
        </aside>

        <main className="relative min-w-0 bg-background">
          <ArchitectureCanvas />
        </main>

        <aside className="flex min-h-0 flex-col border-l bg-card">
          <Tabs defaultValue="metrics" className="flex h-full flex-col">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="metrics" className="flex-1">
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex-1">
                  Insights
                </TabsTrigger>
                <TabsTrigger value="properties" className="flex-1">
                  Config
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="metrics"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <MetricsPanel />
            </TabsContent>
            <TabsContent
              value="insights"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <InsightsPanel />
            </TabsContent>
            <TabsContent
              value="properties"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <PropertyPanel />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <GuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}
