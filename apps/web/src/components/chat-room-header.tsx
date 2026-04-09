"use client";

import React from "react";
import { Check, ChevronLeft } from "lucide-react";

export function ChatRoomHeader({
  t,
  conversation,
  isConciergeDm,
  onBack,
  groupManageOpen,
  setGroupManageOpen
}: {
  t: (zh: string, en: string) => string;
  conversation: { title: string; kind: "group" | "dm" };
  isConciergeDm: boolean;
  onBack: () => void;
  groupManageOpen: boolean;
  setGroupManageOpen: (next: boolean) => void;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/70 px-3 py-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("返回", "Back")}
      </button>
      <div className="text-center">
        <div className="font-[var(--font-display)] text-xl font-bold tracking-[-0.04em] text-slate-950">
          {conversation.title}
        </div>
        {isConciergeDm ? (
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            <Check className="h-3 w-3" />
            {t("官方智能助手", "AI Concierge")}
          </div>
        ) : (
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {conversation.kind === "group" ? t("群聊", "Group") : t("私聊", "Direct")}
          </div>
        )}
      </div>
      {conversation.kind === "group" ? (
        <button
          type="button"
          onClick={() => setGroupManageOpen(!groupManageOpen)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-soft"
        >
          {t("群管理", "Manage")}
        </button>
      ) : (
        <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-xs font-bold text-slate-700 shadow-soft">
          N
          <span className="absolute -right-0.5 bottom-0 h-2.5 w-2.5 rounded-full border border-white bg-jade" />
        </div>
      )}
    </header>
  );
}

