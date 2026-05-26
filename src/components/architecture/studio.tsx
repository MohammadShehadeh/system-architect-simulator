"use client";

import { useEffect } from "react";
import { Workflow } from "lucide-react";

import { useArchitectureStore } from "@/lib/store/architecture-store";
import { useSimulation } from "@/lib/simulation/use-simulation";

import { ArchitectureCanvas } from "./architecture-canvas";
import { ComponentPalette } from "./component-palette";
import { MetricsPanel } from "./metrics-panel";
import { PropertyPanel } from "./property-panel";
import { Toolbar } from "./toolbar";
import { ValidationPanel } from "./validation-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Studio() {
  useSimulation();
  const loadPreset = useArchitectureStore((s) => s.loadPreset);
  const nodeCount = useArchitectureStore((s) => s.nodes.length);

  useEffect(() => {
    if (nodeCount === 0) {
      loadPreset("with-cache");
    }
  }, [loadPreset, nodeCount]);

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/30">
            <Workflow className="size-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              System Architect Simulator
            </span>
            <span className="text-[10px] text-muted-foreground">
              Design, simulate, iterate
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://reactflow.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            React Flow
          </a>
          <ThemeToggle />
        </div>
      </header>

      <Toolbar />

      <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr_320px]">
        <aside className="flex min-h-0 flex-col border-r bg-card">
          <Tabs defaultValue="components" className="flex h-full flex-col">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="components" className="flex-1">
                  Components
                </TabsTrigger>
                <TabsTrigger value="status" className="flex-1">
                  Status
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
          <Tabs defaultValue="properties" className="flex h-full flex-col">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="properties" className="flex-1">
                  Properties
                </TabsTrigger>
                <TabsTrigger value="metrics" className="flex-1">
                  Metrics
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="properties" className="min-h-0 flex-1 overflow-hidden">
              <PropertyPanel />
            </TabsContent>
            <TabsContent value="metrics" className="min-h-0 flex-1 overflow-hidden">
              <MetricsPanel />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
