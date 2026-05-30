/**
 * Pure parsing of Proxmox guest NIC config (`netN` lines).
 *
 * A qemu config looks like:  net0: virtio=BC:24:11:AA:BB,bridge=vmbr0,tag=20,firewall=1
 * An lxc config looks like:  net0: name=eth0,bridge=vmbr0,ip=dhcp,tag=20,hwaddr=BC:24:..
 *
 * We only need the bridge it attaches to and the VLAN tag (if any) to draw the
 * network edges, but we capture the MAC/model too for the inspector.
 */

import type { NetInterface } from "./types";

const NET_KEY_RE = /^net\d+$/;
/** Models that appear as the bare `model=MAC` token in qemu configs. */
const QEMU_MODELS = new Set([
  "virtio",
  "e1000",
  "e1000e",
  "rtl8139",
  "vmxnet3",
  "ne2k_pci",
  "i82551",
  "i82557b",
  "i82559er",
  "pcnet",
]);

const MAC_RE = /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i;

/** Parse a single `netN` value string into a structured NIC. */
export function parseNetLine(name: string, value: string): NetInterface {
  const nic: NetInterface = { name };

  for (const rawPart of value.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const eq = part.indexOf("=");
    const key = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
    const val = eq === -1 ? "" : part.slice(eq + 1).trim();

    if (key === "bridge") {
      nic.bridge = val || undefined;
    } else if (key === "tag") {
      const tag = Number(val);
      if (Number.isFinite(tag)) nic.vlanTag = tag;
    } else if (key === "hwaddr" || key === "macaddr") {
      if (val) nic.hwaddr = val.toUpperCase();
    } else if (key === "name") {
      // lxc: guest-side interface name (eth0)
      if (val && !nic.model) nic.model = val;
    } else if (QEMU_MODELS.has(key)) {
      // qemu: `virtio=AA:BB:..` — key is the model, value is the MAC
      nic.model = key;
      if (MAC_RE.test(val)) nic.hwaddr = val.toUpperCase();
    }
  }

  return nic;
}

/**
 * Extract every NIC from a guest config object (the `data` of a
 * `.../config` response). Keys that aren't `netN` are ignored.
 */
export function parseNetInterfaces(
  config: Record<string, unknown> | null | undefined
): NetInterface[] {
  if (!config) return [];
  const nics: NetInterface[] = [];
  for (const [key, value] of Object.entries(config)) {
    if (!NET_KEY_RE.test(key)) continue;
    if (typeof value !== "string") continue;
    nics.push(parseNetLine(key, value));
  }
  // Stable order by NIC index (net0, net1, ...).
  nics.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return nics;
}
