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
import {
  cloneTemplate,
  TEMPLATES_BY_ID,
  type Template,
} from "@/lib/architecture/templates";
import { uid } from "@/lib/utils";

export type ArchNode = Node<ComponentNodeData>;
export type ArchEdge = Edge;

export interface ArchitectureState {
  nodes: ArchNode[];
  edges: ArchEdge[];
  selectedNodeId: string | null;
  /** ID of the most recently loaded template, for showing context */
  activeTemplateId: string | null;

  onNodesChange: OnNodesChange<ArchNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void;

  addComponent: (type: ComponentType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<ComponentConfig>) => void;
  setSelectedNode: (id: string | null) => void;
  clear: () => void;
  loadTemplateById: (id: string) => void;
  loadTemplate: (template: Template) => void;
}

const initialState = (): {
  nodes: ArchNode[];
  edges: ArchEdge[];
  activeTemplateId: string | null;
} => ({
  nodes: [],
  edges: [],
  activeTemplateId: null,
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
                    config: {
                      ...n.data.config,
                      ...partial,
                    } as ComponentConfig,
                  },
                }
              : n
          ),
        });
      },

      setSelectedNode: (id) => set({ selectedNodeId: id }),

      clear: () =>
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          activeTemplateId: null,
        }),

      loadTemplateById: (id) => {
        const template = TEMPLATES_BY_ID[id];
        if (!template) return;
        const { nodes, edges } = cloneTemplate(template);
        set({
          nodes,
          edges,
          selectedNodeId: null,
          activeTemplateId: id,
        });
      },

      loadTemplate: (template) => {
        const { nodes, edges } = cloneTemplate(template);
        set({
          nodes,
          edges,
          selectedNodeId: null,
          activeTemplateId: template.id,
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
