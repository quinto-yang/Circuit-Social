import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { NotificationItem, SessionUserPayload } from "@/lib/types";

type UseNotificationsArgs = {
  session: SessionUserPayload | null | undefined;
  t: (zh: string, en: string) => string;
  setStatus: (message: string) => void;
};

export function useNotifications({ session, t, setStatus }: UseNotificationsArgs) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsCursor, setNotificationsCursor] = useState<string | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const loadNotifications = useCallback(
    async (options?: { reset?: boolean }) => {
      if (!session) return;
      if (notificationsLoading) return;
      setNotificationsLoading(true);
      try {
        const cursor = options?.reset ? null : notificationsCursor;
        const qs = new URLSearchParams();
        qs.set("limit", "20");
        if (cursor) qs.set("cursor", cursor);
        const result = await api.get<{ ok: true; items: NotificationItem[]; nextCursor: string | null }>(
          `/notifications?${qs.toString()}`
        );
        setNotifications((previous) => {
          if (options?.reset) return result.items;
          const seen = new Set(previous.map((item) => item.id));
          return [...previous, ...result.items.filter((item) => !seen.has(item.id))];
        });
        setNotificationsCursor(result.nextCursor);
      } catch (error) {
        setStatus(mapApiError(error, t("加载通知失败", "Failed to load notifications")));
      } finally {
        setNotificationsLoading(false);
      }
    },
    [notificationsCursor, notificationsLoading, session, setStatus, t]
  );

  const refreshUnreadNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const result = await api.get<{ ok: true; count: number }>("/notifications/unread-count");
      setUnreadNotifications(result.count ?? 0);
    } catch {
      // ignore
    }
  }, [session]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.post("/notifications/mark-read", { all: true });
      setUnreadNotifications(0);
    } catch (error) {
      setStatus(mapApiError(error, t("标记已读失败", "Failed to mark notifications as read")));
    }
  }, [setStatus, t]);

  const resetNotifications = useCallback(() => {
    setUnreadNotifications(0);
    setNotifications([]);
    setNotificationsCursor(null);
    setNotificationsLoading(false);
  }, []);

  const incrementUnreadNotifications = useCallback(() => {
    setUnreadNotifications((previous) => previous + 1);
  }, []);

  return {
    unreadNotifications,
    notifications,
    notificationsCursor,
    notificationsLoading,
    loadNotifications,
    refreshUnreadNotifications,
    markAllNotificationsRead,
    resetNotifications,
    incrementUnreadNotifications
  };
}

