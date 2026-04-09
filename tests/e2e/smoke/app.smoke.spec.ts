import { test, expect } from "../fixtures";

test("navigates across tabs and returns from the chat room", async ({
  authenticatedPage: page
}) => {
  await page.getByRole("button", { name: /Circuit Concierge/ }).click();
  await expect(page.getByRole("button", { name: "返回" })).toBeVisible();

  await page.getByRole("button", { name: "返回" }).click();
  await expect(page.getByRole("button", { name: /Circuit Lounge/ })).toBeVisible();

  await page.getByRole("button", { name: "通讯录", exact: true }).click();
  await expect(page.getByText("我的群聊")).toBeVisible();
  await expect(page.getByText("好友")).toBeVisible();

  await page.getByRole("button", { name: "发现", exact: true }).click();
  await page.getByRole("button", { name: "朋友圈" }).click();
  await expect(page.getByPlaceholder("分享新鲜事、群组动态或产品进展...")).toBeVisible();

  await page.getByRole("button", { name: "我的", exact: true }).click();
  await expect(page.getByRole("button", { name: "编辑资料" })).toBeVisible();
});

test("sends one direct message even after realtime updates and reload", async ({
  authenticatedPage: page
}) => {
  const content = `regression-${Date.now()}`;

  await page.getByRole("button", { name: /Circuit Concierge/ }).click();
  await page.getByPlaceholder("发送消息").fill(content);
  await page.getByPlaceholder("发送消息").press("Enter");

  await expect(page.getByText(content, { exact: true })).toHaveCount(1);

  await page.reload();
  await page.getByRole("button", { name: /Circuit Concierge/ }).click();
  await expect(page.getByText(content, { exact: true })).toHaveCount(1);
});

test("opens the group drawer and shows the seeded invite code", async ({
  authenticatedPage: page
}) => {
  await page.getByRole("button", { name: /Circuit Lounge/ }).click();
  await page.getByRole("button", { name: "群管理" }).click();

  await expect(page.getByRole("button", { name: "关闭群成员与提及" })).toBeVisible();
  await expect(page.getByText("群号：C8X6J2QH")).toBeVisible();

  await page.getByRole("button", { name: "关闭群成员与提及" }).click();
  await expect(page.getByRole("button", { name: "关闭群成员与提及" })).toHaveCount(0);
  await expect(page.getByText("群号：C8X6J2QH")).toHaveCount(0);
});

test("publishes a moment and updates profile", async ({
  authenticatedPage: page
}) => {
  const momentText = `moment-${Date.now()}`;
  const commentText = `comment-${Date.now()}`;
  const nickname = `Pilot-${Date.now().toString().slice(-4)}`;

  await page.getByRole("button", { name: "发现", exact: true }).click();
  await page.getByRole("button", { name: "朋友圈" }).click();
  await page
    .getByPlaceholder("分享新鲜事、群组动态或产品进展...")
    .fill(momentText);
  await page.getByRole("button", { name: "发布动态" }).click();
  await expect(
    page.locator("p").filter({
      hasText: momentText
    }).first()
  ).toBeVisible();
  await expect(page.getByPlaceholder("分享新鲜事、群组动态或产品进展...")).toHaveValue("");

  await page.getByRole("button", { name: /评论/ }).first().click();
  await page.getByPlaceholder("写下你的评论...").first().fill(commentText);
  await page.getByRole("button", { name: "发表评论" }).first().click();
  await expect(page.getByText(commentText, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "删除" }).first().click();
  await expect(page.getByText(commentText, { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "我的", exact: true }).click();
  await page.getByRole("button", { name: "编辑资料" }).click();
  await page.getByPlaceholder("输入显示昵称").fill(nickname);
  await page
    .getByPlaceholder(/例如：我是 Circuit Builder|e\.g\. Circuit builder/i)
    .fill("Playwright regression profile");
  await page.getByRole("button", { name: /保存资料|^Save$/ }).click();

  await expect(page.getByText(nickname, { exact: true }).first()).toBeVisible();
});
