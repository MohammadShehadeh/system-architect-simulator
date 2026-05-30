# MSH Infra

Design distributed systems on a canvas, then watch them succeed or fail under simulated production load. Drag in components (load balancers, caches, databases, queues, …), wire them together, pick a traffic pattern, and the simulator surfaces bottlenecks, SLO breaches, and monthly cost estimates in real time.

Built with Next.js 16, React 19, [React Flow](https://reactflow.dev/), Zustand, and shadcn/ui. The simulation engine runs in a Web Worker so the UI stays responsive at high RPS.

## Getting started

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

## Scripts

- `pnpm dev` – Next.js dev server
- `pnpm build` – production build
- `pnpm start` – serve the production build
- `pnpm lint` – ESLint
- `pnpm typecheck` – `tsc --noEmit`

## Proxmox live topology (`/proxmox`)

A read-only view of a real [Proxmox VE](https://www.proxmox.com/) cluster — nodes,
VMs/containers, bridges, and the network wiring between them — rendered on the same
React Flow canvas and auto-refreshed.

Set up an API token (Datacenter → Permissions → API Tokens) with the read-only
**PVEAuditor** role at path `/`, then copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
# edit PROXMOX_HOST / PROXMOX_TOKEN_ID / PROXMOX_TOKEN_SECRET
pnpm dev   # then open http://localhost:3000/proxmox
```

For a self-signed certificate on a trusted network, set
`PROXMOX_TLS_REJECT_UNAUTHORIZED=false`.

The token is read **server-side only** — the browser talks to the app's own
`/api/proxmox/*` route handlers, which proxy the Proxmox API and return sanitized
topology JSON. The token never reaches the client bundle. See
[docs/proxmox-topology-build-prompt.md](./docs/proxmox-topology-build-prompt.md) for
the full design.

## Project layout

```
src/
  app/                       Next.js app router entry
    proxmox/                 Proxmox topology page (/proxmox)
    api/proxmox/             Route handlers: topology + health (server-only)
  components/
    architecture/            Canvas, panels, toolbar, dialogs
    proxmox/                 Topology canvas, nodes, inspector, filters, banner
    theme/                   Theme provider + toggle
    ui/                      shadcn/ui primitives
  lib/
    architecture/            Domain types, templates, validation, docs, cost model
    proxmox/                 Topology types, mapper, layout, NIC parser (pure)
    simulation/              Engine + Web Worker + React hook + messages
    store/                   Zustand stores (architecture, simulation, proxmox)
  server/
    proxmox/                 Env/config, https client, caching service (server-only)
```

## Docs

- [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) – product/architecture plan
- [docs/project-plan-review.md](./docs/project-plan-review.md) – plan review notes
