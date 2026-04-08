import { test, expect } from "./fixtures";

const hasWalletEnv = Boolean(
  process.env.E2E_METAMASK_EXTENSION_PATH &&
    process.env.E2E_METAMASK_SEED_PHRASE &&
    process.env.E2E_METAMASK_PASSWORD
);

test.describe("MetaMask wallet login", () => {
  test.skip(!hasWalletEnv, "Set MetaMask extension path, seed phrase, and password to run wallet automation.");

  test("logs in through MetaMask, reaches seeded conversations, sends a message, and logs out", async ({
    walletPage: page
  }) => {
    const content = `wallet-${Date.now()}`;

    await expect(page.getByRole("button", { name: /Circuit Concierge/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Circuit Lounge/ })).toBeVisible();

    await page.getByRole("button", { name: /Circuit Concierge/ }).click();
    await page.getByPlaceholder("发送消息").fill(content);
    await page.getByRole("button", { name: "发送消息" }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(1);

    await page.reload();
    await page.getByRole("button", { name: /Circuit Concierge/ }).click();
    await expect(page.getByText(content, { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: "返回" }).click();
    await page.getByRole("button", { name: "我的" }).click();
    await page.getByRole("button", { name: "退出登录" }).click();

    await expect(page.getByRole("button", { name: /连接钱包并签名/i })).toBeVisible();
  });
});
