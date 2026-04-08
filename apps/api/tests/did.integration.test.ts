import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp } from "./helpers/api-test-app";

describe("did integration", () => {
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

  it("resolves did:ethr and serves cached result", async () => {
    const uri = "did:ethr:sepolia:0x1111111111111111111111111111111111111111";

    const first = await context.api.get("/api/did/resolve").query({ uri }).expect(200);
    expect(first.body).toMatchObject({
      ok: true,
      uri,
      method: "did:ethr",
      network: "sepolia",
      identifier: "0x1111111111111111111111111111111111111111",
      resolved: true,
      cacheHit: false
    });
    expect(first.body.didDocument?.id).toBe(uri);

    const second = await context.api.get("/api/did/resolve").query({ uri }).expect(200);
    expect(second.body).toMatchObject({
      ok: true,
      uri,
      cacheHit: true
    });
  });

  it("accepts did:ethr without explicit network", async () => {
    const uri = "did:ethr:0x2222222222222222222222222222222222222222";
    const response = await context.api.get("/api/did/resolve").query({ uri }).expect(200);
    expect(response.body).toMatchObject({
      ok: true,
      uri,
      network: "mainnet",
      resolved: true
    });
  });

  it("rejects invalid did uri", async () => {
    const response = await context.api
      .get("/api/did/resolve")
      .query({ uri: "did:key:z6Mkh..." })
      .expect(400);
    expect(response.body).toMatchObject({
      ok: false,
      errorCode: "DID_URI_INVALID"
    });
  });
});

