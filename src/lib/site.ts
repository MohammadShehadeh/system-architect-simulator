/**
 * Site-wide brand constants. One source of truth for name, URLs, social links.
 */

export const SITE = {
  name: "MSH Infra",
  fullName: "MSH Infra — design distributed systems, simulate production load",
  description: "design distributed systems, simulate production load",
  longDescription:
    "Design distributed systems visually with React Flow, then watch them succeed or fail under simulated production load. Drag in load balancers, caches, databases, and queues; the simulator surfaces bottlenecks, SLO breaches, and monthly cost estimates in real time.",
  url: "https://msh-infra.dev",
  version: "0.1",
  author: "Mohammad Shehadeh",
  authorUrl: "https://mohammadshehadeh.com",
  twitterHandle: "@mohammadshhadeh",
  twitterUrl: "https://x.com/mohammadshhadeh",
  githubUrl: "https://github.com/mohammadshehadeh/system-architect-simulator",
  keywords: [
    "system design",
    "distributed systems",
    "architecture simulator",
    "system architect",
    "react flow",
    "load balancer",
    "caching",
    "database",
    "message queue",
    "slo",
    "bottlenecks",
    "capacity planning",
    "cost estimation",
    "msh infra",
    "msh-infra",
    "next.js",
    "react 19",
  ],
} as const
