import { describe, expect, it } from "vitest";

import { validateArchitecture } from "@/lib/architecture/validation";
import type {
  ArchEdge,
  ArchNode,
} from "@/lib/store/architecture-store";
import { DEFAULT_CONFIGS, type ComponentType } from "@/lib/architecture/types";

function node(id: string, type: ComponentType): ArchNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { type, config: { ...DEFAULT_CONFIGS[type] } },
  } as ArchNode;
}

function edge(id: string, source: string, target: string): ArchEdge {
  return { id, source, target };
}

describe("validateArchitecture", () => {
  it("returns no issues for an empty graph", () => {
    expect(validateArchitecture([], [])).toEqual([]);
  });

  it("warns when there is no client entry point", () => {
    const issues = validateArchitecture(
      [node("api", "api-server")],
      []
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ type: "no-entry-point", severity: "warning" })
    );
  });

  it("flags a node not reachable from any client", () => {
    const nodes = [
      node("c", "client"),
      node("api", "api-server"),
      node("orphan", "redis"),
    ];
    const edges = [edge("e1", "c", "api")];
    const issues = validateArchitecture(nodes, edges);
    const disconnected = issues.find((i) => i.type === "disconnected-node");
    expect(disconnected).toMatchObject({
      type: "disconnected-node",
      nodeId: "orphan",
      severity: "warning",
    });
  });

  it("does not flag reachable nodes", () => {
    const nodes = [node("c", "client"), node("api", "api-server")];
    const edges = [edge("e1", "c", "api")];
    const issues = validateArchitecture(nodes, edges);
    expect(issues.find((i) => i.type === "disconnected-node")).toBeUndefined();
  });

  it("errors on dangling edges referencing missing nodes", () => {
    const issues = validateArchitecture(
      [node("c", "client")],
      [edge("e1", "c", "ghost")]
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ type: "dangling-edge", severity: "error" })
    );
  });

  it("detects a cycle in the graph", () => {
    const nodes = [
      node("c", "client"),
      node("a", "api-server"),
      node("b", "microservice"),
    ];
    const edges = [
      edge("e1", "c", "a"),
      edge("e2", "a", "b"),
      edge("e3", "b", "a"),
    ];
    const issues = validateArchitecture(nodes, edges);
    expect(issues).toContainEqual(
      expect.objectContaining({ type: "cycle-detected", severity: "warning" })
    );
  });

  it("treats a DAG as cycle-free", () => {
    const nodes = [
      node("c", "client"),
      node("a", "api-server"),
      node("db", "postgres"),
    ];
    const edges = [edge("e1", "c", "a"), edge("e2", "a", "db")];
    const issues = validateArchitecture(nodes, edges);
    expect(issues.find((i) => i.type === "cycle-detected")).toBeUndefined();
  });
});
