"use client";

import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStore } from "zustand";
import type { Edge, Node, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges, addEdge } from "@xyflow/react";

import {
  DEFAULT_CONFIGS,
  type ComponentConfig,
  type ComponentNodeData,
  type ComponentType,
} from "@/lib/architecture/types";
import { uid } from "@/lib/utils";

export type ArchNode = Node<ComponentNodeData>;
export type ArchEdge = Edge;

export interface ArchitectureState {
  nodes: ArchNode[];
  edges: ArchEdge[];
  selectedNodeId: string | null;

  onNodesChange: OnNodesChange<ArchNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => void;

  addComponent: (type: ComponentType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<ComponentConfig>) => void;
  setSelectedNode: (id: string | null) => void;
  clear: () => void;
  loadPreset: (preset: PresetKey) => void;
}

const initialState = (): { nodes: ArchNode[]; edges: ArchEdge[] } => ({
  nodes: [],
  edges: [],
});

const baseStore = create<ArchitectureState>()(
  temporal(
    (set, get) => ({
      ...initialState(),
      selectedNodeId: null,

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },
      onConnect: (params) => {
        const sourceNode = get().nodes.find((n) => n.id === params.source);
        const targetNode = get().nodes.find((n) => n.id === params.target);
        if (!sourceNode || !targetNode) return;
        if (sourceNode.id === targetNode.id) return;

        set({
          edges: addEdge(
            {
              ...params,
              id: uid("edge"),
              type: "default",
              animated: false,
            } as ArchEdge,
            get().edges
          ),
        });
      },

      addComponent: (type, position) => {
        const id = uid(type);
        const config: ComponentConfig = {
          ...DEFAULT_CONFIGS[type],
        } as ComponentConfig;
        const newNode: ArchNode = {
          id,
          type: "component",
          position,
          data: { type, config },
        };
        set({ nodes: [...get().nodes, newNode], selectedNodeId: id });
        return id;
      },

      removeNode: (id) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          edges: get().edges.filter(
            (e) => e.source !== id && e.target !== id
          ),
          selectedNodeId:
            get().selectedNodeId === id ? null : get().selectedNodeId,
        });
      },

      duplicateNode: (id) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        const newId = uid(node.data.type);
        const newNode: ArchNode = {
          ...node,
          id: newId,
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          data: { ...node.data, config: { ...node.data.config } },
          selected: false,
        };
        set({ nodes: [...get().nodes, newNode], selectedNodeId: newId });
      },

      updateNodeConfig: (id, partial) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    config: { ...n.data.config, ...partial } as ComponentConfig,
                  },
                }
              : n
          ),
        });
      },

      setSelectedNode: (id) => set({ selectedNodeId: id }),

      clear: () =>
        set({ nodes: [], edges: [], selectedNodeId: null }),

      loadPreset: (preset) => {
        const config = PRESETS[preset];
        set({
          nodes: config.nodes,
          edges: config.edges,
          selectedNodeId: null,
        });
      },
    }),
    {
      limit: 50,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      equality: (a, b) =>
        JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
        JSON.stringify(a.edges) === JSON.stringify(b.edges),
    }
  )
);

export const useArchitectureStore = baseStore;

export const useTemporalStore = <T>(
  selector: (state: TemporalState<Pick<ArchitectureState, "nodes" | "edges">>) => T
): T => useStore(baseStore.temporal, selector);

export type PresetKey = "blank" | "monolith" | "with-cache" | "scaled";

const makeNode = (
  type: ComponentType,
  position: { x: number; y: number },
  overrides?: Partial<ComponentConfig>
): ArchNode => ({
  id: uid(type),
  type: "component",
  position,
  data: {
    type,
    config: { ...DEFAULT_CONFIGS[type], ...overrides } as ComponentConfig,
  },
});

const PRESETS: Record<PresetKey, { nodes: ArchNode[]; edges: ArchEdge[] }> = {
  blank: { nodes: [], edges: [] },
  monolith: (() => {
    const client = makeNode("client", { x: 0, y: 100 });
    const api = makeNode("api-server", { x: 320, y: 100 }, { instances: 1 });
    const db = makeNode("postgres", { x: 640, y: 100 });
    return {
      nodes: [client, api, db],
      edges: [
        { id: uid("edge"), source: client.id, target: api.id },
        { id: uid("edge"), source: api.id, target: db.id },
      ],
    };
  })(),
  "with-cache": (() => {
    const client = makeNode("client", { x: 0, y: 150 });
    const lb = makeNode("load-balancer", { x: 280, y: 150 });
    const api = makeNode("api-server", { x: 560, y: 150 }, { instances: 2 });
    const cache = makeNode("redis", { x: 840, y: 40 });
    const db = makeNode("postgres", { x: 840, y: 260 });
    return {
      nodes: [client, lb, api, cache, db],
      edges: [
        { id: uid("edge"), source: client.id, target: lb.id },
        { id: uid("edge"), source: lb.id, target: api.id },
        { id: uid("edge"), source: api.id, target: cache.id },
        { id: uid("edge"), source: api.id, target: db.id },
      ],
    };
  })(),
  scaled: (() => {
    const client = makeNode("client", { x: 0, y: 200 }, { rps: 1000 });
    const cdn = makeNode("cdn", { x: 240, y: 200 });
    const lb = makeNode("load-balancer", { x: 480, y: 200 });
    const api = makeNode(
      "api-server",
      { x: 720, y: 200 },
      { instances: 4, maxConcurrentRequests: 200 }
    );
    const cache = makeNode(
      "redis",
      { x: 960, y: 80 },
      { hitRate: 0.9, clusterMode: true }
    );
    const db = makeNode(
      "postgres",
      { x: 960, y: 320 },
      { maxConnections: 200, replicaCount: 2 }
    );
    return {
      nodes: [client, cdn, lb, api, cache, db],
      edges: [
        { id: uid("edge"), source: client.id, target: cdn.id },
        { id: uid("edge"), source: cdn.id, target: lb.id },
        { id: uid("edge"), source: lb.id, target: api.id },
        { id: uid("edge"), source: api.id, target: cache.id },
        { id: uid("edge"), source: api.id, target: db.id },
      ],
    };
  })(),
};
