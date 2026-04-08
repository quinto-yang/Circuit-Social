import { test, expect } from "../fixtures";

test("keeps the login CTA inside the first mobile viewport without page scroll", async ({
  unauthenticatedPage: page
}) => {
  const button = page.getByTestId("login-primary-button");
  await expect(button).toBeVisible();

  const metrics = await page.evaluate(() => {
    const root = document.scrollingElement;
    return {
      scrollHeight: root?.scrollHeight ?? 0,
      clientHeight: root?.clientHeight ?? 0,
      viewportHeight: window.innerHeight
    };
  });

  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  expect(metrics.scrollHeight - metrics.clientHeight).toBeGreaterThanOrEqual(0);
});

test("keeps the brand header and wallet options visible on small mobile screens", async ({
  unauthenticatedPage: page
}) => {
  const brandBlock = page.getByTestId("login-brand-block");
  const walletOptions = page.locator('[data-testid^="wallet-option-"]');
  const primaryButton = page.getByTestId("login-primary-button");

  await expect(brandBlock).toBeVisible();
  await expect(walletOptions.first()).toBeVisible();
  await expect(primaryButton).toBeVisible();

  const optionCount = await walletOptions.count();
  expect(optionCount).toBeGreaterThan(0);
  await walletOptions.nth(optionCount - 1).click();
  await expect(primaryButton).toBeVisible();

  const viewportHeight = page.viewportSize()?.height ?? 667;
  const brandBox = await brandBlock.boundingBox();
  const buttonBox = await primaryButton.boundingBox();

  expect(brandBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(brandBox!.height).toBeGreaterThan(20);
  expect(buttonBox!.y + buttonBox!.height).toBeGreaterThan(0);
  expect(buttonBox!.y).toBeLessThanOrEqual(viewportHeight + 200);
});
