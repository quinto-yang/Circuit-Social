"use client";

import React from "react";
import { CirclePlus } from "lucide-react";

import type { TabKey } from "@/lib/types";

export function TopBar({
  tab,
  requestCount,
  onOpenMenu,
  locale,
  onToggleLocale
}: {
  tab: TabKey;
  requestCount: number;
  onOpenMenu: () => void;
  locale: "zh" | "en";
  onToggleLocale: () => void;
}) {
  const t = (zh: string, en: string) => (locale === "en" ? en : zh);
  const titleMap: Record<TabKey, string> = {
    chats: t("聊天", "Chats"),
    contacts: t("通讯录", "Contacts"),
    discover: t("发现", "Discover"),
    me: t("我的", "Me")
  };

  return (
    <header className="relative z-10 flex items-center justify-between border-b border-white/70 px-3 py-1.5">
      <div className="min-w-0">
        <div className="font-[var(--font-display)] text-[20px] font-bold tracking-[-0.05em] text-slate-950">
          {titleMap[tab]}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {tab === "contacts" ? (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("打开通讯录动作", "Open contacts menu")}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-soft transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
          >
            <CirclePlus className="h-4 w-4" />
            {requestCount > 0 && (
              <span className="absolute right-0 top-0 inline-flex min-w-5 items-center justify-center rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {requestCount}
              </span>
            )}
          </button>
        ) : (
          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/70 bg-white/80 px-2.5 text-[11px] font-medium text-slate-500 shadow-soft">
            {tab === "discover" ? "Moments" : "EVM"}
          </div>
        )}
        <button
          type="button"
          onClick={onToggleLocale}
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/70 bg-white/90 px-2.5 text-[11px] font-semibold text-slate-600 shadow-soft transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
        >
          {locale === "zh" ? "EN" : "中"}
        </button>
      </div>
    </header>
  );
}

