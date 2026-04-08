import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
  bindWalletWithSiwe,
  createApiTestApp,
  createTestSession,
  testAccounts
} from "./helpers/api-test-app";

describe("content and profile integration", () => {
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

  it("publishes a moment and shows it in the feed", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const created = await fresh
      .post("/api/moments")
      .send({
        content: "Moment regression post",
        uploadIds: []
      })
      .expect(201);

    expect(created.body.moment.images).toHaveLength(0);

    const feed = await fresh.get("/api/moments").expect(200);
    expect(
      feed.body.moments.some((moment: { content: string }) => moment.content === "Moment regression post")
    ).toBe(true);
  });

  it("submits moment reports", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const moments = await fresh.get("/api/moments").expect(200);
    const target = moments.body.moments.find((moment: { mine: boolean }) => !moment.mine);

    const response = await fresh.post("/api/reports").send({
      kind: "moment",
      targetId: target.id,
      reason: "spam"
    });

    expect(response.status).toBe(201);
    expect(response.body.report.reason).toBe("spam");
  });

  it("updates nickname, bio, avatar, and primary wallet", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const bound = await bindWalletWithSiwe(fresh, testAccounts.beta);
    expect(bound.status).toBe(201);

    const secondaryWallet = bound.body.wallets.find(
      (wallet: { address: string }) => wallet.address === testAccounts.beta.address.toLowerCase()
    );
    expect(secondaryWallet).toBeTruthy();

    const updated = await fresh
      .post("/api/profile")
      .send({
        nickname: "Regression Pilot",
        bio: "Updated in integration tests",
        avatarUrl: "https://example.com/avatar.png",
        primaryWalletId: secondaryWallet.id
      })
      .expect(201);

    expect(updated.body.user.nickname).toBe("Regression Pilot");
    expect(updated.body.user.avatarUrl).toBe("https://example.com/avatar.png");
    expect(updated.body.user.primaryWalletAddress).toBe(
      testAccounts.beta.address.toLowerCase()
    );
  });
});
