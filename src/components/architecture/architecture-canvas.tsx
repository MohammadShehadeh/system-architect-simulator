"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";

import {
  useArchitectureStore,
  type ArchEdge,
  type ArchNode,
} from "@/lib/store/architecture-store";
import { useSimulationStore } from "@/lib/store/simulation-store";
import type { ComponentType } from "@/lib/architecture/types";

import { ComponentNode } from "./component-node";
import { COMPONENT_COLORS } from "./component-icons";

const nodeTypes = {
  component: ComponentNode,
};

function CanvasInner() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange);
  const onEdgesChange = useArchitectureStore((s) => s.onEdgesChange);
  const onConnect = useArchitectureStore((s) => s.onConnect);
  const addComponent = useArchitectureStore((s) => s.addComponent);
  const setSelectedNode = useArchitectureStore((s) => s.setSelectedNode);
  const simStatus = useSimulationStore((s) => s.status);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/component-type"
      ) as ComponentType;
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addComponent(type, position);
    },
    [screenToFlowPosition, addComponent]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const decoratedEdges = useMemo<ArchEdge[]>(() => {
    return edges.map((e) => {
      const targetNode = nodes.find((n) => n.id === e.target);
      const sourceNode = nodes.find((n) => n.id === e.source);
      const color =
        sourceNode &&
        COMPONENT_COLORS[sourceNode.data.type].icon.includes("blue")
          ? "var(--primary)"
          : "var(--muted-foreground)";
      return {
        ...e,
        animated: simStatus === "running",
        style: {
          stroke: color,
          strokeWidth: 1.8,
          opacity: targetNode ? 0.85 : 0.4,
        },
      };
    });
  }, [edges, nodes, simStatus]);

  return (
    <div ref={wrapperRef} className="size-full">
      <ReactFlow<ArchNode, ArchEdge>
        nodes={nodes}
        edges={decoratedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
        deleteKeyCode={["Delete", "Backspace"]}
        multiSelectionKeyCode={["Shift"]}
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
            const arch = node as ArchNode;
            const type = arch.data?.type;
            if (!type) return "var(--muted)";
            return {
              client: "#64748b",
              cdn: "#0ea5e9",
              "load-balancer": "#8b5cf6",
              "api-server": "#3b82f6",
              redis: "#f43f5e",
              postgres: "#10b981",
              queue: "#f59e0b",
            }[type];
          }}
          nodeStrokeWidth={2}
          className="!bg-card !border !shadow-sm rounded-md overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
}

export function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
