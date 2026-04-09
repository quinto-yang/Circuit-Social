import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import bs58 from "bs58";
import nacl from "tweetnacl";

import {
  buildSiweMessage,
  createApiTestApp,
  loginWithSiwe,
  testAccounts
} from "./helpers/api-test-app";

describe("auth integration", () => {
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

  it("creates nonce for a supported chain and wallet", async () => {
    const response = await context.api.post("/api/auth/nonce").send({
      address: testAccounts.alpha.address,
      chainId: 8453
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(response.body.issuedAt).toBeTruthy();
    expect(response.body.expiresAt).toBeTruthy();
  });

  it("rejects malformed wallet addresses", async () => {
    const response = await context.api.post("/api/auth/nonce").send({
      address: "0x1234",
      chainId: 8453
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      error: "钱包地址无效",
      errorCode: "WALLET_ADDRESS_INVALID"
    });
  });

  it("rejects unsupported chains", async () => {
    const response = await context.api.post("/api/auth/nonce").send({
      address: testAccounts.alpha.address,
      chainId: 10
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      error: "暂不支持该链",
      errorCode: "CHAIN_NOT_SUPPORTED"
    });
  });

  it("verifies a valid Solana payload and creates session", async () => {
    const keypair = nacl.sign.keyPair();
    const address = bs58.encode(keypair.publicKey);
    const nonceResponse = await context.api.post("/api/auth/nonce").send({
      address,
      chainId: 101,
      chainType: "solana",
      intent: "login"
    });
    const message = JSON.stringify({
      address,
      chainId: 101,
      nonce: nonceResponse.body.nonce,
      issuedAt: nonceResponse.body.issuedAt
    });
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey));
    const response = await context.api.post("/api/auth/verify").send({
      message,
      signature,
      chainType: "solana"
    });
    expect(response.status).toBe(201);
    expect(response.body.user.nickname).toBe(address.slice(-6));
    expect(response.body.wallets[0].chainLabel).toBe("Solana Mainnet");
  });

  it("creates nonce for solana chain type with valid base58 address", async () => {
    const response = await context.api.post("/api/auth/nonce").send({
      address: "7oHfG9zMUKxjF6QxC7u2Yjzv3oR4J2bB9mL1QwEaPdTs",
      chainId: 101,
      chainType: "solana"
    });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.nonce).toMatch(/^[a-f0-9]{32}$/);
  });

  it("rejects malformed solana addresses", async () => {
    const response = await context.api.post("/api/auth/nonce").send({
      address: "not-a-solana-address",
      chainId: 101,
      chainType: "solana"
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      error: "钱包地址无效",
      errorCode: "WALLET_ADDRESS_INVALID"
    });
  });

  it("binds a solana wallet for existing user", async () => {
    const agent = context.createAgent();
    await loginWithSiwe(agent, testAccounts.alpha);
    const keypair = nacl.sign.keyPair();
    const address = bs58.encode(keypair.publicKey);
    const nonceResponse = await agent.post("/api/auth/nonce").send({
      address,
      chainId: 103,
      chainType: "solana",
      intent: "bind"
    });
    const message = JSON.stringify({
      address,
      chainId: 103,
      nonce: nonceResponse.body.nonce,
      issuedAt: nonceResponse.body.issuedAt
    });
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey));
    const response = await agent.post("/api/wallets/bind").send({
      message,
      signature,
      chainType: "solana"
    });
    expect(response.status).toBe(201);
    expect(response.body.wallet.chainLabel).toBe("Solana Devnet");
  });

  it("verifies a valid SIWE payload and hydrates session", async () => {
    const agent = context.createAgent();
    const { verifyResponse } = await loginWithSiwe(agent, testAccounts.alpha);

    expect(verifyResponse.status).toBe(201);
    expect(verifyResponse.headers["set-cookie"]?.join(";")).toContain("cx_sid=");
    const expectedNick = testAccounts.alpha.address.toLowerCase().replace(/^0x/, "").slice(-6);
    expect(verifyResponse.body.user.nickname).toBe(expectedNick);
    expect(verifyResponse.body.wallets).toHaveLength(1);

    const me = await agent.get("/api/me").expect(200);
    expect(me.body.user.primaryWalletAddress).toBe(testAccounts.alpha.address.toLowerCase());
  });

  it("rejects nonce replay", async () => {
    const agent = context.createAgent();
    const { message, signature, verifyResponse } = await loginWithSiwe(agent, testAccounts.alpha);

    expect(verifyResponse.status).toBe(201);

    const replay = await agent.post("/api/auth/verify").send({
      message,
      signature,
      domain: "127.0.0.1:3000"
    });

    expect(replay.status).toBe(401);
    expect(replay.body).toMatchObject({
      ok: false,
      error: "Nonce 无效或已过期",
      errorCode: "NONCE_INVALID_OR_EXPIRED"
    });
  });

  it("rejects invalid signatures", async () => {
    const agent = context.createAgent();
    const nonceResponse = await agent.post("/api/auth/nonce").send({
      address: testAccounts.alpha.address,
      chainId: 8453,
      intent: "login"
    });

    expect(nonceResponse.status).toBe(201);

    const message = buildSiweMessage({
      address: testAccounts.alpha.address,
      chainId: 8453,
      nonce: nonceResponse.body.nonce,
      issuedAt: nonceResponse.body.issuedAt
    });

    const signature = await testAccounts.beta.signMessage({ message });
    const response = await agent.post("/api/auth/verify").send({
      message,
      signature,
      domain: "127.0.0.1:3000"
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      ok: false,
      error: "SIWE 验证失败",
      errorCode: "SIWE_VERIFY_FAILED"
    });
  });

  it("rejects mismatched domains", async () => {
    const agent = context.createAgent();
    const { verifyResponse } = await loginWithSiwe(agent, testAccounts.alpha, {
      verifyDomain: "malicious.local"
    });

    expect(verifyResponse.status).toBe(401);
    expect(verifyResponse.body).toMatchObject({
      ok: false,
      error: "SIWE 验证失败",
      errorCode: "SIWE_VERIFY_FAILED"
    });
  });

  it("rejects mismatched chain ids", async () => {
    const agent = context.createAgent();
    const { verifyResponse } = await loginWithSiwe(agent, testAccounts.alpha, {
      nonceChainId: 8453,
      messageChainId: 1
    });

    expect(verifyResponse.status).toBe(401);
    expect(verifyResponse.body).toMatchObject({
      ok: false,
      error: "链 ID 不匹配",
      errorCode: "SIGNER_CHAIN_ID_MISMATCH"
    });
  });

  it("clears the session on logout", async () => {
    const agent = context.createAgent();
    const { verifyResponse } = await loginWithSiwe(agent, testAccounts.alpha);
    const sessionCookie = verifyResponse.headers["set-cookie"]?.[0]?.split(";")[0];

    expect(sessionCookie).toBeTruthy();

    const logout = await context.api.post("/api/auth/logout").set("Cookie", sessionCookie!).send({});
    expect(logout.status).toBe(201);
    expect(logout.body).toMatchObject({ ok: true });

    const me = await context.api.get("/api/me").set("Cookie", sessionCookie!).expect(200);
    expect(me.body).toMatchObject({
      ok: true,
      user: null
    });
  });
});
