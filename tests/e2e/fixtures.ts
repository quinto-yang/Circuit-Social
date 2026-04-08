import { expect, test as base, type Page, type TestInfo } from "@playwright/test";

const apiURL = process.env.E2E_API_URL ?? "http://127.0.0.1:4100";

type SmokeFixtures = {
  resetTestState: void;
  authenticatedPage: Page;
  unauthenticatedPage: Page;
};

async function attachConsoleLogs(logs: string[], testInfo: TestInfo) {
  if (testInfo.status === testInfo.expectedStatus || logs.length === 0) {
    return;
  }
  await testInfo.attach("browser-console", {
    body: logs.join("\n"),
    contentType: "text/plain"
  });
}

export const test = base.extend<SmokeFixtures>({
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
  authenticatedPage: async ({ page }, use, testInfo) => {
    const logs: string[] = [];

    page.on("console", (message) => {
      logs.push(`[${message.type()}] ${message.text()}`);
    });

    const session = await page.request.post(`${apiURL}/api/test/session`, {
      data: {
        preset: "fresh-user"
      }
    });
    expect(session.ok()).toBeTruthy();

    await page.goto("/");
    await expect(
      page.getByRole("button", {
        name: /Circuit Concierge/
      })
    ).toBeVisible();

    await use(page);
    await attachConsoleLogs(logs, testInfo);
  },
  unauthenticatedPage: async ({ page }, use, testInfo) => {
    const logs: string[] = [];

    page.on("console", (message) => {
      logs.push(`[${message.type()}] ${message.text()}`);
    });

    await page.goto("/");
    await expect(page.getByText("链上身份 · 安全会话")).toBeVisible();

    await use(page);
    await attachConsoleLogs(logs, testInfo);
  }
});

export { expect };
