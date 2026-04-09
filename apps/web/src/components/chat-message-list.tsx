"use client";

import React from "react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";

type TFn = (zh: string, en: string) => string;

export function ChatMessageList({
  t,
  conversationKind,
  messages,
  members,
  isConciergeDm,
  formatMessageTime,
  sendQuickReply,
  onOpenMemberActions,
  messageEndRef
}: {
  t: TFn;
  conversationKind: "group" | "dm";
  messages: any[];
  members: any[];
  isConciergeDm: boolean;
  formatMessageTime: (value: string) => string;
  sendQuickReply: (text: string) => void;
  onOpenMemberActions: (member: any) => void;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      {conversationKind === "group" && messages.length === 0 ? (
        <div className="flex justify-center py-10">
          <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-500">
            {t("还没有消息，打个招呼吧", "No messages yet. Say hello.")}
          </div>
        </div>
      ) : (
        messages.map((message, index) => (
          <div key={message.id} className={cn("flex gap-2.5", message.mine ? "justify-end" : "justify-start")}>
            {!message.mine && (
              <button
                type="button"
                onClick={() => {
                  const member = members.find((item) => item.id === message.sender.id);
                  if (!member) return;
                  onOpenMemberActions(member);
                }}
                className="cursor-pointer"
                aria-label={`查看成员 ${message.sender.nickname} 操作`}
              >
                <Avatar label={message.sender.nickname} image={message.sender.avatarUrl} tone="emerald" size="sm" />
              </button>
            )}
            <div className={cn("max-w-[80%]", message.mine ? "order-first" : "")}>
              {!message.mine && <div className="mb-1 px-1 text-[11px] text-slate-400">{message.sender.nickname}</div>}
              <div
                className={cn(
                  "rounded-[20px] px-3 py-2 text-[14px] leading-snug shadow-soft motion-safe:animate-[message-pop_220ms_ease-out]",
                  message.mine
                    ? "bg-[linear-gradient(180deg,#33ea98_0%,#1dcc7b_56%,#14b66b_100%)] text-[#08341f]"
                    : "border border-sky-100 bg-white/92 text-slate-700"
                )}
              >
                {message.content}
              </div>
              <div className={cn("mt-1 px-1 text-[10px] text-slate-400", message.mine ? "text-right" : "")}>
                {formatMessageTime(message.createdAt)}
              </div>
              {message.mentionUserIds.length > 0 && (
                <div className="mt-1 px-1 text-[11px] text-sky-600">
                  {t("提及", "Mentioned")} {message.mentionUserIds.length} {t("人", "users")}
                </div>
              )}
              {isConciergeDm && !message.mine && index === 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => sendQuickReply(t("好的，我现在完善资料", "Okay, I'll complete my profile now"))}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    {t("好的，我现在完善资料", "Complete profile now")}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendQuickReply(t("先看看 Lounge 有什么", "Show me Lounge first"))}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    {t("先看看 Lounge", "Explore Lounge")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}
      <div ref={messageEndRef} />
    </>
  );
}

