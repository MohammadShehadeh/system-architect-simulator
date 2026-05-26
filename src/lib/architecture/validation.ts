import type { ArchEdge, ArchNode } from "@/lib/store/architecture-store";

export interface ValidationIssue {
  type:
    | "no-entry-point"
    | "disconnected-node"
    | "cycle-detected"
    | "dangling-edge"
    | "isolated-graph";
  nodeId?: string;
  message: string;
  severity: "error" | "warning";
}

function findReachable(
  startIds: string[],
  edges: ArchEdge[]
): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  const visited = new Set<string>();
  const stack = [...startIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const next = adj.get(id) ?? [];
    for (const n of next) stack.push(n);
  }
  return visited;
}

function detectCycle(nodes: ArchNode[], edges: ArchEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(id: string): boolean {
    color.set(id, GRAY);
    for (const next of adj.get(id) ?? []) {
      if (color.get(next) === GRAY) return true;
      if (color.get(next) === WHITE && dfs(next)) return true;
    }
    color.set(id, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  }
  return false;
}

export function validateArchitecture(
  nodes: ArchNode[],
  edges: ArchEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (nodes.length === 0) return issues;

  const clients = nodes.filter((n) => n.data.type === "client");
  if (clients.length === 0) {
    issues.push({
      type: "no-entry-point",
      message: "Add a Client component to generate traffic.",
      severity: "warning",
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      issues.push({
        type: "dangling-edge",
        message: "An edge references a missing node.",
        severity: "error",
      });
    }
  }

  if (clients.length > 0) {
    const reachable = findReachable(
      clients.map((c) => c.id),
      edges
    );
    for (const n of nodes) {
      if (!reachable.has(n.id) && n.data.type !== "client") {
        issues.push({
          type: "disconnected-node",
          nodeId: n.id,
          message: `${n.data.config.label ?? n.data.type} is not reachable from any client.`,
          severity: "warning",
        });
      }
    }
  }

  if (detectCycle(nodes, edges)) {
    issues.push({
      type: "cycle-detected",
      message: "Circular dependency detected in graph.",
      severity: "warning",
    });
  }

  return issues;
}
