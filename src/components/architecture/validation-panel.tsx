"use client";

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

import { useArchitectureStore } from "@/lib/store/architecture-store";
import { validateArchitecture } from "@/lib/architecture/validation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ValidationPanel() {
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);

  const issues = useMemo(
    () => validateArchitecture(nodes, edges),
    [nodes, edges]
  );

  if (nodes.length === 0) {
    return (
      <Card className="gap-2 py-3">
        <div className="px-3 text-xs font-semibold">Validation</div>
        <div className="px-3 text-xs text-muted-foreground">
          Add components to build an architecture.
        </div>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card className="gap-2 py-3">
        <div className="flex items-center gap-2 px-3 text-xs font-semibold">
          <CheckCircle2 className="size-4 text-emerald-500" />
          Architecture looks good
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-2 py-3">
      <div className="px-3 text-xs font-semibold">
        Validation ({issues.length})
      </div>
      <div className="space-y-1 px-2">
        {issues.map((issue, idx) => (
          <button
            key={idx}
            className={cn(
              "flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-xs",
              issue.nodeId && "hover:bg-accent/50"
            )}
            onClick={() => issue.nodeId && setSelectedNode(issue.nodeId)}
            disabled={!issue.nodeId}
          >
            {issue.severity === "error" ? (
              <AlertCircle className="size-3.5 shrink-0 text-red-500" />
            ) : (
              <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
            )}
            <span className="flex-1">{issue.message}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
