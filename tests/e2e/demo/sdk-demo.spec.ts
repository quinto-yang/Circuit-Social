import { expect, test } from "@playwright/test";

test("sdk demo supports init, bootstrap login and logout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("demo-root")).toBeVisible();
  await expect(page.getByTestId("demo-session-json")).toContainText("null");

  await page.getByTestId("demo-bootstrap").click();
  await expect(page.getByTestId("demo-session-json")).toContainText('"nickname"');

  await page.getByTestId("demo-refresh").click();
  await expect(page.getByTestId("demo-session-json")).toContainText('"wallets"');

  await page.getByTestId("demo-logout").click();
  await expect(page.getByTestId("demo-session-json")).toContainText("null");
});
