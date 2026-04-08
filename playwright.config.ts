import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const envFiles = [".env.e2e.local", ".env.e2e"];
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({
      path: envPath,
      override: false
    });
  }
}

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const apiURL = process.env.E2E_API_URL ?? "http://127.0.0.1:4100";
const demoURL = process.env.E2E_DEMO_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\/.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"]
      }
    },
    {
      name: "mobile-smoke",
      testMatch: /(smoke|mobile)\/.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        viewport: {
          width: 375,
          height: 667
        },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        userAgent: devices["iPhone 12"].userAgent
      }
    },
    {
      name: "wallet-metamask",
      testMatch: /wallet\/.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        headless: false
      }
    },
    {
      name: "demo-smoke",
      testMatch: /demo\/.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: demoURL
      }
    }
  ],
  webServer: [
    {
      command:
        "cross-env NODE_ENV=test PORT=4100 WEB_ORIGIN=http://127.0.0.1:3100,http://127.0.0.1:5173 npm run start --workspace @cx/api",
      url: `${apiURL}/api/me`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "npm run start:test --workspace @cx/web",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: "npm run dev --workspace @cx/integration-demo",
      url: demoURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
