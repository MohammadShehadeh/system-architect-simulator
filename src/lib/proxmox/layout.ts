/**
 * Pure, deterministic layout + filtering: `Topology` -> React Flow nodes/edges.
 *
 * Positions are a function of structure (ids, counts, filters) only — never of
 * live metrics — so a refresh that changes CPU/RAM/status never makes the
 * diagram jitter; only structural changes (a guest added/removed, a filter
 * toggled) reflow. This runs on the client on every filter change, so it must
 * stay cheap and free of side effects.
 */

import type { Edge, Node } from "@xyflow/react";

import type {
  Topology,
  TopologyEntity,
  TopologyFilters,
  TopoNodeData,
} from "./types";

export type TopoFlowNode = Node<TopoNodeData>;

export interface FlowGraph {
  nodes: TopoFlowNode[];
  edges: Edge[];
}

/* Layout constants (px). */
const PAD_X = 16;
const PAD_Y = 14;
const HEADER = 46;
const SECTION_GAP = 16;

const VM = { w: 176, h: 66, gx: 12, gy: 12, cols: 3 };
const BR = { w: 132, h: 40, gx: 12, gy: 12, cols: 4 };
const ST = { w: 152, h: 46, gx: 12, gy: 12, cols: 4 };

const HOST_GAP_X = 56;
const HOST_GAP_Y = 56;
const HOSTS_PER_ROW = 3;
const MIN_INNER = VM.w;

const VNET = { w: 156, h: 50, gap: 18 };

interface GridDims {
  w: number;
  h: number;
  cols: number;
}

function gridDims(
  count: number,
  cols: number,
  cellW: number,
  cellH: number,
  gx: number,
  gy: number
): GridDims {
  if (count <= 0) return { w: 0, h: 0, cols: 0 };
  const c = Math.min(count, cols);
  const rows = Math.ceil(count / cols);
  return {
    w: c * cellW + (c - 1) * gx,
    h: rows * cellH + (rows - 1) * gy,
    cols: c,
  };
}

function cellOffset(
  index: number,
  cols: number,
  cellW: number,
  cellH: number,
  gx: number,
  gy: number
): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * (cellW + gx), y: row * (cellH + gy) };
}

function matchesSearch(e: TopologyEntity, q: string): boolean {
  if (!q) return true;
  const hay = `${e.label} ${e.vmid ?? ""} ${(e.tags ?? []).join(" ")}`.toLowerCase();
  return hay.includes(q);
}

/** Decide whether an entity is shown under the current filters. */
export function isEntityVisible(
  e: TopologyEntity,
  filters: TopologyFilters
): boolean {
  const q = filters.search.trim().toLowerCase();

  if (filters.nodeName) {
    if (e.type === "vnet") return false;
    const owningNode = e.type === "host" ? e.label : e.node;
    if (owningNode !== filters.nodeName) return false;
  }

  switch (e.type) {
    case "host":
      return true;
    case "vm":
    case "container":
      if (e.template && !filters.showTemplates) return false;
      if (e.status === "stopped" && !filters.showStopped) return false;
      return matchesSearch(e, q);
    case "bridge":
      return true;
    case "vnet":
      return true;
    case "storage":
      return filters.showStorage;
  }
}

export function topologyToFlow(
  topology: Topology,
  filters: TopologyFilters
): FlowGraph {
  const visible = topology.entities.filter((e) => isEntityVisible(e, filters));
  const visibleIds = new Set(visible.map((e) => e.id));

  const hosts = visible
    .filter((e) => e.type === "host")
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const childrenOf = (hostId: string, types: TopologyEntity["type"][]) =>
    visible
      .filter((e) => e.parentId === hostId && types.includes(e.type))
      .sort((a, b) => {
        if (a.vmid != null && b.vmid != null) return a.vmid - b.vmid;
        return a.label.localeCompare(b.label, undefined, { numeric: true });
      });

  const nodes: TopoFlowNode[] = [];

  let rowX = 0;
  let rowY = 0;
  let rowMaxH = 0;
  let inRow = 0;

  for (const host of hosts) {
    const guests = childrenOf(host.id, ["vm", "container"]);
    const bridges = childrenOf(host.id, ["bridge"]);
    const storage = childrenOf(host.id, ["storage"]);

    const vmGrid = gridDims(guests.length, VM.cols, VM.w, VM.h, VM.gx, VM.gy);
    const brGrid = gridDims(bridges.length, BR.cols, BR.w, BR.h, BR.gx, BR.gy);
    const stGrid = gridDims(storage.length, ST.cols, ST.w, ST.h, ST.gx, ST.gy);

    const innerW = Math.max(MIN_INNER, vmGrid.w, brGrid.w, stGrid.w);

    // Stack the non-empty sections vertically, gapping only between them.
    const childNodes: TopoFlowNode[] = [];
    let cursorY = HEADER + PAD_Y;
    let placedSection = false;

    const placeSection = (
      items: TopologyEntity[],
      grid: GridDims,
      cell: { w: number; h: number; gx: number; gy: number; cols: number }
    ) => {
      if (!items.length) return;
      if (placedSection) cursorY += SECTION_GAP;
      const top = cursorY;
      items.forEach((entity, i) => {
        const off = cellOffset(i, cell.cols, cell.w, cell.h, cell.gx, cell.gy);
        childNodes.push({
          id: entity.id,
          type: "leaf",
          parentId: host.id,
          extent: "parent",
          position: { x: PAD_X + off.x, y: top + off.y },
          width: cell.w,
          height: cell.h,
          data: { entity },
        });
      });
      cursorY = top + grid.h;
      placedSection = true;
    };

    placeSection(guests, vmGrid, VM);
    placeSection(bridges, brGrid, BR);
    placeSection(storage, stGrid, ST);

    const hostW = innerW + 2 * PAD_X;
    const hostH = cursorY + PAD_Y;

    if (inRow >= HOSTS_PER_ROW) {
      rowY += rowMaxH + HOST_GAP_Y;
      rowX = 0;
      rowMaxH = 0;
      inRow = 0;
    }

    nodes.push({
      id: host.id,
      type: "group",
      position: { x: rowX, y: rowY },
      width: hostW,
      height: hostH,
      data: { entity: host },
    });
    nodes.push(...childNodes);

    rowX += hostW + HOST_GAP_X;
    rowMaxH = Math.max(rowMaxH, hostH);
    inRow += 1;
  }

  // Cluster-wide SDN vnets in a row beneath the host grid.
  const vnets = visible
    .filter((e) => e.type === "vnet")
    .sort((a, b) => a.label.localeCompare(b.label));
  if (vnets.length) {
    const vnetY = rowY + rowMaxH + HOST_GAP_Y;
    vnets.forEach((entity, i) => {
      nodes.push({
        id: entity.id,
        type: "leaf",
        position: { x: i * (VNET.w + VNET.gap), y: vnetY },
        width: VNET.w,
        height: VNET.h,
        data: { entity },
      });
    });
  }

  const edges: Edge[] = topology.edges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      data: { kind: e.kind },
    }));

  return { nodes, edges };
}
