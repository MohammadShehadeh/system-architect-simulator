import type { MapperInput } from "@/lib/proxmox/map";

/**
 * A representative 3-node cluster used across the mapper/layout tests:
 *  - pve1 (online): web (running), db (running, VLAN 20), ubuntu-tmpl (template), local storage
 *  - pve2 (online): dns (lxc, running), worker (stopped, references unknown bridge vmbr9)
 *  - pve3 (offline)
 */
export function sampleMapperInput(): MapperInput {
  return {
    resources: [
      { id: "node/pve1", type: "node", node: "pve1", status: "online", cpu: 0.2, maxcpu: 8, mem: 8e9, maxmem: 32e9, uptime: 100000 },
      { id: "node/pve2", type: "node", node: "pve2", status: "online", cpu: 0.05, maxcpu: 4, mem: 2e9, maxmem: 16e9, uptime: 50000 },
      { id: "node/pve3", type: "node", node: "pve3", status: "offline" },
      { id: "qemu/100", type: "qemu", node: "pve1", vmid: 100, name: "web", status: "running", cpu: 0.1, maxcpu: 2, mem: 1e9, maxmem: 2e9, uptime: 9000, tags: "prod;web" },
      { id: "qemu/101", type: "qemu", node: "pve1", vmid: 101, name: "db", status: "running", cpu: 0.3, maxcpu: 4, mem: 6e9, maxmem: 8e9 },
      { id: "qemu/102", type: "qemu", node: "pve2", vmid: 102, name: "worker", status: "stopped" },
      { id: "qemu/900", type: "qemu", node: "pve1", vmid: 900, name: "ubuntu-tmpl", status: "stopped", template: 1 },
      { id: "lxc/200", type: "lxc", node: "pve2", vmid: 200, name: "dns", status: "running", cpu: 0.02, maxcpu: 1, mem: 1e8, maxmem: 5e8 },
      { id: "storage/pve1/local", type: "storage", node: "pve1", storage: "local", status: "available", disk: 1e10, maxdisk: 1e11, plugintype: "dir", shared: 0, content: "images,iso" },
    ],
    clusterStatus: [
      { type: "cluster", name: "homelab", quorate: 1, nodes: 3 },
      { type: "node", name: "pve1", online: 1, ip: "10.0.0.1" },
      { type: "node", name: "pve2", online: 1, ip: "10.0.0.2" },
      { type: "node", name: "pve3", online: 0, ip: "10.0.0.3" },
    ],
    networksByNode: {
      pve1: [
        { iface: "vmbr0", type: "bridge", active: 1, cidr: "10.0.0.1/24", bridge_ports: "eno1" },
        { iface: "eno1", type: "eth", active: 1 },
      ],
      pve2: [{ iface: "vmbr0", type: "bridge", active: 1, cidr: "10.0.0.2/24" }],
    },
    nicsByGuestId: {
      "qemu/100": [{ name: "net0", model: "virtio", bridge: "vmbr0" }],
      "qemu/101": [{ name: "net0", model: "virtio", bridge: "vmbr0", vlanTag: 20 }],
      "qemu/102": [{ name: "net0", model: "virtio", bridge: "vmbr9" }],
      "lxc/200": [{ name: "net0", model: "eth0", bridge: "vmbr0" }],
    },
    generatedAt: "2026-01-01T00:00:00.000Z",
  };
}
