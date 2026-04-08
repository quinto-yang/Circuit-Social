import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, expect, test as base, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

const apiURL = process.env.E2E_API_URL ?? "http://127.0.0.1:4100";
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

type WalletFixtures = {
  resetTestState: void;
  walletPage: Page;
};

async function getExtensionId(context: BrowserContext) {
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  return serviceWorker.url().split("/")[2];
}

async function clickIfVisible(page: Page, locator: Parameters<Page["getByTestId"]>[0]) {
  const target = page.getByTestId(locator);
  if (await target.isVisible().catch(() => false)) {
    await target.click();
  }
}

async function importMetaMaskWallet(
  extensionPage: Page,
  seedPhrase: string,
  password: string
) {
  await extensionPage.waitForLoadState("domcontentloaded");

  await clickIfVisible(extensionPage, "onboarding-get-started");
  await clickIfVisible(extensionPage, "onboarding-import-wallet");

  const noThanks = extensionPage.getByRole("button", { name: /No thanks/i });
  if (await noThanks.isVisible().catch(() => false)) {
    await noThanks.click();
  }

  const words = seedPhrase.trim().split(/\s+/);
  for (const [index, word] of words.entries()) {
    await extensionPage
      .getByTestId(`import-srp__srp-word-${index}`)
      .fill(word);
  }

  await extensionPage.getByTestId("create-password-new").fill(password);
  await extensionPage.getByTestId("create-password-confirm").fill(password);
  await extensionPage.getByTestId("create-password-terms").check();
  await extensionPage.getByTestId("create-password-import").click();

  await clickIfVisible(extensionPage, "onboarding-complete-done");
  await clickIfVisible(extensionPage, "pin-extension-next");
  await clickIfVisible(extensionPage, "pin-extension-done");
}

async function waitForMetaMaskPopup(context: BrowserContext, extensionId: string) {
  const existing = context
    .pages()
    .find((page) => page.url().includes(extensionId) && page.url().includes("notification"));
  if (existing) {
    return existing;
  }
  return context.waitForEvent("page", {
    predicate: (page) =>
      page.url().includes(extensionId) && page.url().includes("notification")
  });
}

async function connectAndSignWithMetaMask(dappPage: Page, context: BrowserContext, extensionId: string) {
  const connectTrigger =
    dappPage.getByRole("button", { name: /MetaMask/i }).first().or(
      dappPage.getByRole("button", { name: /Injected/i }).first()
    );
  if (await connectTrigger.isVisible().catch(() => false)) {
    await connectTrigger.click();
  } else {
    await dappPage
      .getByRole("button", { name: /连接钱包并签名/i })
      .scrollIntoViewIfNeeded();
  }

  const connectPopup = await waitForMetaMaskPopup(context, extensionId);
  await connectPopup.waitForLoadState("domcontentloaded");
  await clickIfVisible(connectPopup, "page-container-footer-next");
  await clickIfVisible(connectPopup, "page-container-footer-next");

  await dappPage.getByRole("button", { name: /连接钱包并签名/i }).click();

  const signPopup = await waitForMetaMaskPopup(context, extensionId);
  await signPopup.waitForLoadState("domcontentloaded");
  await clickIfVisible(signPopup, "page-container-footer-next");
  await clickIfVisible(signPopup, "page-container-footer-sign");
}

export const test = base.extend<WalletFixtures>({
  resetTestState: [
    async ({ request }, use) => {
      const response = await request.post(`${apiURL}/api/test/reset`, {
        data: {}
      });
      expect(response.ok()).toBeTruthy();
      await use();
    },
    { auto: true }
  ],
  walletPage: async ({}, use, testInfo) => {
    const extensionPath = process.env.E2E_METAMASK_EXTENSION_PATH;
    const seedPhrase = process.env.E2E_METAMASK_SEED_PHRASE;
    const password = process.env.E2E_METAMASK_PASSWORD;

    if (!extensionPath || !seedPhrase || !password) {
      throw new Error(
        "Missing E2E_METAMASK_EXTENSION_PATH, E2E_METAMASK_SEED_PHRASE, or E2E_METAMASK_PASSWORD"
      );
    }

    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "cx-wallet-"));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    await context.tracing.start({
      screenshots: true,
      snapshots: true
    });

    const extensionId = await getExtensionId(context);
    const extensionPage = await context.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/home.html#onboarding/welcome`);
    await importMetaMaskWallet(extensionPage, seedPhrase, password);

    const dappPage = await context.newPage();
    const logs: string[] = [];
    dappPage.on("console", (message) => {
      logs.push(`[${message.type()}] ${message.text()}`);
    });

    await dappPage.goto(baseURL);
    await connectAndSignWithMetaMask(dappPage, context, extensionId);
    await expect(dappPage.getByRole("button", { name: /Circuit Concierge/ })).toBeVisible();

    try {
      await use(dappPage);
    } finally {
      if (testInfo.status !== testInfo.expectedStatus) {
        const screenshotPath = testInfo.outputPath("wallet-failure.png");
        await dappPage.screenshot({
          path: screenshotPath,
          fullPage: true
        });
        await testInfo.attach("wallet-console", {
          body: logs.join("\n"),
          contentType: "text/plain"
        });
        await context.tracing.stop({
          path: testInfo.outputPath("wallet-trace.zip")
        });
      } else {
        await context.tracing.stop();
      }
      await context.close();
      await fs.rm(userDataDir, {
        recursive: true,
        force: true
      });
    }
  }
});

export { expect };
