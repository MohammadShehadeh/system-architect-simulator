"use client";

import { useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulation } from "@/lib/simulation/use-simulation";

import { ArchitectureCanvas } from "./architecture-canvas";
import { ComponentPalette } from "./component-palette";
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
  const nodeCount = useArchitectureStore((s) => s.nodes.length);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (nodeCount === 0) {
      loadTemplateById("starter-cached");
    }
  }, [loadTemplateById, nodeCount]);

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <BrandLockup logoClassName="size-7" textClassName="text-sm" />
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            Design distributed systems · simulate production load · find
            bottlenecks
          </span>
        </div>
        <div className="flex items-center gap-2">
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
              <div className="mb-1 px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Drag onto canvas
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
    </div>
  );
}
