import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import { createApiTestApp } from "./helpers/api-test-app";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "test-admin-token-for-ci";

describe("admin site settings", () => {
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

  it("rejects admin without token", async () => {
    const response = await context.api.get("/api/admin/site-settings").expect(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.errorCode).toBe("ADMIN_UNAUTHORIZED");
  });

  it("updates site settings and public-config reflects", async () => {
    const write = await context.api
      .post("/api/admin/site-settings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ enableSolanaLogin: true, adsEnabled: true, appName: "Test App" })
      .expect(201);
    expect(typeof write.body.meta?.updatedAt).toBe("string");

    const settings = await context.api
      .get("/api/admin/site-settings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);
    expect(settings.body.meta?.updatedAt).toBe(write.body.meta?.updatedAt);

    const pub = await context.api.get("/api/public-config").expect(200);
    expect(pub.body.enableSolanaLogin).toBe(true);
    expect(pub.body.adsEnabled).toBe(true);
    expect(pub.body.appName).toBe("Test App");
  });

  it("returns overview counts with valid token", async () => {
    const response = await context.api
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.users).toBeGreaterThanOrEqual(0);
    expect(response.body.messages).toBeGreaterThanOrEqual(0);
    expect(typeof response.body.activeSessions).toBe("number");
  });

  it("rejects overview without token", async () => {
    const response = await context.api.get("/api/admin/overview").expect(401);
    expect(response.body.errorCode).toBe("ADMIN_UNAUTHORIZED");
  });

  it("returns audit log list with valid token", async () => {
    const response = await context.api
      .get("/api/admin/audit-logs?limit=5&offset=0&action=wallet&targetType=user")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200);
    expect(response.body.ok).toBe(true);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(typeof response.body.total).toBe("number");
    expect(response.body.limit).toBe(5);
    expect(response.body.offset).toBe(0);
  });

  it("rotates admin token and rejects old token afterwards", async () => {
    const next = "new-admin-token-456";
    await context.api
      .post("/api/admin/token")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ token: next })
      .expect(201);

    await context.api
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(401);

    const ok = await context.api
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${next}`)
      .expect(200);
    expect(ok.body.ok).toBe(true);

    await context.api
      .post("/api/admin/token")
      .set("Authorization", `Bearer ${next}`)
      .send({ token: ADMIN_TOKEN })
      .expect(201);
  });

  it("turns off hot board master when all subsections are disabled", async () => {
    const write = await context.api
      .post("/api/admin/site-settings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        discover: {
          hot: {
            enabled: true,
            moments: { enabled: false },
            groups: { enabled: false },
            recommendedUsers: { enabled: false }
          }
        }
      })
      .expect(201);

    expect(write.body.discover.hot.enabled).toBe(false);
    expect(write.body.discover.hot.moments.enabled).toBe(false);
    expect(write.body.discover.hot.groups.enabled).toBe(false);
    expect(write.body.discover.hot.recommendedUsers.enabled).toBe(false);

    const pub = await context.api.get("/api/public-config").expect(200);
    expect(pub.body.discover.hot.enabled).toBe(false);
  });
});
