"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";

import { topologyToFlow, type TopoFlowNode } from "@/lib/proxmox/layout";
import { useProxmoxStore } from "@/lib/store/proxmox-store";

import { ENTITY_ACCENT } from "./entity-visuals";
import { GroupNode, LeafNode } from "./topology-node";

const nodeTypes = { group: GroupNode, leaf: LeafNode };

const EMPTY_FLOW = { nodes: [] as TopoFlowNode[], edges: [] as Edge[] };

function CanvasInner() {
  const topology = useProxmoxStore((s) => s.topology);
  const filters = useProxmoxStore((s) => s.filters);
  const selectedId = useProxmoxStore((s) => s.selectedId);
  const setSelected = useProxmoxStore((s) => s.setSelected);
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => (topology ? topologyToFlow(topology, filters) : EMPTY_FLOW),
    [topology, filters]
  );

  const entityTypeById = useMemo(() => {
    const map = new Map<string, keyof typeof ENTITY_ACCENT>();
    for (const e of topology?.entities ?? []) map.set(e.id, e.type);
    return map;
  }, [topology]);

  // Tint each edge by its source guest so flows are traceable; animate to read
  // as "live". Selection is reflected so the inspected node's wiring stands out.
  const decoratedNodes = useMemo<TopoFlowNode[]>(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [nodes, selectedId]
  );

  const decoratedEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => {
        const type = entityTypeById.get(e.source);
        const color = type ? ENTITY_ACCENT[type].dot : "var(--muted-foreground)";
        return {
          ...e,
          type: "smoothstep",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color,
          },
          style: { stroke: color, strokeWidth: 1.5, opacity: 0.65 },
          labelStyle: { fontSize: 10, fill: "var(--muted-foreground)" },
          labelBgStyle: { fill: "var(--card)", fillOpacity: 0.85 },
        };
      }),
    [edges, entityTypeById]
  );

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    setSelected(node.id);
  };

  // Fit once after the first non-empty render (nodes start empty pre-load).
  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current && nodes.length > 0) {
      didFit.current = true;
      requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
    }
  }, [nodes.length, fitView]);

  return (
    <div className="size-full" data-testid="proxmox-canvas">
      <ReactFlow<TopoFlowNode>
        nodes={decoratedNodes}
        edges={decoratedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--border)"
        />
        <Controls
          showInteractive={false}
          className="!bg-card !border !shadow-sm overflow-hidden"
        />
        <MiniMap
          pannable
          zoomable
          maskColor="oklch(0 0 0 / 0.1)"
          nodeColor={(node: Node) => {
            const flow = node as TopoFlowNode;
            const type = flow.data?.entity?.type;
            return type ? ENTITY_ACCENT[type].dot : "var(--muted)";
          }}
          nodeStrokeWidth={2}
          className="!bg-card !border !shadow-sm rounded-md overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

export function TopologyCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
