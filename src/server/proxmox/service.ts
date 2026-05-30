import "server-only";

import { mapResourcesToTopology } from "@/lib/proxmox/map";
import { parseNetInterfaces } from "@/lib/proxmox/net";
import type {
  ClusterStatusItem,
  NetInterface,
  NodeNetworkIface,
  Topology,
} from "@/lib/proxmox/types";

import { proxmox } from "./client";
import { getProxmoxConfig } from "./env";

/**
 * Orchestration + server-side caching for the topology and health endpoints.
 *
 * The expensive part is the per-guest config fetch (one call each, for the NIC
 * wiring), so those are cached far longer than the cheap `/cluster/resources`
 * overview that carries the live CPU/RAM/status. A 5s topology poll therefore
 * usually only re-fetches the overview and reuses cached configs/networks.
 *
 * Note: the cache is per server process — ideal for a self-hosted single
 * instance. Behind multiple serverless instances it degrades to per-instance.
 */

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  const value = await fn();
  cacheStore.set(key, { value, expires: now + ttlMs });
  return value;
}

const NETWORK_TTL_MS = 60_000;
const CONFIG_TTL_MS = 60_000;
const CONCURRENCY = 8;

/** Run `fn` over `items` with a bounded number of concurrent calls. */
async function mapWithLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        await fn(item);
      }
    }
  );
  await Promise.all(workers);
}

export async function getTopology(): Promise<Topology> {
  const cfg = getProxmoxConfig();

  const [resources, clusterStatus] = await Promise.all([
    cached("resources", cfg.cacheTtlMs, proxmox.getClusterResources),
    cached("status", cfg.cacheTtlMs, () =>
      // Standalone hosts may not expose a cluster; tolerate a failure here.
      proxmox.getClusterStatus().catch(() => [] as ClusterStatusItem[])
    ),
  ]);

  const onlineNodes = resources
    .filter((r) => r.type === "node" && r.status !== "offline" && r.node)
    .map((r) => r.node as string);

  // Bridges per node (cached longer; per-node failures are non-fatal).
  const networksByNode: Record<string, NodeNetworkIface[]> = {};
  await mapWithLimit(onlineNodes, CONCURRENCY, async (node) => {
    try {
      networksByNode[node] = await cached(`net:${node}`, NETWORK_TTL_MS, () =>
        proxmox.getNodeNetworks(node)
      );
    } catch {
      networksByNode[node] = [];
    }
  });

  // NICs per running/stopped (non-template) guest, for the network edges.
  const guests = resources.filter(
    (r) =>
      (r.type === "qemu" || r.type === "lxc") &&
      r.template !== 1 &&
      r.node &&
      typeof r.vmid === "number"
  );
  const nicsByGuestId: Record<string, NetInterface[]> = {};
  await mapWithLimit(guests, CONCURRENCY, async (g) => {
    try {
      const kind = g.type === "qemu" ? "qemu" : "lxc";
      const config = await cached(`cfg:${g.id}`, CONFIG_TTL_MS, () =>
        proxmox.getGuestConfig(g.node as string, kind, g.vmid as number)
      );
      nicsByGuestId[g.id] = parseNetInterfaces(config);
    } catch {
      nicsByGuestId[g.id] = [];
    }
  });

  return mapResourcesToTopology({
    resources,
    clusterStatus,
    networksByNode,
    nicsByGuestId,
    generatedAt: new Date().toISOString(),
  });
}

export interface HealthResult {
  ok: boolean;
  reachable: boolean;
  clusterName: string | null;
  quorate: boolean | null;
  nodeCount: number;
}

export async function getHealth(): Promise<HealthResult> {
  const cfg = getProxmoxConfig();
  const status = await cached(
    "status",
    cfg.cacheTtlMs,
    proxmox.getClusterStatus
  );
  const cluster = status.find((s) => s.type === "cluster");
  const nodeCount = status.filter((s) => s.type === "node").length;
  return {
    ok: true,
    reachable: true,
    clusterName: cluster?.name ?? (nodeCount === 1 ? "standalone" : null),
    quorate: cluster ? cluster.quorate === 1 : true,
    nodeCount,
  };
}
