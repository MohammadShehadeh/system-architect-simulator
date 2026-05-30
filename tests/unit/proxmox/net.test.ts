import { describe, expect, it } from "vitest";

import { parseNetInterfaces, parseNetLine } from "@/lib/proxmox/net";

describe("parseNetLine", () => {
  it("parses a qemu NIC (model=MAC, bridge, tag)", () => {
    expect(
      parseNetLine("net0", "virtio=BC:24:11:AA:BB:CC,bridge=vmbr0,tag=20,firewall=1")
    ).toEqual({
      name: "net0",
      model: "virtio",
      hwaddr: "BC:24:11:AA:BB:CC",
      bridge: "vmbr0",
      vlanTag: 20,
    });
  });

  it("parses an lxc NIC (name, hwaddr, bridge, tag)", () => {
    expect(
      parseNetLine("net1", "name=eth0,bridge=vmbr1,ip=dhcp,tag=30,hwaddr=aa:bb:cc:dd:ee:ff")
    ).toEqual({
      name: "net1",
      model: "eth0",
      bridge: "vmbr1",
      vlanTag: 30,
      hwaddr: "AA:BB:CC:DD:EE:FF",
    });
  });

  it("handles a NIC with no bridge", () => {
    const nic = parseNetLine("net0", "virtio=AA:BB:CC:DD:EE:FF");
    expect(nic.bridge).toBeUndefined();
    expect(nic.vlanTag).toBeUndefined();
    expect(nic.hwaddr).toBe("AA:BB:CC:DD:EE:FF");
  });
});

describe("parseNetInterfaces", () => {
  it("extracts only netN keys, numerically sorted", () => {
    const nics = parseNetInterfaces({
      net1: "virtio=A,bridge=vmbr1",
      net0: "virtio=B,bridge=vmbr0",
      name: "ignored",
      cores: "2",
      scsi0: "local:vm-100-disk-0",
    });
    expect(nics.map((n) => n.name)).toEqual(["net0", "net1"]);
    expect(nics.map((n) => n.bridge)).toEqual(["vmbr0", "vmbr1"]);
  });

  it("returns an empty array for missing config", () => {
    expect(parseNetInterfaces(null)).toEqual([]);
    expect(parseNetInterfaces(undefined)).toEqual([]);
  });
});
