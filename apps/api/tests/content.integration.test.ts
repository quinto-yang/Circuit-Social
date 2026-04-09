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

  it("creates threaded comments and enforces delete permissions", async () => {
    const author = context.createAgent();
    const commenter = context.createAgent();
    const outsider = context.createAgent();
    await createTestSession(author, "fresh-user");
    await createTestSession(commenter, "concierge");
    await createTestSession(outsider, "guide");

    const createdMoment = await author.post("/api/moments").send({
      content: "Moment with comments",
      uploadIds: []
    }).expect(201);
    const momentId = createdMoment.body.moment.id as number;

    const parentComment = await commenter
      .post(`/api/moments/${momentId}/comments`)
      .send({ content: "parent comment" })
      .expect(201);
    const parentId = parentComment.body.comments[0].id as number;

    const withReply = await commenter
      .post(`/api/moments/${momentId}/comments`)
      .send({ content: "reply comment", parentCommentId: parentId })
      .expect(201);
    expect(withReply.body.comments[0].replies).toHaveLength(1);

    const outsiderDelete = await outsider.delete(`/api/moments/${momentId}/comments/${parentId}`);
    expect(outsiderDelete.status).toBe(400);
    expect(outsiderDelete.body.error).toBe("无权限删除评论");

    const deletedByMomentAuthor = await author.delete(`/api/moments/${momentId}/comments/${parentId}`);
    expect(deletedByMomentAuthor.status).toBe(200);
    expect(deletedByMomentAuthor.body.comments).toHaveLength(0);
  });

  it("toggles moment likes, comment likes, and pins author comment on top", async () => {
    const author = context.createAgent();
    const userA = context.createAgent();
    const userB = context.createAgent();
    await createTestSession(author, "fresh-user");
    await createTestSession(userA, "concierge");
    await createTestSession(userB, "guide");

    const createdMoment = await author.post("/api/moments").send({
      content: "Moment with likes/pins",
      uploadIds: []
    }).expect(201);
    const momentId = createdMoment.body.moment.id as number;

    const like1 = await userA.post(`/api/moments/${momentId}/likes`).expect(201);
    expect(like1.body.liked).toBe(true);
    const like2 = await userA.post(`/api/moments/${momentId}/likes`).expect(201);
    expect(like2.body.liked).toBe(false);

    const c1 = await userA.post(`/api/moments/${momentId}/comments`).send({ content: "c1" }).expect(201);
    const comment1Id = c1.body.comments[0].id as number;
    const c2 = await userB.post(`/api/moments/${momentId}/comments`).send({ content: "c2" }).expect(201);
    const comment2Id = c2.body.comments[0].id as number;

    await userB.post(`/api/moments/${momentId}/comments/${comment2Id}/likes`).expect(201);
    await userB.post(`/api/moments/${momentId}/comments/${comment2Id}/likes`).expect(201); // toggle off
    await userA.post(`/api/moments/${momentId}/comments/${comment2Id}/likes`).expect(201); // +1
    await userB.post(`/api/moments/${momentId}/comments/${comment2Id}/likes`).expect(201); // +2 (hot)

    const pinned = await author.post(`/api/moments/${momentId}/comments/${comment1Id}/pin`).expect(201);
    expect(pinned.body.pinned).toBe(true);

    const comments = await author.get(`/api/moments/${momentId}/comments`).expect(200);
    expect(comments.body.comments[0].id).toBe(comment1Id);
    expect(comments.body.comments[0].pinned).toBe(true);

    const unpinned = await author.post(`/api/moments/${momentId}/comments/${comment1Id}/pin`).expect(201);
    expect(unpinned.body.pinned).toBe(false);

    const comments2 = await author.get(`/api/moments/${momentId}/comments`).expect(200);
    expect(comments2.body.comments[0].id).toBe(comment2Id);
  });

  it("rejects pin by non-moment author", async () => {
    const author = context.createAgent();
    const commenter = context.createAgent();
    await createTestSession(author, "fresh-user");
    await createTestSession(commenter, "concierge");

    const createdMoment = await author.post("/api/moments").send({
      content: "Pin permission test",
      uploadIds: []
    }).expect(201);
    const momentId = createdMoment.body.moment.id as number;

    const c1 = await commenter.post(`/api/moments/${momentId}/comments`).send({ content: "only author" }).expect(201);
    const commentId = c1.body.comments[0].id as number;

    const forbidden = await commenter.post(`/api/moments/${momentId}/comments/${commentId}/pin`);
    expect(forbidden.status).toBe(400);
    expect(forbidden.body.error).toBe("仅作者可置顶评论");
  });

  it("returns discover hot modules from real interactions", async () => {
    const author = context.createAgent();
    const userA = context.createAgent();
    await createTestSession(author, "fresh-user");
    await createTestSession(userA, "concierge");

    const createdMoment = await author.post("/api/moments").send({
      content: "Hot moment candidate",
      uploadIds: []
    }).expect(201);
    const momentId = createdMoment.body.moment.id as number;

    await userA.post(`/api/moments/${momentId}/likes`).expect(201);
    await userA.post(`/api/moments/${momentId}/comments`).send({ content: "boost" }).expect(201);

    const hot = await userA.get("/api/discover/hot").expect(200);
    expect(Array.isArray(hot.body.hotMoments)).toBe(true);
    expect(Array.isArray(hot.body.hotGroups)).toBe(true);
    expect(Array.isArray(hot.body.recommendedUsers)).toBe(true);
    expect(hot.body.hotMoments.some((item: { moment: { id: number } }) => item.moment.id === momentId)).toBe(true);
  });

  it("tracks tasks and points with idempotent claims", async () => {
    const user = context.createAgent();
    await createTestSession(user, "fresh-user");

    const tasks1 = await user.get("/api/tasks").expect(200);
    expect(Array.isArray(tasks1.body.tasks)).toBe(true);

    const createdMoment = await user.post("/api/moments").send({ content: "task moment", uploadIds: [] }).expect(201);
    const momentId = createdMoment.body.moment.id as number;
    await user.post(`/api/moments/${momentId}/likes`).expect(201);
    await user.post(`/api/moments/${momentId}/comments`).send({ content: "task comment" }).expect(201);

    const tasks2 = await user.get("/api/tasks").expect(200);
    const firstLike = tasks2.body.tasks.find((t: { key: string }) => t.key === "first_like");
    expect(firstLike).toBeTruthy();

    const beforeClaim = await user.get("/api/points").expect(200);
    const totalBeforeClaim = beforeClaim.body.total as number;

    const claim1 = await user.post("/api/tasks/first_like/claim").expect(201);
    expect(claim1.body.claimed).toBe(true);
    expect(claim1.body.delta).toBe(2);

    const pointsAfterFirst = await user.get("/api/points").expect(200);
    expect(pointsAfterFirst.body.total).toBe(totalBeforeClaim + 2);

    const claim2 = await user.post("/api/tasks/first_like/claim").expect(201);
    expect(claim2.body.claimed).toBe(false);

    const points = await user.get("/api/points").expect(200);
    expect(points.body.total).toBe(totalBeforeClaim + 2);
    expect(Array.isArray(points.body.ledger)).toBe(true);
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
