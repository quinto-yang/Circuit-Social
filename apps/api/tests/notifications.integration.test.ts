import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, createTestSession } from "./helpers/api-test-app";

describe("notifications integration", () => {
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

  it("returns empty list and unread count when DATABASE_URL is not set", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const count = await agent.get("/api/notifications/unread-count").expect(200);
    expect(count.body).toMatchObject({ ok: true, count: 0 });

    const list = await agent.get("/api/notifications").expect(200);
    expect(list.body).toMatchObject({ ok: true, items: [], nextCursor: null });

    const mark = await agent.post("/api/notifications/mark-read").send({ all: true }).expect(201);
    expect(mark.body).toMatchObject({ ok: true, updated: 0 });
  });

  it("accepts ids payload and remains no-op without database", async () => {
    const agent = context.createAgent();
    await createTestSession(agent, "fresh-user");

    const mark = await agent
      .post("/api/notifications/mark-read")
      .send({ ids: [1, 2, 999] })
      .expect(201);
    expect(mark.body).toMatchObject({ ok: true, updated: 0 });
  });
});

