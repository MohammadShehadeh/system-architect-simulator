/**
 * Pure mapper: raw Proxmox API data -> normalized `Topology`.
 *
 * No fetching, no Node APIs, no React — just data in, data out — so it can be
 * unit-tested exhaustively with fixtures. Positions are NOT assigned here;
 * laying out the graph is the job of `layout.ts`.
 */

import type {
  ClusterStatusItem,
  EntityMetrics,
  EntityStatus,
  NetInterface,
  NodeNetworkIface,
  ProxmoxResource,
  Topology,
  TopologyEdge,
  TopologyEntity,
} from "./types";

export interface MapperInput {
  /** `GET /cluster/resources`. */
  resources: ProxmoxResource[];
  /** `GET /cluster/status` (optional; supplies cluster name + quorum + node IPs). */
  clusterStatus?: ClusterStatusItem[];
  /** Bridges per Proxmox node, keyed by node name. */
  networksByNode?: Record<string, NodeNetworkIface[]>;
  /** Parsed NICs per guest, keyed by resource id (e.g. "qemu/100"). */
  nicsByGuestId?: Record<string, NetInterface[]>;
  /** ISO timestamp for the snapshot; defaults to now. */
  generatedAt?: string;
}

const BRIDGE_IFACE_TYPES = new Set(["bridge", "OVSBridge"]);

function hostStatus(status: string | undefined): EntityStatus {
  if (status === "online") return "online";
  if (status === "offline") return "offline";
  return "unknown";
}

function guestStatus(status: string | undefined): EntityStatus {
  if (status === "running") return "running";
  if (status === "stopped") return "stopped";
  return "unknown";
}

function metricsOf(r: ProxmoxResource): EntityMetrics | undefined {
  const m: EntityMetrics = {};
  if (typeof r.cpu === "number") m.cpu = r.cpu;
  if (typeof r.maxcpu === "number") m.maxcpu = r.maxcpu;
  if (typeof r.mem === "number") m.memBytes = r.mem;
  if (typeof r.maxmem === "number") m.maxMemBytes = r.maxmem;
  if (typeof r.disk === "number") m.diskBytes = r.disk;
  if (typeof r.maxdisk === "number") m.maxDiskBytes = r.maxdisk;
  if (typeof r.uptime === "number") m.uptimeSec = r.uptime;
  return Object.keys(m).length ? m : undefined;
}

function parseTags(tags: string | undefined): string[] | undefined {
  if (!tags) return undefined;
  const arr = tags
    .split(/[;,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
}

function lastSegment(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}

export function mapResourcesToTopology(input: MapperInput): Topology {
  const {
    resources,
    clusterStatus = [],
    networksByNode = {},
    nicsByGuestId = {},
    generatedAt = new Date().toISOString(),
  } = input;

  const entities = new Map<string, TopologyEntity>();
  const edges: TopologyEdge[] = [];

  // Index cluster/status node rows for IP + online state.
  const statusByNode = new Map<string, ClusterStatusItem>();
  let clusterRow: ClusterStatusItem | undefined;
  for (const item of clusterStatus) {
    if (item.type === "cluster") clusterRow = item;
    else if (item.type === "node" && item.name) statusByNode.set(item.name, item);
  }

  /* ---- Hosts -------------------------------------------------------------- */
  const hostIdByNode = new Map<string, string>();
  for (const r of resources) {
    if (r.type !== "node") continue;
    const nodeName = r.node ?? r.id.split("/")[1] ?? r.id;
    const id = `host/${nodeName}`;
    hostIdByNode.set(nodeName, id);
    const statusRow = statusByNode.get(nodeName);
    entities.set(id, {
      id,
      type: "host",
      label: nodeName,
      status: hostStatus(r.status ?? (statusRow?.online ? "online" : undefined)),
      node: nodeName,
      metrics: metricsOf(r),
      meta: {
        ip: statusRow?.ip ?? null,
        level: r.level ?? statusRow?.level ?? null,
      },
    });
  }

  const ensureHost = (nodeName: string): string => {
    const existing = hostIdByNode.get(nodeName);
    if (existing) return existing;
    // A guest referenced a node we didn't see as a resource — synthesize it.
    const id = `host/${nodeName}`;
    hostIdByNode.set(nodeName, id);
    entities.set(id, {
      id,
      type: "host",
      label: nodeName,
      status: "unknown",
      node: nodeName,
      meta: { synthetic: true },
    });
    return id;
  };

  /* ---- Bridges (per host) ------------------------------------------------- */
  const bridgeIds = new Set<string>();
  for (const [nodeName, ifaces] of Object.entries(networksByNode)) {
    for (const iface of ifaces) {
      if (!BRIDGE_IFACE_TYPES.has(iface.type)) continue;
      const parentId = ensureHost(nodeName);
      const id = `bridge/${nodeName}/${iface.iface}`;
      bridgeIds.add(id);
      entities.set(id, {
        id,
        type: "bridge",
        parentId,
        label: iface.iface,
        status: iface.active ? "online" : "unknown",
        node: nodeName,
        meta: {
          cidr: iface.cidr ?? iface.address ?? null,
          ports: iface.bridge_ports ?? null,
          vlanAware: iface.bridge_vlan_aware === 1,
        },
      });
    }
  }

  /* ---- SDN vnets (cluster-wide) ------------------------------------------- */
  const vnetIdByName = new Map<string, string>();
  for (const r of resources) {
    if (r.type !== "sdn") continue;
    const name = lastSegment(r.id);
    const id = `vnet/${name}`;
    if (!vnetIdByName.has(name)) vnetIdByName.set(name, id);
    // Merge status across nodes: any "available" wins.
    const prev = entities.get(id);
    const status: EntityStatus =
      r.status === "available" || prev?.status === "online" ? "online" : "unknown";
    entities.set(id, {
      id,
      type: "vnet",
      label: name,
      status,
      meta: { kind: "sdn-vnet" },
    });
  }

  /* ---- Guests (vm / container) ------------------------------------------- */
  for (const r of resources) {
    if (r.type !== "qemu" && r.type !== "lxc") continue;
    const nodeName = r.node ?? "";
    const parentId = nodeName ? ensureHost(nodeName) : undefined;
    const id = r.id; // "qemu/100" | "lxc/200"
    const isTemplate = r.template === 1;
    entities.set(id, {
      id,
      type: r.type === "qemu" ? "vm" : "container",
      parentId,
      label: r.name ?? (r.vmid != null ? `${r.vmid}` : lastSegment(id)),
      status: guestStatus(r.status),
      node: nodeName || undefined,
      vmid: r.vmid,
      tags: parseTags(r.tags),
      template: isTemplate,
      metrics: metricsOf(r),
      meta: {
        pool: r.pool ?? null,
        kind: r.type === "qemu" ? "qemu" : "lxc",
      },
    });

    if (isTemplate) continue; // templates carry no live network edges

    /* ---- Network edges from this guest's NICs ---------------------------- */
    const nics = nicsByGuestId[id] ?? [];
    for (const nic of nics) {
      if (!nic.bridge) continue;
      // Prefer an SDN vnet of the same name, else a per-host bridge.
      let targetId = vnetIdByName.get(nic.bridge);
      if (!targetId) {
        targetId = `bridge/${nodeName}/${nic.bridge}`;
        if (!bridgeIds.has(targetId)) {
          // NIC references a bridge we never discovered — create a placeholder
          // so the edge never dangles.
          bridgeIds.add(targetId);
          entities.set(targetId, {
            id: targetId,
            type: "bridge",
            parentId,
            label: nic.bridge,
            status: "unknown",
            node: nodeName || undefined,
            meta: { placeholder: true },
          });
        }
      }
      edges.push({
        id: `net/${id}/${nic.name}`,
        source: id,
        target: targetId,
        kind: "network",
        label: nic.vlanTag != null ? `VLAN ${nic.vlanTag}` : undefined,
      });
    }
  }

  /* ---- Storage (per host) ------------------------------------------------- */
  for (const r of resources) {
    if (r.type !== "storage") continue;
    const nodeName = r.node ?? "";
    const parentId = nodeName ? ensureHost(nodeName) : undefined;
    const id = r.id; // "storage/pve1/local"
    entities.set(id, {
      id,
      type: "storage",
      parentId,
      label: r.storage ?? lastSegment(id),
      status: r.status === "available" ? "online" : "unknown",
      node: nodeName || undefined,
      metrics: metricsOf(r),
      meta: {
        plugin: r.plugintype ?? null,
        shared: r.shared === 1,
        content: r.content ?? null,
      },
    });
  }

  /* ---- Cluster meta ------------------------------------------------------- */
  const nodeCount = [...entities.values()].filter((e) => e.type === "host").length;
  const meta = {
    clusterName: clusterRow?.name ?? (nodeCount === 1 ? "standalone" : "proxmox"),
    quorate: clusterRow ? clusterRow.quorate === 1 : true,
    nodeCount,
    generatedAt,
  };

  const sortedEntities = [...entities.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  edges.sort((a, b) => a.id.localeCompare(b.id));

  return { entities: sortedEntities, edges, meta };
}
