import React from "react";

import { Bell, ChevronRight, Copy, Search, Sparkles, UserRound, Users, X } from "lucide-react";

import type { ConversationSummary, FriendRequest, NotificationItem, SessionUserPayload } from "@/lib/types";

type ContactsTabProps = {
  locale: "zh" | "en";
  t: (zh: string, en: string) => string;

  contactsView: "contacts" | "notifications";
  setContactsView: (view: "contacts" | "notifications") => void;

  contactsSearchQuery: string;
  setContactsSearchQuery: (value: string) => void;

  contactsGroupExpanded: boolean;
  setContactsGroupExpanded: (value: (prev: boolean) => boolean) => void;
  contactsFriendExpanded: boolean;
  setContactsFriendExpanded: (value: (prev: boolean) => boolean) => void;

  filteredGroupConversations: ConversationSummary[];
  filteredFriends: SessionUserPayload["user"][];

  openConversation: (conversation: ConversationSummary) => void;
  startDm: (peerId: number) => void;

  unreadNotifications: number;
  notifications: NotificationItem[];
  notificationsCursor: string | null;
  notificationsLoading: boolean;
  loadNotifications: (options?: { reset?: boolean }) => void;
  markAllNotificationsRead: () => void;

  flashStatus: (message: string, durationMs?: number) => void;
  formatTime: (value: string, locale: "zh" | "en") => string;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-300/80 bg-slate-50/95 p-3 shadow-soft backdrop-blur">
      {children}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        {icon}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-500">{description}</div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div className="text-[15px] font-semibold text-slate-900">{title}</div>
      <div className="text-[11px] tracking-[0.06em] text-slate-400">{hint}</div>
    </div>
  );
}

function Avatar({
  label,
  image,
  tone,
  size = "md"
}: {
  label: string;
  image: string | null;
  tone: "emerald" | "sky";
  size?: "sm" | "md" | "lg";
}) {
  const map = {
    sm: "h-9 w-9 text-sm",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
  };
  const bg = tone === "emerald" ? "from-jade to-emerald-700" : "from-sky-300 to-sky-500";
  if (image) {
    return <img src={image} alt="" className={cn("shrink-0 rounded-2xl object-cover", map[size])} />;
  }
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-semibold text-white",
        bg,
        map[size]
      )}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function ContactsTab(props: ContactsTabProps) {
  const {
    locale,
    t,
    contactsView,
    setContactsView,
    contactsSearchQuery,
    setContactsSearchQuery,
    contactsGroupExpanded,
    setContactsGroupExpanded,
    contactsFriendExpanded,
    setContactsFriendExpanded,
    filteredGroupConversations,
    filteredFriends,
    openConversation,
    startDm,
    unreadNotifications,
    notifications,
    notificationsCursor,
    notificationsLoading,
    loadNotifications,
    markAllNotificationsRead,
    flashStatus,
    formatTime
  } = props;

  return (
    <div className="space-y-2.5 pb-6 pt-2">
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setContactsView("contacts")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
            contactsView === "contacts"
              ? "border-jade/30 bg-jade/10 text-jade-deep"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <Users className="h-4 w-4" />
          {t("通讯录", "Contacts")}
        </button>
        <button
          type="button"
          onClick={() => {
            setContactsView("notifications");
            loadNotifications({ reset: true });
            if (unreadNotifications > 0) {
              markAllNotificationsRead();
            }
          }}
          className={cn(
            "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
            contactsView === "notifications"
              ? "border-jade/30 bg-jade/10 text-jade-deep"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          {unreadNotifications > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          ) : null}
          <Bell className="h-4 w-4" />
          {t("通知", "Notifications")}
        </button>
      </div>

      {contactsView === "notifications" ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title={t("互动通知", "Activity")} hint={t("点赞与评论", "Likes & comments")} />
            <button
              type="button"
              onClick={() => loadNotifications({ reset: true })}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("刷新", "Refresh")}
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  // 外层 AppShell 会决定具体跳转/切换 tab 的行为
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
                  item.readAt ? "border-slate-200 bg-slate-50/60" : "border-jade/20 bg-jade/5"
                )}
              >
                <Avatar
                  label={item.actor.nickname}
                  image={item.actor.avatarUrl}
                  tone={item.kind === "like" ? "emerald" : "sky"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[12px] font-semibold text-slate-900">
                      {item.actor.nickname}
                      <span className="ml-1 text-slate-600">
                        {item.kind === "like"
                          ? t("赞了你", "liked you")
                          : item.kind === "comment"
                            ? t("评论了你", "commented")
                            : item.kind === "reply"
                              ? t("回复了你", "replied")
                              : t("提到了你", "mentioned")}
                      </span>
                    </div>
                    <div className="shrink-0 text-[10px] text-slate-400">
                      {formatTime(item.createdAt, locale)}
                    </div>
                  </div>
                  {item.preview.comment || item.preview.moment ? (
                    <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600">
                      {item.preview.comment ?? item.preview.moment}
                    </div>
                  ) : null}
                </div>
              </button>
            ))}

            {notifications.length === 0 && !notificationsLoading ? (
              <EmptyState
                icon={<Bell className="h-5 w-5" />}
                title={t("暂无通知", "No notifications")}
                description={t("有人点赞或评论你时会出现在这里。", "Likes and comments will appear here.")}
              />
            ) : null}

            {notificationsLoading ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500">
                {t("加载中…", "Loading…")}
              </div>
            ) : null}

            {notificationsCursor ? (
              <button
                type="button"
                onClick={() => loadNotifications()}
                className="mt-1 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                {t("加载更多", "Load more")}
              </button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {contactsView === "contacts" ? (
        <>
          <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-soft backdrop-blur">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={contactsSearchQuery}
                onChange={(event) => setContactsSearchQuery(event.target.value)}
                aria-label={t("搜索群聊或好友", "Search groups or friends")}
                inputMode="search"
                placeholder={t("搜索群聊或好友", "Search groups or friends")}
                className="h-9 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-0"
              />
              {contactsSearchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setContactsSearchQuery("")}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                  aria-label={t("清除搜索", "Clear search")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title={t("我的群聊", "My Groups")} hint={`${filteredGroupConversations.length} ${t("个", "")}`} />
              <button
                type="button"
                onClick={() => setContactsGroupExpanded((previous) => !previous)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                {contactsGroupExpanded ? t("收起", "Collapse") : t("展开", "Expand")}
                <ChevronRight className={cn("h-3.5 w-3.5 transition", contactsGroupExpanded ? "rotate-90" : "")} />
              </button>
            </div>
            {contactsGroupExpanded && (
              <div className="mt-1.5 space-y-1">
                {filteredGroupConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => openConversation(conversation)}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                  >
                    <Avatar label={conversation.title} image={null} tone="emerald" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{conversation.title}</div>
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
                        <span>
                          {t("群号", "Code")} • {conversation.inviteCode ?? "-"}
                        </span>
                      </div>
                    </div>
                    {conversation.inviteCode ? (
                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          void navigator.clipboard
                            .writeText(conversation.inviteCode ?? "")
                            .then(() =>
                              flashStatus(
                                t(
                                  `已复制群号：${conversation.inviteCode}`,
                                  `Copied code: ${conversation.inviteCode}`
                                )
                              )
                            );
                        }}
                        className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-jade/30 hover:text-jade-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                        aria-label={t("复制群号", "Copy code")}
                        role="button"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                    {conversation.unreadCount > 0 && (
                      <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {filteredGroupConversations.length === 0 && (
                  <EmptyState
                    icon={<Users className="h-5 w-5" />}
                    title={t("暂无匹配群聊", "No matching groups")}
                    description={t(
                      "可试试搜索群名、群号，或通过创建/加入扩展关系。",
                      "Try searching group name/code, or create/join a new one."
                    )}
                  />
                )}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title={t("好友", "Friends")} hint={`${filteredFriends.length} ${t("位", "")}`} />
              <button
                type="button"
                onClick={() => setContactsFriendExpanded((previous) => !previous)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                {contactsFriendExpanded ? t("收起", "Collapse") : t("展开", "Expand")}
                <ChevronRight className={cn("h-3.5 w-3.5 transition", contactsFriendExpanded ? "rotate-90" : "")} />
              </button>
            </div>
            {contactsFriendExpanded && (
              <div className="mt-1.5 space-y-1">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => startDm(friend.id)}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                  >
                    <Avatar label={friend.nickname} image={friend.avatarUrl} tone="emerald" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-slate-900">{friend.nickname}</div>
                      <div className="truncate text-[11px] text-slate-500">{friend.primaryWalletAddress}</div>
                    </div>
                  </button>
                ))}
                {filteredFriends.length === 0 && (
                  <EmptyState
                    icon={<UserRound className="h-5 w-5" />}
                    title={t("暂无匹配好友", "No matching friends")}
                    description={t(
                      "试试昵称或钱包地址关键词，也可以去发现页拓展关系。",
                      "Try nickname/wallet keywords, or explore Discover for more contacts."
                    )}
                  />
                )}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

