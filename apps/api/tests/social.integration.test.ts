import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
  createApiTestApp,
  createTestSession
} from "./helpers/api-test-app";

describe("social integration", () => {
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

  it("bootstraps a fresh user with concierge friendship and seeded conversations", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const friends = await agent.get("/api/friends").expect(200);
    const conversations = await agent.get("/api/conversations").expect(200);

    expect(friends.body.friends.map((friend: { nickname: string }) => friend.nickname)).toContain(
      "Circuit Concierge"
    );
    expect(
      conversations.body.conversations.map((conversation: { title: string }) => conversation.title)
    ).toEqual(expect.arrayContaining(["Circuit Concierge", "Circuit Lounge"]));
  });

  it("supports friend requests by user id and reuses the direct conversation after acceptance", async () => {
    const fresh = context.createAgent();
    const guide = context.createAgent();
    await createTestSession(fresh, "fresh-user");
    await createTestSession(guide, "guide");

    const requestResponse = await fresh.post("/api/friend-requests").send({
      target: "2"
    });

    expect(requestResponse.status).toBe(201);

    const guideRequests = await guide.get("/api/friend-requests").expect(200);
    const pending = guideRequests.body.incoming[0];
    expect(pending.from.nickname).toMatch(/^Builder /);

    await guide
      .post(`/api/friend-requests/${pending.id}/respond`)
      .send({ action: "accept" })
      .expect(201);

    const dmFirst = await fresh.post("/api/conversations/dm").send({ peerId: 2 }).expect(201);
    const dmSecond = await fresh.post("/api/conversations/dm").send({ peerId: 2 }).expect(201);

    expect(dmFirst.body.conversation.id).toBe(dmSecond.body.conversation.id);
  });

  it("supports friend requests by wallet address and rejects duplicate pending requests", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const first = await fresh.post("/api/friend-requests").send({
      target: "0x000000000000000000000000000000000000beef"
    });
    expect(first.status).toBe(201);

    const duplicate = await fresh.post("/api/friend-requests").send({
      target: "0x000000000000000000000000000000000000beef"
    });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body).toMatchObject({
      ok: false,
      error: "好友申请已存在"
    });
  });

  it("creates groups with invite codes and accepts the seeded invite code", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const created = await fresh.post("/api/groups").send({
      name: "Regression Group"
    });
    expect(created.status).toBe(201);
    expect(created.body.conversation.inviteCode).toMatch(/^[A-Z2-9]{8}$/);

    const joined = await fresh.post("/api/groups/join").send({
      inviteCode: "C8X6J2QH"
    });
    expect(joined.status).toBe(201);
    expect(joined.body.conversation.inviteCode).toBe("C8X6J2QH");

    const invalid = await fresh.post("/api/groups/join").send({
      inviteCode: "INVALID"
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      ok: false,
      error: "群邀请码无效"
    });
  });

  it("updates profile did uri and returns it in session user payload", async () => {
    const fresh = context.createAgent();
    await createTestSession(fresh, "fresh-user");

    const didUri = "did:ethr:sepolia:0x1111111111111111111111111111111111111111";
    const updated = await fresh.post("/api/profile").send({
      didUri
    });
    expect(updated.status).toBe(201);
    expect(updated.body.user.didUri).toBe(didUri);
    expect(updated.body.didStatus).toMatchObject({
      status: "resolvable",
      network: "sepolia"
    });

    const me = await fresh.get("/api/me").expect(200);
    expect(me.body.user.didUri).toBe(didUri);
    expect(me.body.didStatus).toMatchObject({
      status: "resolvable",
      network: "sepolia"
    });
  });
});
