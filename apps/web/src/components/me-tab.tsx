"use client";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LogOut,
  MessageCircle,
  Pencil
} from "lucide-react";
import React from "react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { DataRow } from "@/components/ui/data-row";
import { SectionTitle } from "@/components/ui/section-title";

type TFn = (zh: string, en: string) => string;

export function MeTab({
  locale,
  t,
  meSubView,
  setMeSubView,
  socketConnected,
  session,
  points,
  tasks,
  busy,
  loadPointsAndTasks,
  onClaimTask,
  formatTime,
  shortAddress,
  flashStatus,
  didResolveStatus,
  profileExplorerUrl,
  walletsExpanded,
  setWalletsExpanded,
  setModal,
  logout,
  cn,
  onSetStatus
}: {
  locale: "zh" | "en";
  t: TFn;
  meSubView: "main" | "pointsTasks";
  setMeSubView: (next: "main" | "pointsTasks") => void;
  socketConnected: boolean;
  session: any;
  points: any;
  tasks: any[] | null;
  busy: string;
  loadPointsAndTasks: () => Promise<void> | void;
  onClaimTask: (taskKey: string) => Promise<void>;
  formatTime: (value: string, locale: "zh" | "en") => string;
  shortAddress: (value: string) => string;
  flashStatus: (message: string) => void;
  didResolveStatus: any;
  profileExplorerUrl: string | null;
  walletsExpanded: boolean;
  setWalletsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setModal: (next: any) => void;
  logout: () => Promise<void> | void;
  cn: (...parts: Array<string | false | null | undefined>) => string;
  onSetStatus: (value: any) => void;
}) {
  return (
    <div className="space-y-2.5 pb-24 pt-2">
      {meSubView === "pointsTasks" ? (
        <div className="space-y-3">
          <header className="sticky top-0 z-10 -mx-1 flex items-center gap-2 border-b border-white/70 bg-white/90 px-1 pb-2.5 pt-0.5 backdrop-blur">
            <button
              type="button"
              onClick={() => setMeSubView("main")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              aria-label={t("返回", "Back")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="flex-1 pr-9 text-center text-sm font-semibold text-slate-900">
              {t("积分与任务", "Points & tasks")}
            </span>
          </header>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t("当前积分", "Total points")}
                </div>
                <div className="mt-1 text-3xl font-bold tracking-[-0.03em] text-slate-900">{points?.total ?? 0}</div>
              </div>
              <button
                type="button"
                onClick={() => void loadPointsAndTasks()}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-jade/30 hover:text-jade-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                {t("刷新", "Refresh")}
              </button>
            </div>
          </Card>

          <Card>
            <SectionTitle title={t("任务", "Tasks")} hint={t("完成可领奖", "Claim when ready")} />
            <div className="mt-2 space-y-2">
              {(tasks ?? []).map((task: any) => (
                <div
                  key={task.key}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{t(task.titleZh ?? task.key, task.titleEn ?? task.key)}</div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-500">
                      {t(task.descriptionZh ?? "", task.descriptionEn ?? "")}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {task.progress ?? 0}/{task.target ?? 1} · +{task.points ?? 0}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!task.canClaim}
                    onClick={() => void onClaimTask(task.key).catch(onSetStatus)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
                      task.canClaim
                        ? "bg-jade text-ink hover:bg-emerald-300 active:scale-[0.99]"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                    )}
                  >
                    {task.canClaim ? t("领奖", "Claim") : t("未完成", "Pending")}
                  </button>
                </div>
              ))}
              {!tasks ? (
                <div className="text-[11px] text-slate-500">{t("加载中...", "Loading...")}</div>
              ) : (tasks ?? []).length === 0 ? (
                <div className="text-[11px] text-slate-500">{t("暂无任务", "No tasks")}</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionTitle title={t("积分流水", "Point history")} hint={t("最近记录", "Recent")} />
            <div className="mt-2 space-y-1.5">
              {(points?.ledger ?? []).length ? (
                (points?.ledger ?? []).map((row: any, index: number) => (
                  <div
                    key={`${row.reason}-${row.createdAt}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-700">{row.reason}</div>
                      {row.refType && row.refId ? (
                        <div className="mt-0.5 truncate text-[10px] text-slate-500">
                          {row.refType}:{row.refId}
                        </div>
                      ) : null}
                      {row.createdAt ? (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {formatTime(String(row.createdAt), locale)}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-semibold tabular-nums",
                        (row.delta ?? 0) >= 0 ? "text-jade-deep" : "text-coral"
                      )}
                    >
                      {(row.delta ?? 0) > 0 ? "+" : ""}
                      {row.delta ?? 0}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500">
                  {t("暂无流水", "No ledger entries yet")}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <>
          <Card>
            <div className="rounded-2xl bg-[linear-gradient(140deg,#0f172a_0%,#153249_46%,#14532d_100%)] p-3 text-white shadow-soft">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {socketConnected ? t("实时在线", "Realtime online") : t("连接中", "Connecting")}
              </div>
              <div className="flex items-start gap-3">
                <Avatar label={session.user.nickname} image={session.user.avatarUrl} tone="emerald" size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-[var(--font-display)] text-xl font-bold tracking-[-0.05em] text-white">
                        {session.user.nickname}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5">
                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                          ID {session.user.id}
                        </span>
                        <span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                          {session.user.primaryChainLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal("profile")}
                      aria-label={t("编辑资料", "Edit profile")}
                      title={t("编辑资料", "Edit profile")}
                      className="shrink-0 rounded-full border border-white/20 bg-white/10 p-2 text-white/85 shadow-sm transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 rounded-xl bg-white/10 px-2.5 py-2 text-[11px] leading-snug text-white/90">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        {shortAddress(session.user.primaryWalletAddress)} • {session.user.primaryChainLabel}
                      </span>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard
                              .writeText(session.user.primaryWalletAddress)
                              .then(() => flashStatus(t("已复制：钱包地址", "Copied: wallet address")))
                          }
                          className="rounded-full border border-white/20 bg-white/10 p-1 text-white/85 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                          aria-label={t("复制钱包地址", "Copy wallet address")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {profileExplorerUrl ? (
                          <a
                            href={profileExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-white/20 bg-white/10 p-1 text-white/85 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                            aria-label={t("在浏览器查看地址", "View address in explorer")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => {
                setMeSubView("pointsTasks");
                void loadPointsAndTasks();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-jade/30 hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">{t("积分与任务", "Points & tasks")}</div>
                <div className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-900">
                  {points?.total ?? 0}{" "}
                  <span className="text-sm font-medium text-slate-500">{t("分", "pts")}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{t("查看任务进度与积分流水", "Tasks & point history")}</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          </Card>

          <Card>
            <SectionTitle
              title={t("链上身份状态", "On-chain identity status")}
              hint={socketConnected ? t("实时连接已建立", "Realtime connected") : t("已回退轮询", "Polling fallback")}
            />
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {socketConnected ? t("实时连接已建立", "Realtime connected") : t("轮询模式", "Polling mode")}
            </div>
            <div className="mt-2 space-y-1.5 text-sm text-slate-600">
              <DataRow label={t("我的 ID", "My ID")} value={String(session.user.id)} copyable onCopied={() => flashStatus(`已复制：${session.user.id}`)} />
              <DataRow
                label={t("主钱包", "Primary Wallet")}
                value={session.user.primaryWalletAddress}
                displayValue={`${shortAddress(session.user.primaryWalletAddress)} • ${session.user.primaryChainLabel}`}
                copyable
                onCopied={() => flashStatus(t("已复制：主钱包地址", "Copied: primary wallet"))}
              />
              <DataRow label={t("已绑定钱包", "Bound Wallets")} value={`${session.wallets.length} ${t("个", "")}`} />
              <button
                type="button"
                onClick={() => setWalletsExpanded((prev) => !prev)}
                className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                <span>{t("查看已绑定钱包详情", "View bound wallets")}</span>
                <ChevronRight className={cn("h-4 w-4 transition", walletsExpanded ? "rotate-90" : "")} />
              </button>
              {walletsExpanded && (
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
                  {session.wallets.map((wallet: any) => (
                    <div
                      key={wallet.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-slate-600"
                    >
                      <span className="truncate">
                        {shortAddress(wallet.address)} • {wallet.chainLabel}
                      </span>
                      <div className="inline-flex shrink-0 items-center gap-1">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {wallet.isPrimary ? t("主钱包", "Primary") : t("已绑定", "Bound")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard
                              .writeText(wallet.address)
                              .then(() => flashStatus(t("已复制：钱包地址", "Copied: wallet address")))
                          }
                          className="rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:border-jade/30 hover:text-jade-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                          aria-label={t("复制钱包地址", "Copy wallet address")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="my-1 h-px bg-slate-200" />
              <DataRow
                label="DID URI"
                value={session.user.didUri ?? t("未绑定", "Unbound")}
                displayValue={session.user.didUri ? shortAddress(session.user.didUri) : t("未绑定", "Unbound")}
                copyable={Boolean(session.user.didUri)}
                onCopied={() => flashStatus(t("已复制：DID URI", "Copied: DID URI"))}
              />
              <DataRow label={t("DID 状态", "DID Status")} value={didResolveStatus.detail} />
              {didResolveStatus.status === "unbound" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2">
                  <button
                    type="button"
                    onClick={() => setModal("profile")}
                    className="inline-flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left text-xs font-medium text-sky-700 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                  >
                    <span>{t("立即绑定 DID", "Bind DID now")}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <p className="mt-1.5 text-[11px] text-amber-800/80">
                    {t("未绑定 DID，部分跨平台身份能力不可用。", "DID is unbound; cross-platform identity features are limited.")}
                  </p>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                {t("小提示：绑定 DID 可跨平台复用身份。", "Tip: Bind DID to reuse your identity across platforms.")}
              </p>
            </div>
          </Card>

          <Card>
            <SectionTitle title={t("帮助与反馈", "Help & Feedback")} hint={t("我们会认真阅读每条反馈", "Every suggestion matters")} />
            <div className="mt-1.5 space-y-1.5">
              <button
                type="button"
                onClick={() => setModal("feedback")}
                className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-900">{t("意见反馈", "Feedback")}</div>
                    <div className="text-[11px] text-slate-500">{t("进入二级页面填写反馈内容", "Open detail page to submit feedback")}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => setModal("contact")}
                className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <div className="font-semibold text-slate-900">{t("联系我们", "Contact Us")}</div>
                    <div className="text-[11px] text-slate-500">{t("查看商务合作与技术支持渠道", "Business and support channels")}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </Card>
        </>
      )}

      {meSubView === "main" ? (
        <div className="sticky bottom-2 z-10 rounded-2xl border border-slate-200/90 bg-white/95 p-2.5 shadow-soft backdrop-blur">
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-coral/35 bg-coral/10 px-3 py-2.5 text-sm font-semibold text-coral transition hover:bg-coral/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
          >
            <LogOut className="h-4 w-4" />
            {t("退出登录", "Log out")}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-slate-500">
            {t("退出后下次仍需链上签名验证。", "Signing verification is required next time after logout.")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

