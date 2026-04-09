"use client";

import React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/components/ui/cn";

export function ChatOverlays({
  t,
  showJumpToBottom,
  pendingNewMessageCount,
  onJumpToBottom,
  mentions,
  members
}: {
  t: (zh: string, en: string) => string;
  showJumpToBottom: boolean;
  pendingNewMessageCount: number;
  onJumpToBottom: () => void;
  mentions: number[];
  members: Array<{ id: number; nickname: string }>;
}) {
  return (
    <>
      {showJumpToBottom ? (
        <button
          type="button"
          onClick={onJumpToBottom}
          className={cn(
            "absolute bottom-[94px] right-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-soft backdrop-blur transition",
            pendingNewMessageCount > 0 && "motion-safe:animate-[jump-hint_1.8s_ease-in-out_infinite]"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          {pendingNewMessageCount > 0
            ? t(`${pendingNewMessageCount} 条新消息`, `${pendingNewMessageCount} new`)
            : t("回到底部", "Latest")}
        </button>
      ) : null}

      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-white/60 px-3 py-2 text-xs text-slate-600">
          {members
            .filter((member) => mentions.includes(member.id))
            .map((member) => (
              <span key={member.id} className="rounded-full bg-sky px-3 py-1 font-medium text-slate-700">
                @{member.nickname}
              </span>
            ))}
        </div>
      )}
    </>
  );
}

