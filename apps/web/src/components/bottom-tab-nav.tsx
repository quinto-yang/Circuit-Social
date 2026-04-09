"use client";

import React from "react";
import { MessageCircle, Search, UserRound, Users } from "lucide-react";

import type { ConversationSummary, TabKey } from "@/lib/types";

import { TabButton } from "@/components/tab-button";

type TFn = (zh: string, en: string) => string;

export function BottomTabNav({
  tab,
  t,
  conversations,
  incomingRequestCount,
  unreadNotifications,
  onChangeTab,
  onOpenDiscover,
  onOpenMe
}: {
  tab: TabKey;
  t: TFn;
  conversations: ConversationSummary[];
  incomingRequestCount: number;
  unreadNotifications: number;
  onChangeTab: (next: TabKey) => void;
  onOpenDiscover: () => void;
  onOpenMe: () => void;
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/90 px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        <TabButton
          active={tab === "chats"}
          label={t("聊天", "Chats")}
          dot={conversations.some((conversation) => conversation.unreadCount > 0)}
          icon={<MessageCircle className="h-4 w-4" />}
          onClick={() => onChangeTab("chats")}
        />
        <TabButton
          active={tab === "contacts"}
          label={t("通讯录", "Contacts")}
          badge={incomingRequestCount || undefined}
          dot={unreadNotifications > 0}
          icon={<Users className="h-4 w-4" />}
          onClick={() => onChangeTab("contacts")}
        />
        <TabButton
          active={tab === "discover"}
          label={t("发现", "Discover")}
          icon={<Search className="h-4 w-4" />}
          onClick={onOpenDiscover}
        />
        <TabButton
          active={tab === "me"}
          label={t("我的", "Me")}
          icon={<UserRound className="h-4 w-4" />}
          onClick={onOpenMe}
        />
      </div>
    </nav>
  );
}

