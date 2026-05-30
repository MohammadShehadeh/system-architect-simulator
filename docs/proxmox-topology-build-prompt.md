# Build Prompt — Proxmox Live Topology Viewer (Next.js + React Flow)

> Paste everything below the line into your coding agent (Claude Code, etc.) as the build brief.
> It is written as a self-contained spec for a **standalone** Next.js app. It intentionally
> mirrors the stack of the `system-architect-simulator` repo so the result can be merged in
> later as a "Live" mode.

---

## Mission

Build a **read-only Proxmox VE topology viewer**: a Next.js web app that authenticates to a
Proxmox cluster with an **API token**, pulls the live inventory (cluster → nodes → VMs/containers,
plus storage and networks), and renders it as an interactive **React Flow** diagram that auto-refreshes.
Selecting any entity shows its live details. **No write/control actions in v1** — purely observe.

The single most important rule: **the Proxmox API token never reaches the browser.** All Proxmox
calls go through Next.js server-side route handlers. The browser only ever receives sanitized,
already-mapped topology JSON.

---

## Tech stack & constraints (match exactly)

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict).
- **`@xyflow/react` v12** for the canvas (this is the current React Flow package; not `reactflow`).
- **Zustand v5** for client state.
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) for UI. Use `components.json` conventions.
- **lucide-react** for icons.
- **pnpm** for package management.
- **Vitest** (unit) + **Playwright** (e2e).
- Layout: a small deterministic layout function for v1 (specified below). `elkjs` is an optional
  later upgrade — do **not** pull it in for v1.

> If you are building inside a repo that ships a customized Next.js, **read the local docs first**
> (`node_modules/next/dist/docs/`) before writing route handlers or config — APIs may differ from
> public Next.js. Heed deprecation notices.

---

## Security model (non-negotiable)

1. Token lives only in server env vars. Never imported into a client component, never sent in a
   browser-visible response, never logged.
2. All Proxmox access is via **Next.js Route Handlers** (`app/api/proxmox/**`) or server actions.
   The client calls *your* API, your API calls Proxmox.
3. Recommend least privilege in the README: create the token with the **`PVEAuditor`** role at path
   `/` (read-only). Document that `Sys.Audit` / `VM.Audit` is all that's needed.
4. Proxmox commonly uses a **self-signed TLS cert**. Handle this on the server with an explicit,
   documented opt-in (`PROXMOX_TLS_REJECT_UNAUTHORIZED=false`) using a custom `https.Agent` — never
   by globally disabling TLS verification for the whole process. Default to verifying.
5. No mutating Proxmox endpoints are called in v1. The server client only issues `GET`s.

---

## Environment variables

Create `.env.example` (committed) and read these server-side only:

```
# https://<host>:8006  (no trailing /api2/json)
PROXMOX_HOST=https://pve.example.lan:8006

# API token in the form USER@REALM!TOKENID and its secret (UUID)
PROXMOX_TOKEN_ID=monitoring@pve!viewer
PROXMOX_TOKEN_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Set false ONLY for self-signed certs on a trusted network. Default true.
PROXMOX_TLS_REJECT_UNAUTHORIZED=true

# Optional: server-side cache TTL (ms) for the cheap inventory poll
PROXMOX_CACHE_TTL_MS=4000
```

The Proxmox auth header is **stateless** (no login/ticket needed with a token):

```
Authorization: PVEAPIToken=<PROXMOX_TOKEN_ID>=<PROXMOX_TOKEN_SECRET>
# e.g. Authorization: PVEAPIToken=monitoring@pve!viewer=xxxxxxxx-xxxx-...
```

---

## Proxmox API reference (what to call)

Base URL: `${PROXMOX_HOST}/api2/json`. All responses wrap payload in `{ "data": ... }`.

**Primary inventory (one cheap call powers ~90% of the diagram):**
- `GET /cluster/resources` → flat array; each item has a `type`:
  - `type:"node"` → `{ id:"node/pve1", node, status:"online"|"offline"|"unknown", cpu(0..1), maxcpu, mem, maxmem, disk, maxdisk, uptime, level }`
  - `type:"qemu"` → `{ id:"qemu/100", vmid, name, node, status:"running"|"stopped", template(0|1), cpu, maxcpu, mem, maxmem, disk, maxdisk, uptime, tags, pool }`
  - `type:"lxc"`  → same shape as qemu (containers)
  - `type:"storage"` → `{ id, node, storage, status, disk, maxdisk, plugintype, shared, content }`
  - `type:"sdn"` → `{ id, sdn, node, status }`
  - `type:"pool"` → `{ id, pool }`

**Cluster membership / quorum:**
- `GET /cluster/status` → items `type:"cluster"` (`{ name, quorate, nodes }`) and `type:"node"` (`{ name, online, ip, level }`).

**Per-host networks (bridges/bonds/vlans):**
- `GET /nodes/{node}/network?type=any` → interfaces: `{ iface, type:"bridge"|"bond"|"eth"|"vlan", active, cidr, bridge_ports, bridge_vlan_aware }`. Filter to bridges + SDN vnets for the diagram.

**Per-VM NIC attachments (needed for network edges; fetch lazily + cache):**
- `GET /nodes/{node}/qemu/{vmid}/config` → keys `net0..netN`, each a CSV string:
  `virtio=BC:24:11:..,bridge=vmbr0,tag=20,firewall=1`. Parse `bridge=` and optional `tag=` (VLAN).
- `GET /nodes/{node}/lxc/{vmid}/config` → keys `net0..netN`: `name=eth0,bridge=vmbr0,ip=dhcp,tag=20`.

**SDN (only if present):**
- `GET /cluster/sdn/vnets`, `GET /cluster/sdn/zones` → cluster-wide virtual networks.

> Field names vary slightly across PVE 7/8/9. Treat optional fields defensively; verify against the
> live cluster the token points at. Don't assume a field exists — guard with `?? null`.

---

## Server layer (`src/server/proxmox/`)

Build a small, framework-agnostic, unit-testable client + a few route handlers.

**`client.ts` — typed Proxmox client**
- `createProxmoxClient(env)` returns methods: `getClusterResources()`, `getClusterStatus()`,
  `getNodeNetworks(node)`, `getVmConfig(node, type, vmid)`.
- Uses `fetch` with the `Authorization: PVEAPIToken=...` header and a custom `https.Agent`
  honoring `PROXMOX_TLS_REJECT_UNAUTHORIZED`.
- Normalizes errors into a typed `ProxmoxError { kind: "auth"|"network"|"tls"|"http"|"parse", status?, message }`.
  Map 401/403 → `auth`, cert errors → `tls`, fetch throw → `network`.
- A concurrency-limited helper `mapWithLimit(items, n, fn)` for fanning out per-VM config calls
  (cap at ~8 in flight).

**Caching / polling strategy (be a good API citizen):**
- Cache `getClusterResources()` server-side for `PROXMOX_CACHE_TTL_MS` (default 4s). This is the
  cheap, frequently-polled overview and already contains live `cpu`/`mem`/`status`.
- Per-VM `config` (network attachments) changes rarely → fetch on demand, cache longer (e.g. 60s),
  refresh only when the client explicitly requests a topology rebuild.

**Route handlers (`app/api/proxmox/`):**
- `GET /api/proxmox/topology` → returns the fully mapped `{ nodes, edges, meta }` (see Mapper).
  This is what the client polls. Combines cluster/resources + cached per-VM configs + networks.
- `GET /api/proxmox/health` → `{ ok, quorate, reachable, error? }` for a connection banner.
- All handlers run on the Node.js runtime (not edge — you need `https.Agent`). Never echo the token
  or raw upstream auth errors verbatim.

---

## Domain model (`src/lib/topology/types.ts`)

```ts
export type EntityType = "cluster" | "host" | "vm" | "container" | "storage" | "bridge" | "vnet";
export type EntityStatus = "running" | "stopped" | "online" | "offline" | "unknown";

export interface TopologyEntity {
  id: string;            // stable: e.g. "qemu/100", "host/pve1", "bridge/pve1/vmbr0"
  type: EntityType;
  parentId?: string;     // host for a vm/container/bridge; cluster for a host
  label: string;
  status: EntityStatus;
  metrics?: {            // live, from cluster/resources
    cpu?: number;        // 0..1
    maxcpu?: number;
    memBytes?: number;
    maxMemBytes?: number;
    uptimeSec?: number;
  };
  meta?: Record<string, string | number | boolean | null>; // vmid, node, pool, tags, vlan, cidr...
}

export interface TopologyEdge {
  id: string;
  source: string;        // entity id (e.g. a vm)
  target: string;        // entity id (e.g. a bridge)
  label?: string;        // e.g. "vlan 20"
  kind: "network";       // room to grow (ha, migration, storage) later
}

export interface Topology {
  entities: TopologyEntity[];
  edges: TopologyEdge[];
  meta: { clusterName: string; quorate: boolean; generatedAt: string };
}
```

---

## Topology mapper (`src/lib/topology/map.ts`) — pure, unit-tested

A pure function `mapResourcesToTopology(input) -> Topology`. **No fetch, no Next, no React** — so it
can be tested with fixtures. Inputs: `cluster/resources` array, `cluster/status`, per-host networks,
and a `Map<vmId, NetIface[]>` of parsed VM NICs.

Rules:
1. One `cluster` entity from `cluster/status` (name, quorate).
2. Each `type:"node"` → `host` entity, `parentId = cluster`. Skip/flag offline hosts (status).
3. Each `qemu` → `vm`, each `lxc` → `container`; `parentId = host/<node>`. Skip `template:1` by
   default (expose a "show templates" toggle later). Carry cpu/mem/status into `metrics`.
4. Bridges: for each host network of `type:"bridge"`, create a `bridge` entity
   `id="bridge/<node>/<iface>"`, `parentId = host/<node>`. Bridges are **per-host** in Proxmox.
5. SDN vnets (if any) → `vnet` entities at cluster level (parentId = cluster).
6. Network edges: parse each VM/container NIC (`bridge=`, `tag=`). Add a `network` edge
   `vm -> bridge/<node>/<vmbrX>` (or `-> vnet/<name>` for SDN). Label with `vlan <tag>` if present.
   If the referenced bridge wasn't discovered, create a placeholder bridge entity so no edge dangles.
7. Storage (optional in v1 view, behind a toggle): `type:"storage"` → `storage` entity per node, or
   collapse shared storage to one cluster-level node.

Cover with Vitest: a multi-node cluster fixture, a VM on a VLAN-tagged bridge, an offline host, a
template (excluded), and a NIC referencing an unknown bridge (placeholder created).

---

## Layout (`src/lib/topology/layout.ts`) — deterministic for v1

Don't rely on saved coordinates (real infra has none). Compute positions deterministically so the
diagram is stable across refreshes (no jitter):

- **Hosts**: lay group boxes left-to-right in a row; wrap to a new row past N hosts.
- **VMs/containers**: inside their host group, a grid (e.g. 3 columns), fixed cell size; size the host
  box from the child count. Use React Flow **parent/child nesting**: child nodes get `parentId` +
  `extent: "parent"`; **push group nodes into the `nodes` array before their children**.
- **Bridges**: a row along the bottom edge of each host group (or just below it).
- **Cluster**: either an outer group box around all hosts, or a header label — pick the cleaner look.
- Keep positions a pure function of ids/counts so a refresh that changes only metrics doesn't move
  anything. Only structural changes (add/remove VM) reflow.

`elkjs` hierarchical layout is a fine later enhancement; not needed for v1.

---

## React Flow UI (`src/components/topology/`)

- `TopologyCanvas` — `<ReactFlowProvider>` + `<ReactFlow>` with `Background`, `Controls`, `MiniMap`,
  `fitView`. Register custom node types: `cluster`, `host`, `vm`, `container`, `bridge`, `vnet`,
  `storage`.
- Custom nodes (one component, type-driven styling via a map, mirroring shadcn/Tailwind tokens):
  - **host**: name, online/offline ring, CPU & RAM mini-bars (from metrics), VM count.
  - **vm/container**: name + vmid, status dot (green=running / gray=stopped), small CPU/RAM bars,
    tags chips. Container vs VM differentiated by icon (lucide: `Server` vs `Box`).
  - **bridge/vnet**: pill node with iface name + CIDR/VLAN.
  - **storage**: usage bar.
- Status → color: running/online = emerald, stopped = slate, offline = red, unknown = amber.
- **Edges**: network edges thin, animated only while "live"; label shows VLAN. Color by bridge.
- Group (host) nodes are non-deletable, draggable to reposition (children follow), collapsible later.
- Read-only: disable node/edge creation handles; allow pan/zoom/select/drag only.

**App shell (`app/page.tsx` + components):**
- **Connection banner**: polls `/api/proxmox/health`; shows cluster name + quorum, or a clear error
  state (auth / TLS / unreachable) with a remediation hint. Don't leak token or raw upstream text.
- **Live polling**: a `useTopology` hook polls `/api/proxmox/topology` on an interval (default 5s),
  with a visible **interval control** (off / 5s / 15s / 30s) and a manual **Refresh** button. Use an
  AbortController; pause polling when the tab is hidden (`visibilitychange`).
- **Detail drawer** (shadcn `Sheet`/`Dialog`): on node select, show all `meta` + live metrics
  (cpu %, mem used/total, uptime, node, pool, tags, IP/VLAN). Read-only.
- **Search + filters** (Zustand): filter by name/vmid, by status (running/stopped), by node, by type;
  toggles for "show templates" and "show storage". Filtered-out nodes dim or hide.
- **Legend** of node types/status colors.
- **States**: skeleton on first load, empty state ("no resources / token lacks audit rights"), and a
  non-blocking toast on transient poll failures (keep showing last-good topology).

**Client state (`src/lib/store/topology-store.ts`, Zustand):**
- `topology`, `selectedId`, `filters`, `pollIntervalMs`, `lastError`, `lastUpdated`.
- Keep last-good topology on transient errors; only blank on auth failure.

---

## Testing

- **Unit (Vitest)**: the mapper (fixtures above), the NIC/`netX` CSV parser, the layout function
  (stable positions), and the Proxmox client error normalization (mock `fetch`: 401→auth,
  cert error→tls, network throw→network).
- **e2e (Playwright)**: stub `/api/proxmox/*` route responses (no real cluster needed). Assert: nodes
  render nested under hosts, a VLAN edge is labeled, selecting a VM opens the drawer with its vmid,
  the interval control changes poll cadence, and an auth error renders the error banner.
- CI: typecheck + lint + unit + e2e on PR (GitHub Actions), matching the existing repo's pipeline.

---

## Acceptance criteria

1. With valid env vars pointed at a real cluster, the app renders cluster → hosts → VMs/containers,
   with per-host bridges and VLAN-labeled network edges.
2. The token is **never** present in any client bundle or network response (grep the built client
   output and the `/api/proxmox/topology` payload to prove it).
3. Live metrics (status, CPU, RAM) refresh on the chosen interval without the layout jittering.
4. Selecting any entity shows accurate live details.
5. Self-signed-cert clusters work when `PROXMOX_TLS_REJECT_UNAUTHORIZED=false`, and the default
   (verify on) is documented.
6. Auth/TLS/unreachable failures produce clear, non-leaky error states.
7. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` all pass. README documents token
   creation (PVEAuditor at `/`), env setup, and how to run.

---

## Build order (milestones)

1. **Scaffold**: Next.js 16 + TS + Tailwind v4 + shadcn + @xyflow/react + Zustand + Vitest +
   Playwright. `.env.example`, README skeleton.
2. **Server client + types** (`client.ts`, `types.ts`) with mocked `fetch` unit tests. No UI yet.
3. **Mapper + layout** (pure, fully unit-tested with fixtures).
4. **Route handlers** (`/topology`, `/health`) wiring client → mapper, with server-side caching.
5. **Canvas + custom nodes** rendering a static fixture topology.
6. **Live polling + store + detail drawer + filters + banner.**
7. **e2e + CI + README.** Polish states (loading/empty/error), legend, interval control.

## Out of scope for v1 (note in README as "next")

Start/stop/migrate or any mutation; historical metrics/graphs (Proxmox RRD); per-guest disk/IO
topology; multi-cluster; auth beyond a single server token. Architect the edge model (`kind`) and
entity types so HA/migration/storage edges can be added later.
