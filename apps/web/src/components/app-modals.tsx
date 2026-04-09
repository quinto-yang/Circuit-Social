"use client";

import React from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";

import { MenuSheet } from "@/components/menu-sheet";
import { ModalCard } from "@/components/modal-card";
import { Avatar } from "@/components/ui/avatar";
import { DataRow } from "@/components/ui/data-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LabeledField } from "@/components/ui/labeled-field";

import { Bell, ImagePlus, Wallet, ChevronRight } from "lucide-react";

type TFn = (zh: string, en: string) => string;

export function AppModals({
  modal,
  setModal,
  t,
  requests,
  busy,
  setBusy,
  sitePublic,
  friendTarget,
  setFriendTarget,
  groupName,
  setGroupName,
  joinCode,
  setJoinCode,
  submitFriendRequest,
  createGroup,
  joinGroup,
  answerRequest,
  shortAddress,
  flashStatus,
  bindChainType,
  setBindChainType,
  handleSiweLogin,
  profileAvatarUrlManual,
  setProfileAvatarUrlManual,
  profileForm,
  setProfileForm,
  buildAssetUrl,
  uploadAvatar,
  saveProfile,
  setStatus,
  feedbackDraft,
  setFeedbackDraft,
  submitFeedback,
  cn,
  session
}: {
  modal: any;
  setModal: (next: any) => void;
  t: TFn;
  requests: any;
  busy: string | null;
  setBusy: (next: any) => void;
  sitePublic: any;
  friendTarget: string;
  setFriendTarget: (next: string) => void;
  groupName: string;
  setGroupName: (next: string) => void;
  joinCode: string;
  setJoinCode: (next: string) => void;
  submitFriendRequest: () => Promise<void> | void;
  createGroup: () => Promise<void> | void;
  joinGroup: () => Promise<void> | void;
  answerRequest: (requestId: number, action: "accept" | "decline") => Promise<void> | void;
  shortAddress: (value: string) => string;
  flashStatus: (message: string) => void;
  bindChainType: "evm" | "solana";
  setBindChainType: (next: "evm" | "solana") => void;
  handleSiweLogin: (mode: any, opts: any) => Promise<void> | void;
  profileAvatarUrlManual: boolean;
  setProfileAvatarUrlManual: (next: boolean) => void;
  profileForm: any;
  setProfileForm: any;
  buildAssetUrl: (value: string | null) => string | null;
  uploadAvatar: (file: File) => Promise<string>;
  saveProfile: () => Promise<void> | void;
  setStatus: (next: string) => void;
  feedbackDraft: string;
  setFeedbackDraft: (next: string) => void;
  submitFeedback: () => Promise<void> | void;
  cn: (...parts: Array<string | false | null | undefined>) => string;
  session: any;
}) {
  return (
    <>
      {modal === "contacts-menu" && (
        <MenuSheet
          title={t("通讯录动作", "Contacts Actions")}
          actions={[
            {
              label: t("添加好友", "Add Friend"),
              description: t("通过用户 ID 或钱包地址建立关系", "Add by user ID or wallet address"),
              onClick: () => setModal("add-friend")
            },
            {
              label: t("创建群聊", "Create Group"),
              description: t("创建项目群、任务群或测试群", "Create project/task/test groups"),
              onClick: () => setModal("create-group")
            },
            {
              label: t("加入群聊", "Join Group"),
              description: t("输入 8 位群邀请码", "Input 8-char invite code"),
              onClick: () => setModal("join-group")
            },
            {
              label: t("新的朋友", "New Friends"),
              description: t("处理待接受的好友申请", "Review pending requests"),
              badge: requests.incoming.length,
              onClick: () => setModal("requests")
            }
          ]}
        />
      )}

      {modal === "add-friend" && (
        <ModalCard
          title={t("添加好友", "Add Friend")}
          subtitle={t("输入目标用户 ID 或完整钱包地址", "Input target user ID or full wallet address")}
          actions={
            <button
              type="button"
              onClick={() => void submitFriendRequest()}
              className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
            >
              {busy === "friend-request" ? t("发送中...", "Sending...") : t("发送好友申请", "Send Request")}
            </button>
          }
        >
          <Input value={friendTarget} onChange={setFriendTarget} placeholder={t("例如 3 或 0xabc...", "e.g. 3 or 0xabc...")} />
        </ModalCard>
      )}

      {modal === "create-group" && (
        <ModalCard
          title={t("创建群聊", "Create Group")}
          subtitle={t("群创建后会自动生成 8 位邀请码", "An 8-char invite code will be generated")}
          actions={
            <button
              type="button"
              onClick={() => void createGroup()}
              className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
            >
              {busy === "create-group" ? t("创建中...", "Creating...") : t("创建群聊", "Create Group")}
            </button>
          }
        >
          <Input value={groupName} onChange={setGroupName} placeholder={t("输入群名称", "Group name")} />
        </ModalCard>
      )}

      {modal === "join-group" && (
        <ModalCard
          title={t("加入群聊", "Join Group")}
          subtitle={t("请输入群主分享的 8 位邀请码", "Please input 8-char invite code")}
          actions={
            <button
              type="button"
              onClick={() => void joinGroup()}
              className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink"
            >
              {busy === "join-group" ? t("加入中...", "Joining...") : t("加入群聊", "Join Group")}
            </button>
          }
        >
          <Input
            value={joinCode}
            onChange={(value) => setJoinCode(value.toUpperCase())}
            placeholder={t("例如 C8X6J2QH", "e.g. C8X6J2QH")}
          />
        </ModalCard>
      )}

      {modal === "requests" && (
        <ModalCard title={t("新的朋友", "New Friends")} subtitle={t("处理收到的好友申请", "Process received requests")}>
          <div className="space-y-2.5">
            {requests.incoming.map((request: any) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar label={request.from.nickname} image={request.from.avatarUrl} tone="emerald" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{request.from.nickname}</div>
                    <div className="truncate text-xs text-slate-500">{shortAddress(request.from.primaryWalletAddress)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void answerRequest(request.id, "decline")}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    {t("拒绝", "Decline")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void answerRequest(request.id, "accept")}
                    className="rounded-2xl bg-jade px-3 py-2 text-sm font-semibold text-ink"
                  >
                    {busy === `request-${request.id}` ? t("处理中...", "Processing...") : t("接受", "Accept")}
                  </button>
                </div>
              </div>
            ))}
            {requests.incoming.length === 0 && (
              <EmptyState
                icon={<Bell className="h-5 w-5" />}
                title={t("暂无待处理申请", "No pending requests")}
                description={t(
                  "来自好友推荐、群扩散或朋友圈互动的申请会出现在这里。",
                  "Requests from recommendations, groups, or moments will appear here."
                )}
              />
            )}
          </div>
        </ModalCard>
      )}

      {modal === "profile" && (
        <ModalCard
          title={t("编辑资料", "Edit Profile")}
          subtitle={t("统一管理链上身份与站内展示资料", "Manage on-chain identity and profile")}
          stickyActions
          actions={
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bind Chain Type</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBindChainType("evm")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      bindChainType === "evm"
                        ? "border-slate-900/10 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    EVM
                  </button>
                  <button
                    type="button"
                    disabled={!sitePublic.enableSolanaLogin}
                    onClick={() => {
                      if (!sitePublic.enableSolanaLogin) return;
                      setBindChainType("solana");
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      !sitePublic.enableSolanaLogin && "cursor-not-allowed opacity-55",
                      bindChainType === "solana"
                        ? "border-slate-900/10 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    {sitePublic.enableSolanaLogin ? "Solana" : t("Solana (按开关启用)", "Solana (feature flag)")}
                  </button>
                </div>
                {!sitePublic.enableSolanaLogin ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-900">
                    {t("当前优先推荐 EVM，Solana 绑定将在后续版本开放。", "EVM is recommended now; Solana binding is coming soon.")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleSiweLogin("bind", { chainType: bindChainType })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
              >
                <Wallet className="h-4 w-4" />
                {t("绑定当前已连接钱包", "Bind connected wallet")}
              </button>
              <div className="text-[10px] text-slate-500">{t("本次修改仅更新身份资料，不会转移资产。", "Profile updates only. No asset transfer.")}</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileAvatarUrlManual(false);
                    setModal(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                >
                  {t("取消", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  className="w-full rounded-2xl bg-jade px-4 py-3 text-sm font-semibold text-ink"
                >
                  {busy === "profile" ? t("保存中...", "Saving...") : t("保存资料", "Save")}
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t("基本信息", "Basic info")}</div>
            <LabeledField label={t("显示名称", "Display name")}>
              <Input
                value={profileForm.nickname}
                onChange={(value) => setProfileForm((previous: any) => ({ ...previous, nickname: value.slice(0, 30) }))}
                placeholder={t("输入显示昵称", "Display nickname")}
              />
              <div className="mt-1 text-right text-[10px] text-slate-500">{profileForm.nickname.length}/30</div>
            </LabeledField>
            <LabeledField label={t("个人介绍（公开可见）", "Bio (public)")}>
              <textarea
                value={profileForm.bio}
                onChange={(event) => setProfileForm((previous: any) => ({ ...previous, bio: event.target.value.slice(0, 160) }))}
                className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
                placeholder={t("例如：我是 Circuit Builder，关注链上社交。", "e.g. Circuit builder focused on on-chain social.")}
              />
              <div className="mt-1 text-right text-[10px] text-slate-500">{profileForm.bio.length}/160</div>
            </LabeledField>
            <LabeledField label={t("头像", "Avatar")}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-white">
                  {profileForm.avatarUrl ? (
                    <img
                      src={buildAssetUrl(profileForm.avatarUrl) ?? profileForm.avatarUrl}
                      alt="avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">{t("未设置", "Empty")}</div>
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  <ImagePlus className="h-4 w-4" />
                  {busy === "avatar-upload" ? t("上传中...", "Uploading...") : t("更换头像", "Change avatar")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      setBusy("avatar-upload");
                      void uploadAvatar(file)
                        .then((avatarUrl) => {
                          setProfileForm((previous: any) => ({ ...previous, avatarUrl }));
                          setStatus(t("头像上传成功", "Avatar uploaded"));
                        })
                        .catch((error) => setStatus(mapApiError(error, t("头像上传失败", "Avatar upload failed"))))
                        .finally(() => setBusy(null));
                    }}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => setProfileAvatarUrlManual(!profileAvatarUrlManual)}
                className="mt-2 text-xs font-medium text-sky-700"
              >
                {profileAvatarUrlManual ? t("收起 URL 输入", "Hide URL input") : t("手动输入 URL", "Input URL manually")}
              </button>
              {profileAvatarUrlManual ? (
                <div className="mt-1.5">
                  <Input
                    value={profileForm.avatarUrl}
                    onChange={(value) => setProfileForm((previous: any) => ({ ...previous, avatarUrl: value }))}
                    placeholder="https://..."
                  />
                </div>
              ) : null}
            </LabeledField>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t("链上身份", "On-chain identity")}</div>
            <LabeledField label="DID URI">
              <Input
                value={profileForm.didUri}
                onChange={(value) => setProfileForm((previous: any) => ({ ...previous, didUri: value }))}
                placeholder="did:ethr:sepolia:0x..."
              />
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                <span>{t("DID 可跨平台复用你的链上身份。", "DID can be reused across platforms.")}</span>
                {profileForm.didUri ? (
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard.writeText(profileForm.didUri).then(() => {
                        flashStatus(t("已复制 DID", "DID copied"));
                      })
                    }
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    {t("复制", "Copy")}
                  </button>
                ) : null}
              </div>
            </LabeledField>
            <LabeledField label={t("已绑定钱包", "Linked wallet")}>
              <select
                value={profileForm.primaryWalletId}
                onChange={(event) =>
                  setProfileForm((previous: any) => ({
                    ...previous,
                    primaryWalletId: Number(event.target.value)
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                {session.wallets.map((wallet: any) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.chainLabel} • {shortAddress(wallet.address)}
                  </option>
                ))}
              </select>
            </LabeledField>
          </div>
        </ModalCard>
      )}

      {modal === "feedback" && (
        <ModalCard
          title={t("意见反馈", "Feedback")}
          subtitle={t("你的每条建议都会帮助我们迭代产品", "Your feedback helps us improve")}
          actions={
            <button
              type="button"
              onClick={() => void submitFeedback()}
              disabled={busy === "feedback" || !feedbackDraft.trim()}
              className="w-full rounded-2xl bg-jade px-4 py-3 font-semibold text-ink disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy === "feedback" ? t("提交中...", "Submitting...") : t("提交反馈", "Submit Feedback")}
            </button>
          }
        >
          <textarea
            value={feedbackDraft}
            onChange={(event) => setFeedbackDraft(event.target.value)}
            placeholder={t("例如：希望优化哪些交互、功能或视觉细节...", "e.g. Which interactions or features should be improved?")}
            className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-jade/40 focus:bg-white"
          />
        </ModalCard>
      )}

      {modal === "contact" && (
        <ModalCard
          title={t("联系我们", "Contact Us")}
          subtitle={t("欢迎交流产品建议、合作与技术问题", "For product feedback, partnership, and support")}
        >
          <div className="space-y-3 text-sm text-slate-600">
            <DataRow
              label={t("邮箱", "Email")}
              value={sitePublic.contactEmail}
              copyable
              onCopied={() => flashStatus(t(`已复制：${sitePublic.contactEmail}`, `Copied: ${sitePublic.contactEmail}`))}
            />
            <DataRow
              label={t("微信", "WeChat")}
              value={sitePublic.contactWeChat}
              copyable
              onCopied={() => flashStatus(t(`已复制：${sitePublic.contactWeChat}`, `Copied: ${sitePublic.contactWeChat}`))}
            />
            <DataRow
              label="Telegram"
              value={sitePublic.contactTelegram}
              copyable
              onCopied={() => flashStatus(t(`已复制：${sitePublic.contactTelegram}`, `Copied: ${sitePublic.contactTelegram}`))}
            />
          </div>
        </ModalCard>
      )}
    </>
  );
}

