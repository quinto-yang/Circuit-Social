"use client";

import { MessageCircle, Search, X } from "lucide-react";
import React from "react";

import { AdBanner } from "@/components/ui/ad-banner";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HeroCard } from "@/components/ui/hero-card";
import { SectionTitle } from "@/components/ui/section-title";

type TFn = (zh: string, en: string) => string;

export function ChatsTab({
  t,
  sitePublic,
  chatsNotesHidden,
  setChatsNotesHidden,
  chatSearchQuery,
  setChatSearchQuery,
  filteredConversations,
  openConversation,
  cn
}: {
  t: TFn;
  sitePublic: any;
  chatsNotesHidden: boolean;
  setChatsNotesHidden: (next: boolean) => void;
  chatSearchQuery: string;
  setChatSearchQuery: (next: string) => void;
  filteredConversations: any[];
  openConversation: (conversation: any) => void;
  cn: (...parts: Array<string | false | null | undefined>) => string;
}) {
  return (
    <div className="space-y-2.5 pb-6 pt-2">
      {!chatsNotesHidden ? (
        <HeroCard
          title="Secure social, signed in public"
          description={t(
            "钱包登录只负责证明身份，真正留住用户的是会话、关系和社区归属。",
            "Wallet sign-in proves identity; conversations and communities keep users."
          )}
          compact
          onClose={() => {
            setChatsNotesHidden(true);
            try {
              window.localStorage.setItem("cx_notes_chats_hidden", "1");
            } catch {
              // ignore
            }
          }}
        />
      ) : null}

      <div className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2 shadow-soft backdrop-blur">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={chatSearchQuery}
            onChange={(event) => setChatSearchQuery(event.target.value)}
            aria-label={t("搜索会话或消息", "Search conversations or messages")}
            inputMode="search"
            placeholder={t("搜索会话或消息...", "Search conversations...")}
            className="h-9 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 caret-slate-800 outline-none focus-visible:outline-none focus-visible:ring-0"
          />
          {chatSearchQuery.trim() ? (
            <button
              type="button"
              onClick={() => setChatSearchQuery("")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              aria-label={t("清除搜索", "Clear search")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {sitePublic.adsEnabled && (
        <AdBanner
          slot="chats-top"
          title={t(sitePublic.banners["chats-top"].titleZh, sitePublic.banners["chats-top"].titleEn)}
          description={t(sitePublic.banners["chats-top"].descriptionZh, sitePublic.banners["chats-top"].descriptionEn)}
          compact
        />
      )}

      <Card>
        <SectionTitle title={t("会话", "Conversations")} hint={`${filteredConversations.length} ${t("个会话", "conversations")}`} />
        <div className="mt-2 space-y-2">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => openConversation(conversation)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-jade/20",
                conversation.kind === "group" ? "bg-emerald-50/55 hover:bg-emerald-50" : "bg-slate-50 hover:bg-white"
              )}
            >
              <Avatar
                label={conversation.title}
                image={null}
                tone={conversation.kind === "group" ? "emerald" : "sky"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-[13px] font-semibold text-slate-900">{conversation.title}</div>
                  <div className="flex items-center gap-2">
                    {conversation.kind === "group" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        群
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-coral px-2 py-0.5 text-[10px] font-semibold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">
                  {conversation.lastMessage
                    ? `${conversation.lastMessage.senderNickname}: ${conversation.lastMessage.content}`
                    : conversation.kind === "group"
                      ? `${t("群号", "Code")} ${conversation.inviteCode ?? "-"}`
                      : t("点击开始聊天", "Tap to start chat")}
                </div>
              </div>
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <EmptyState
              icon={<MessageCircle className="h-5 w-5" />}
              title={t("没有匹配的会话", "No matches")}
              description={t("试试换个关键词，或清空搜索。", "Try another keyword or clear search.")}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

