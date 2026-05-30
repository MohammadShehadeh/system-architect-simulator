import { describe, expect, it } from "vitest";

import { topologyToFlow, type FlowGraph } from "@/lib/proxmox/layout";
import { mapResourcesToTopology } from "@/lib/proxmox/map";
import { DEFAULT_FILTERS } from "@/lib/proxmox/types";

import { sampleMapperInput } from "./fixtures";

const topo = mapResourcesToTopology(sampleMapperInput());
const node = (g: FlowGraph, id: string) => g.nodes.find((n) => n.id === id);

describe("topologyToFlow", () => {
  it("renders a host as a group node placed before its children", () => {
    const g = topologyToFlow(topo, DEFAULT_FILTERS);
    expect(node(g, "host/pve1")?.type).toBe("group");
    const hostIdx = g.nodes.findIndex((n) => n.id === "host/pve1");
    const childIdx = g.nodes.findIndex((n) => n.id === "qemu/100");
    expect(hostIdx).toBeGreaterThanOrEqual(0);
    expect(hostIdx).toBeLessThan(childIdx);
  });

  it("nests children with parentId + extent 'parent'", () => {
    const g = topologyToFlow(topo, DEFAULT_FILTERS);
    const vm = node(g, "qemu/100");
    expect(vm?.type).toBe("leaf");
    expect(vm?.parentId).toBe("host/pve1");
    expect(vm?.extent).toBe("parent");
  });

  it("hides templates by default, shows them when toggled", () => {
    expect(node(topologyToFlow(topo, DEFAULT_FILTERS), "qemu/900")).toBeUndefined();
    expect(
      node(topologyToFlow(topo, { ...DEFAULT_FILTERS, showTemplates: true }), "qemu/900")
    ).toBeDefined();
  });

  it("hides stopped guests (and their edges) when showStopped is off", () => {
    const g = topologyToFlow(topo, { ...DEFAULT_FILTERS, showStopped: false });
    expect(node(g, "qemu/102")).toBeUndefined();
    expect(g.edges.some((e) => e.source === "qemu/102")).toBe(false);
  });

  it("hides storage unless showStorage is on", () => {
    expect(
      node(topologyToFlow(topo, DEFAULT_FILTERS), "storage/pve1/local")
    ).toBeUndefined();
    expect(
      node(
        topologyToFlow(topo, { ...DEFAULT_FILTERS, showStorage: true }),
        "storage/pve1/local"
      )
    ).toBeDefined();
  });

  it("restricts to a single node", () => {
    const g = topologyToFlow(topo, { ...DEFAULT_FILTERS, nodeName: "pve1" });
    expect(node(g, "host/pve2")).toBeUndefined();
    expect(node(g, "host/pve1")).toBeDefined();
    expect(node(g, "qemu/100")).toBeDefined();
  });

  it("only keeps edges whose endpoints are both visible", () => {
    const g = topologyToFlow(topo, DEFAULT_FILTERS);
    for (const e of g.edges) {
      expect(node(g, e.source)).toBeDefined();
      expect(node(g, e.target)).toBeDefined();
    }
  });

  it("is deterministic", () => {
    expect(topologyToFlow(topo, DEFAULT_FILTERS)).toEqual(
      topologyToFlow(topo, DEFAULT_FILTERS)
    );
  });

  it("does not move nodes when only metrics change", () => {
    const before = topologyToFlow(topo, DEFAULT_FILTERS);
    const mutated = structuredClone(topo);
    for (const e of mutated.entities) {
      if (e.metrics) e.metrics.cpu = 0.99;
    }
    const after = topologyToFlow(mutated, DEFAULT_FILTERS);
    const positions = (g: FlowGraph) =>
      g.nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    expect(positions(after)).toEqual(positions(before));
  });
});
