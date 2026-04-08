import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, createTestSession } from "./helpers/api-test-app";

describe("tenant integration", () => {
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

  it("creates tenant app and appends domain whitelist", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const created = await agent.post("/api/tenant/apps").send({
      name: "Demo DApp",
      chainPolicy: ["evm", "solana"],
      callbackUrl: "https://demo.example.com/callback"
    });
    expect(created.status).toBe(201);
    expect(created.body.app).toMatchObject({
      name: "Demo DApp",
      chainPolicy: ["evm", "solana"],
      callbackUrl: "https://demo.example.com/callback"
    });

    const appId = created.body.app.id as number;
    const domainAdded = await agent.post(`/api/tenant/apps/${appId}/domains`).send({
      domain: "demo.example.com"
    });
    expect(domainAdded.status).toBe(201);
    expect(domainAdded.body.domains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "demo.example.com"
        })
      ])
    );
  });

  it("rejects duplicate domains", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const created = await agent.post("/api/tenant/apps").send({
      name: "Demo DApp"
    });
    const appId = created.body.app.id as number;
    await agent.post(`/api/tenant/apps/${appId}/domains`).send({
      domain: "demo.example.com"
    });

    const duplicate = await agent.post(`/api/tenant/apps/${appId}/domains`).send({
      domain: "demo.example.com"
    });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body).toMatchObject({
      ok: false,
      error: "域名已存在"
    });
  });

  it("lists tenant apps for current user with domains", async () => {
    const owner = context.createAgent();
    const other = context.createAgent();
    await createTestSession(owner, "fresh-user");
    await createTestSession(other, "guide");

    const created = await owner.post("/api/tenant/apps").send({
      name: "Owner App"
    });
    const appId = created.body.app.id as number;
    await owner.post(`/api/tenant/apps/${appId}/domains`).send({
      domain: "owner.example.com"
    });
    await other.post("/api/tenant/apps").send({
      name: "Other App"
    });

    const listed = await owner.get("/api/tenant/apps").expect(200);
    expect(listed.body.apps).toHaveLength(1);
    expect(listed.body.apps[0]).toMatchObject({
      name: "Owner App",
      domains: [{ domain: "owner.example.com" }]
    });
  });

  it("updates tenant app config", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const created = await agent.post("/api/tenant/apps").send({
      name: "Config App"
    });
    const appId = created.body.app.id as number;

    const updated = await agent.post(`/api/tenant/apps/${appId}`).send({
      name: "Config App Pro",
      chainPolicy: ["evm", "solana"],
      callbackUrl: "https://config.example.com/callback"
    });
    expect(updated.status).toBe(201);
    expect(updated.body.app).toMatchObject({
      id: appId,
      name: "Config App Pro",
      chainPolicy: ["evm", "solana"],
      callbackUrl: "https://config.example.com/callback"
    });
  });

  it("updates tenant branding and rotates tenant keys", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");
    const created = await agent.post("/api/tenant/apps").send({ name: "Brand App" });
    const appId = created.body.app.id as number;

    const branding = await agent.post(`/api/tenant/apps/${appId}/branding`).send({
      displayName: "Circuit Enterprise",
      themeColor: "#22c55e",
      logoUrl: "https://example.com/logo.png"
    });
    expect(branding.status).toBe(201);
    expect(branding.body.branding).toMatchObject({
      displayName: "Circuit Enterprise",
      themeColor: "#22c55e",
      logoUrl: "https://example.com/logo.png"
    });

    const beforeKeys = await agent.get("/api/tenant/apps").expect(200);
    const activeBefore = beforeKeys.body.apps[0].keys.filter((item: { status: string }) => item.status === "active");
    expect(activeBefore).toHaveLength(1);

    const rotatedTooSoon = await agent.post(`/api/tenant/apps/${appId}/keys/rotate`).send({});
    expect(rotatedTooSoon.status).toBe(400);
    expect(rotatedTooSoon.body).toMatchObject({
      ok: false,
      error: "密钥轮换过于频繁，请稍后再试"
    });
  });

  it("rejects callback host not in domain whitelist", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");
    const created = await agent.post("/api/tenant/apps").send({ name: "Domain App" });
    const appId = created.body.app.id as number;
    await agent.post(`/api/tenant/apps/${appId}/domains`).send({ domain: "app.example.com" });

    const updated = await agent.post(`/api/tenant/apps/${appId}`).send({
      callbackUrl: "https://evil.example.com/callback"
    });
    expect(updated.status).toBe(400);
    expect(updated.body).toMatchObject({
      ok: false,
      error: "回调地址域名不在白名单中"
    });
  });
});

