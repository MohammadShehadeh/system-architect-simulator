import { expect, test, type Page } from "@playwright/test";

/**
 * A small, browser-safe topology snapshot in the exact shape the
 * `/api/proxmox/topology` route returns. Intercepting the route lets these
 * tests run without a real Proxmox cluster or any server env vars.
 */
const TOPOLOGY = {
  entities: [
    {
      id: "host/pve1",
      type: "host",
      label: "pve1",
      status: "online",
      node: "pve1",
      metrics: {
        cpu: 0.2,
        maxcpu: 8,
        memBytes: 8_000_000_000,
        maxMemBytes: 32_000_000_000,
        uptimeSec: 100000,
      },
      meta: { ip: "10.0.0.1" },
    },
    {
      id: "qemu/100",
      type: "vm",
      parentId: "host/pve1",
      label: "web",
      status: "running",
      node: "pve1",
      vmid: 100,
      tags: ["prod"],
      metrics: { cpu: 0.1, maxcpu: 2, memBytes: 1_000_000_000, maxMemBytes: 2_000_000_000 },
      meta: { kind: "qemu" },
    },
    {
      id: "qemu/101",
      type: "vm",
      parentId: "host/pve1",
      label: "db",
      status: "running",
      node: "pve1",
      vmid: 101,
      metrics: { cpu: 0.3, maxcpu: 4, memBytes: 6_000_000_000, maxMemBytes: 8_000_000_000 },
      meta: { kind: "qemu" },
    },
    {
      id: "bridge/pve1/vmbr0",
      type: "bridge",
      parentId: "host/pve1",
      label: "vmbr0",
      status: "online",
      node: "pve1",
      meta: { cidr: "10.0.0.1/24" },
    },
  ],
  edges: [
    { id: "net/qemu/100/net0", source: "qemu/100", target: "bridge/pve1/vmbr0", kind: "network" },
    {
      id: "net/qemu/101/net0",
      source: "qemu/101",
      target: "bridge/pve1/vmbr0",
      kind: "network",
      label: "VLAN 20",
    },
  ],
  meta: {
    clusterName: "homelab",
    quorate: true,
    nodeCount: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
  },
};

async function stubTopology(page: Page, body: unknown, status = 200) {
  await page.route("**/api/proxmox/topology", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    })
  );
}

test.describe("Proxmox topology viewer", () => {
  test("renders the cluster, edges, and inspector", async ({ page }) => {
    await stubTopology(page, TOPOLOGY);
    await page.goto("/proxmox");

    await expect(page).toHaveTitle(/Proxmox Topology/i);

    // Host group + guests render and nest.
    await expect(page.locator('[data-entity-id="host/pve1"]')).toBeVisible({
      timeout: 10_000,
    });
    const web = page.locator('[data-entity-id="qemu/100"]');
    await expect(web).toContainText("web");
    await expect(web).toContainText("#100");

    // Connection summary reflects the cluster meta.
    await expect(page.getByTestId("proxmox-banner-ok")).toContainText("homelab");

    // The VLAN-tagged network edge is labelled.
    await expect(page.getByText("VLAN 20")).toBeVisible();

    // Selecting a guest opens the inspector with its details.
    await page.locator('[data-entity-id="qemu/101"]').click();
    const detail = page.getByTestId("proxmox-detail");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("VMID");
    await expect(detail).toContainText("101");
  });

  test("changing the refresh interval updates the control", async ({ page }) => {
    await stubTopology(page, TOPOLOGY);
    await page.goto("/proxmox");
    await expect(page.locator('[data-entity-id="host/pve1"]')).toBeVisible({
      timeout: 10_000,
    });

    const interval = page.getByLabel("Refresh interval");
    await interval.click();
    await page.getByRole("option", { name: "Off" }).click();
    await expect(interval).toContainText("Off");
  });

  test("surfaces an auth error in the connection banner", async ({ page }) => {
    await stubTopology(
      page,
      { error: { kind: "auth", message: "Proxmox responded with 401." } },
      401
    );
    await page.goto("/proxmox");

    const banner = page.getByTestId("proxmox-banner-error");
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/auth/i);
  });
});
