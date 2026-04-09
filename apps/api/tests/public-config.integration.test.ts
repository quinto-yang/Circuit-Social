import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { createApiTestApp } from "./helpers/api-test-app";

describe("public config", () => {
  let context: Awaited<ReturnType<typeof createApiTestApp>>;

  beforeAll(async () => {
    context = await createApiTestApp();
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await context.reset();
  });

  it("returns public-config without auth", async () => {
    const response = await context.api.get("/api/public-config").expect(200);

    expect(response.body.ok).toBe(true);
    expect(typeof response.body.enableSolanaLogin).toBe("boolean");
    expect(typeof response.body.adsEnabled).toBe("boolean");
    expect(typeof response.body.appName).toBe("string");
  });
});
