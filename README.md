# System Architect Simulator

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

## Project layout

```
src/
  app/                       Next.js app router entry
  components/
    architecture/            Canvas, panels, toolbar, dialogs
    theme/                   Theme provider + toggle
    ui/                      shadcn/ui primitives
  lib/
    architecture/            Domain types, templates, validation, docs, cost model
    simulation/              Engine + Web Worker + React hook + messages
    store/                   Zustand stores (architecture, simulation)
```

## Docs

- [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md) – product/architecture plan
- [docs/project-plan-review.md](./docs/project-plan-review.md) – plan review notes
