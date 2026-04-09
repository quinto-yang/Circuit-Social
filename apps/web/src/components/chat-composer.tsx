"use client";

import React from "react";
import { Check, Send } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";

type TFn = (zh: string, en: string) => string;

export function ChatComposer({
  t,
  conversationKind,
  encryptionEnabled,
  encryptionFallback,
  isConciergeDm,
  draft,
  setDraft,
  onSend,
  busy,
  canSend,
  emojiOpen,
  setEmojiOpen,
  autoScrollLocked,
  scrollToLatestMessage,
  mentionCandidates,
  insertMention,
  shortAddress,
  emojiList
}: {
  t: TFn;
  conversationKind: "group" | "dm";
  encryptionEnabled: boolean;
  encryptionFallback: boolean;
  isConciergeDm: boolean;
  draft: string;
  setDraft: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  canSend: boolean;
  emojiOpen: boolean;
  setEmojiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  autoScrollLocked: boolean;
  scrollToLatestMessage: () => void;
  mentionCandidates: any[];
  insertMention: (member: any) => void;
  shortAddress: (value: string) => string;
  emojiList: string[];
}) {
  return (
    <div className="border-t border-white/70 px-3 py-2.5">
      {encryptionEnabled && (
        <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {t("已启用端到端加密聊天", "End-to-end encryption enabled")}
        </div>
      )}
      {encryptionFallback && (
        <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t(
            "当前会话部分成员未启用加密，消息以普通模式发送。",
            "Some members have no encryption key. Messages are sent in plaintext."
          )}
        </div>
      )}
      {isConciergeDm && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDraft(t("我现在去完善资料", "I'll complete my profile now"))}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {t("完善资料", "Complete profile")}
          </button>
          <button
            type="button"
            onClick={() => setDraft(t("先看看 Lounge 有什么", "Show me Lounge first"))}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {t("探索 Lounge", "Explore Lounge")}
          </button>
          <button
            type="button"
            onClick={() => setDraft(t("查看我的身份信息", "Show my identity details"))}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
          >
            {t("查看我的身份", "View my identity")}
          </button>
        </div>
      )}
      <div className="flex items-end gap-2.5">
        <button
          type="button"
          onClick={() => setEmojiOpen((previous) => !previous)}
          aria-label={t("打开表情面板", "Open emoji panel")}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-soft"
        >
          😊
        </button>
        <div className="relative flex-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => {
              window.setTimeout(() => {
                if (!autoScrollLocked) scrollToLatestMessage();
              }, 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={
              conversationKind === "group"
                ? t("发送消息，输入 @ 提及群友", "Type message, @ to mention")
                : t("向 Circuit Concierge 发送消息...", "Message Circuit Concierge...")
            }
            className="h-12 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 text-[16px] text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none transition focus:scale-[1.01] focus:border-jade/50 focus:bg-white sm:text-[14px]"
          />
          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-14 left-0 right-0 z-20 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
              {mentionCandidates.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                >
                  <Avatar label={member.nickname} image={member.avatarUrl} tone="emerald" size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{member.nickname}</div>
                    <div className="truncate text-[11px] text-slate-500">{shortAddress(member.primaryWalletAddress)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {emojiOpen && (
            <div className="absolute bottom-14 left-0 z-20 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
              <div className="grid grid-cols-6 gap-1">
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setDraft(`${draft}${emoji}`)}
                    className="rounded-lg px-1 py-1 text-lg transition hover:bg-slate-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!canSend) return;
            onSend();
          }}
          aria-label={t("发送消息", "Send message")}
          disabled={!canSend}
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[#08341f] shadow-[0_12px_24px_rgba(18,199,118,0.24)] transition",
            canSend
              ? "bg-[linear-gradient(180deg,#33ea98_0%,#1dcc7b_56%,#14b66b_100%)] active:scale-[0.96]"
              : "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none"
          )}
        >
          {busy ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

