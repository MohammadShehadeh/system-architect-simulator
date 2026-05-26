import { expect, test } from "@playwright/test";

test.describe("System Architect Studio", () => {
  test("loads the studio and renders the starter template", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/MSH Infra/i);

    const canvas = page.locator(".react-flow");
    await expect(canvas).toBeVisible();

    await expect(page.locator(".react-flow__node").first()).toBeVisible({
      timeout: 10_000,
    });

    const nodeCount = await page.locator(".react-flow__node").count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test("opens the templates dialog", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".react-flow__node").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: /templates/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
