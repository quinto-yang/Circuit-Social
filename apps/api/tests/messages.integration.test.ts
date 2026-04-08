import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
  createApiTestApp,
  createTestSession
} from "./helpers/api-test-app";

describe("messages integration", () => {
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

  it("updates unread counts after send and mark-read", async () => {
    const fresh = context.createAgent();
    const guide = context.createAgent();
    await createTestSession(fresh, "fresh-user");
    await createTestSession(guide, "guide");

    const freshConversations = await fresh.get("/api/conversations").expect(200);
    const lounge = freshConversations.body.conversations.find(
      (conversation: { title: string; inviteCode: string | null }) =>
        conversation.title === "Circuit Lounge" && conversation.inviteCode === "C8X6J2QH"
    );

    expect(lounge).toBeTruthy();

    const sent = await guide.post("/api/messages").send({
      conversationId: lounge.id,
      content: "Unread count regression check"
    });
    expect(sent.status).toBe(201);

    const unread = await fresh.get("/api/conversations").expect(200);
    const updated = unread.body.conversations.find(
      (conversation: { id: number }) => conversation.id === lounge.id
    );
    expect(updated.unreadCount).toBe(1);

    await fresh
      .post("/api/messages/read")
      .send({
        conversationId: lounge.id,
        messageId: updated.lastMessage.id
      })
      .expect(201);

    const cleared = await fresh.get("/api/conversations").expect(200);
    const clearedConversation = cleared.body.conversations.find(
      (conversation: { id: number }) => conversation.id === lounge.id
    );
    expect(clearedConversation.unreadCount).toBe(0);
  });

  it("blocks muted members and restores messaging after unmute", async () => {
    const concierge = context.createAgent();
    const fresh = context.createAgent();
    await createTestSession(concierge, "concierge");
    await createTestSession(fresh, "fresh-user");

    const freshConversations = await fresh.get("/api/conversations").expect(200);
    const lounge = freshConversations.body.conversations.find(
      (conversation: { inviteCode: string | null }) => conversation.inviteCode === "C8X6J2QH"
    );

    await concierge
      .post(`/api/groups/${lounge.id}/mute`)
      .send({
        userId: 3,
        minutes: 30
      })
      .expect(201);

    const blocked = await fresh.post("/api/messages").send({
      conversationId: lounge.id,
      content: "This should be blocked"
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body).toMatchObject({
      ok: false,
      error: "你已被禁言"
    });

    await concierge
      .post(`/api/groups/${lounge.id}/mute`)
      .send({
        userId: 3,
        minutes: 0
      })
      .expect(201);

    const restored = await fresh.post("/api/messages").send({
      conversationId: lounge.id,
      content: "Mute cleared"
    });
    expect(restored.status).toBe(201);
    expect(restored.body.message.content).toBe("Mute cleared");
  });
});
