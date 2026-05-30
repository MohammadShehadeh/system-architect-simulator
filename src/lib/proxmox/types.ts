/**
 * Shared Proxmox topology types.
 *
 * This module is intentionally free of secrets and Node-only APIs so it can be
 * imported from both the server (route handlers, client) and the browser
 * (components, store), and exercised directly in unit tests.
 *
 * Two families of types live here:
 *  - `Proxmox*` — the (subset of) raw shapes returned by the Proxmox VE API.
 *  - `Topology*` — our normalized, browser-safe model rendered on the canvas.
 */

/* -------------------------------------------------------------------------- */
/* Raw Proxmox API shapes (only the fields we consume)                        */
/* -------------------------------------------------------------------------- */

export type ProxmoxResourceType =
  | "node"
  | "qemu"
  | "lxc"
  | "storage"
  | "sdn"
  | "pool";

/** One entry from `GET /cluster/resources`. */
export interface ProxmoxResource {
  id: string;
  type: ProxmoxResourceType | (string & {});
  node?: string;
  /** "online"/"offline" for nodes, "running"/"stopped" for guests. */
  status?: string;
  name?: string;
  vmid?: number;
  /** 1 when the guest is a template. */
  template?: number;
  /** CPU usage as a 0..1 fraction. */
  cpu?: number;
  /** Number of CPU cores. */
  maxcpu?: number;
  /** Memory in bytes. */
  mem?: number;
  maxmem?: number;
  /** Disk in bytes. */
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  tags?: string;
  pool?: string;
  storage?: string;
  plugintype?: string;
  shared?: number;
  content?: string;
  level?: string;
}

/** One entry from `GET /cluster/status`. */
export interface ClusterStatusItem {
  type: "cluster" | "node" | (string & {});
  id?: string;
  name?: string;
  nodes?: number;
  /** 1 when the cluster has quorum (cluster row only). */
  quorate?: number;
  /** 1 when the node is online (node row only). */
  online?: number;
  ip?: string;
  level?: string;
}

/** One entry from `GET /nodes/{node}/network`. */
export interface NodeNetworkIface {
  iface: string;
  type: string;
  active?: number;
  cidr?: string;
  address?: string;
  bridge_ports?: string;
  bridge_vlan_aware?: number;
  comments?: string;
}

/** A single parsed NIC from a guest's `netN` config line. */
export interface NetInterface {
  /** Config key, e.g. "net0". */
  name: string;
  /** Bridge the NIC attaches to, e.g. "vmbr0". */
  bridge?: string;
  /** VLAN tag if the NIC is tagged. */
  vlanTag?: number;
  /** MAC address if present. */
  hwaddr?: string;
  /** NIC model / guest-side name (e.g. "virtio", "eth0"). */
  model?: string;
}

/* -------------------------------------------------------------------------- */
/* Normalized topology model (browser-safe)                                   */
/* -------------------------------------------------------------------------- */

export type EntityType =
  | "host"
  | "vm"
  | "container"
  | "bridge"
  | "vnet"
  | "storage";

export type EntityStatus =
  | "running"
  | "stopped"
  | "online"
  | "offline"
  | "unknown";

export interface EntityMetrics {
  /** CPU usage as a 0..1 fraction. */
  cpu?: number;
  maxcpu?: number;
  memBytes?: number;
  maxMemBytes?: number;
  diskBytes?: number;
  maxDiskBytes?: number;
  uptimeSec?: number;
}

export interface TopologyEntity {
  /** Stable id, e.g. "host/pve1", "qemu/100", "bridge/pve1/vmbr0". */
  id: string;
  type: EntityType;
  /** Parent entity id for nesting (host for a vm/container/bridge/storage). */
  parentId?: string;
  label: string;
  status: EntityStatus;
  /** Proxmox node this entity lives on. */
  node?: string;
  vmid?: number;
  tags?: string[];
  template?: boolean;
  metrics?: EntityMetrics;
  /** Extra detail surfaced in the inspector; never anything secret. */
  meta?: Record<string, string | number | boolean | null>;
}

export type TopologyEdgeKind = "network";

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  kind: TopologyEdgeKind;
  label?: string;
}

export interface TopologyMeta {
  clusterName: string;
  quorate: boolean;
  nodeCount: number;
  /** ISO timestamp of when the snapshot was produced. */
  generatedAt: string;
}

export interface Topology {
  entities: TopologyEntity[];
  edges: TopologyEdge[];
  meta: TopologyMeta;
}

/* -------------------------------------------------------------------------- */
/* React Flow glue + client view state                                        */
/* -------------------------------------------------------------------------- */

/** Data carried by every React Flow node. */
export type TopoNodeData = {
  entity: TopologyEntity;
};

/** Client-side view filters; applied during layout so they never refetch. */
export interface TopologyFilters {
  search: string;
  showStopped: boolean;
  showTemplates: boolean;
  showStorage: boolean;
  /** Restrict to a single Proxmox node, or null for all. */
  nodeName: string | null;
}

export const DEFAULT_FILTERS: TopologyFilters = {
  search: "",
  showStopped: true,
  showTemplates: false,
  showStorage: false,
  nodeName: null,
};
