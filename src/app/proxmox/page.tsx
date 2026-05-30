import type { Metadata } from "next";

import { TopologyApp } from "@/components/proxmox/topology-app";

export const metadata: Metadata = {
  title: "Proxmox Topology",
  description:
    "Live, read-only view of a Proxmox VE cluster — nodes, VMs, containers, and networks rendered on a canvas.",
  robots: { index: false, follow: false },
};

export default function ProxmoxPage() {
  return <TopologyApp />;
}
