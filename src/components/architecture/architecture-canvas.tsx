"use client";

import { useCallback, useMemo, useRef } from "react";
import { Boxes } from "lucide-react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
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
      // Tint each edge with its source component's colour so flows are
      // traceable; dangling edges (missing endpoints) stay muted.
      const color =
        sourceNode && targetNode
          ? COMPONENT_COLORS[sourceNode.data.type].dot
          : "var(--muted-foreground)";
      return {
        ...e,
        animated: simStatus === "running",
        // Arrowhead makes the direction of data flow explicit.
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color,
        },
        style: {
          stroke: color,
          strokeWidth: 1.8,
          opacity: targetNode ? 0.9 : 0.4,
        },
      };
    });
  }, [edges, nodes, simStatus]);

  return (
    <div ref={wrapperRef} className="relative size-full">
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-xs rounded-xl border border-dashed bg-card/70 p-6 text-center backdrop-blur-sm">
            <Boxes className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">Your canvas is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Drag a component from the panel on the left to start building,
              load a ready-made{" "}
              <span className="font-medium text-foreground">Template</span>, or
              open the <span className="font-medium text-foreground">Guide</span>{" "}
              for a tour.
            </p>
          </div>
        </div>
      )}
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
            return COMPONENT_COLORS[type]?.dot ?? "var(--muted)";
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
