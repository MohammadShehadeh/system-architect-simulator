import { describe, expect, it } from "vitest";

import { mapResourcesToTopology } from "@/lib/proxmox/map";
import type { Topology } from "@/lib/proxmox/types";

import { sampleMapperInput } from "./fixtures";

const find = (t: Topology, id: string) => t.entities.find((e) => e.id === id);

describe("mapResourcesToTopology", () => {
  const topo = mapResourcesToTopology(sampleMapperInput());

  it("creates a host per node", () => {
    expect(find(topo, "host/pve1")?.type).toBe("host");
    expect(find(topo, "host/pve1")?.status).toBe("online");
  });

  it("flags an offline host", () => {
    expect(find(topo, "host/pve3")?.status).toBe("offline");
  });

  it("carries the host IP from cluster status", () => {
    expect(find(topo, "host/pve1")?.meta?.ip).toBe("10.0.0.1");
  });

  it("maps qemu->vm and lxc->container, nested under their host", () => {
    expect(find(topo, "qemu/100")?.type).toBe("vm");
    expect(find(topo, "qemu/100")?.parentId).toBe("host/pve1");
    expect(find(topo, "lxc/200")?.type).toBe("container");
    expect(find(topo, "lxc/200")?.parentId).toBe("host/pve2");
  });

  it("parses guest tags", () => {
    expect(find(topo, "qemu/100")?.tags).toEqual(["prod", "web"]);
  });

  it("marks templates and gives them no network edges", () => {
    expect(find(topo, "qemu/900")?.template).toBe(true);
    expect(topo.edges.some((e) => e.source === "qemu/900")).toBe(false);
  });

  it("creates per-host bridges and excludes non-bridge interfaces", () => {
    expect(find(topo, "bridge/pve1/vmbr0")?.type).toBe("bridge");
    expect(find(topo, "bridge/pve1/vmbr0")?.meta?.cidr).toBe("10.0.0.1/24");
    expect(find(topo, "bridge/pve1/eno1")).toBeUndefined();
  });

  it("draws a VLAN-labelled edge from guest to bridge", () => {
    const edge = topo.edges.find((e) => e.id === "net/qemu/101/net0");
    expect(edge?.source).toBe("qemu/101");
    expect(edge?.target).toBe("bridge/pve1/vmbr0");
    expect(edge?.label).toBe("VLAN 20");
  });

  it("leaves untagged NIC edges unlabelled", () => {
    expect(
      topo.edges.find((e) => e.id === "net/qemu/100/net0")?.label
    ).toBeUndefined();
  });

  it("synthesizes a placeholder bridge for an unknown bridge reference", () => {
    const placeholder = find(topo, "bridge/pve2/vmbr9");
    expect(placeholder?.type).toBe("bridge");
    expect(placeholder?.meta?.placeholder).toBe(true);
    expect(topo.edges.find((e) => e.source === "qemu/102")?.target).toBe(
      "bridge/pve2/vmbr9"
    );
  });

  it("includes storage entities", () => {
    expect(find(topo, "storage/pve1/local")?.type).toBe("storage");
  });

  it("derives cluster meta", () => {
    expect(topo.meta.clusterName).toBe("homelab");
    expect(topo.meta.quorate).toBe(true);
    expect(topo.meta.nodeCount).toBe(3);
  });

  it("is pure / deterministic", () => {
    expect(mapResourcesToTopology(sampleMapperInput())).toEqual(topo);
  });
});

describe("mapResourcesToTopology (standalone, no cluster row)", () => {
  it("defaults cluster meta and assumes quorum", () => {
    const t = mapResourcesToTopology({
      resources: [{ id: "node/pve", type: "node", node: "pve", status: "online" }],
    });
    expect(t.meta.nodeCount).toBe(1);
    expect(t.meta.clusterName).toBe("standalone");
    expect(t.meta.quorate).toBe(true);
  });
});
