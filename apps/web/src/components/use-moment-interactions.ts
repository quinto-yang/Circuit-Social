import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { MomentView } from "@/lib/types";

type UseMomentInteractionsArgs<THotConfig> = {
  setMoments: Dispatch<SetStateAction<MomentView[]>>;
  loadPointsAndTasks: () => Promise<void>;
  shouldLoadDiscoverHot: (hot: THotConfig) => boolean;
  discoverHotConfig: THotConfig;
  loadDiscoverHot: () => Promise<void>;
  loadMomentComments: (momentId: number) => Promise<void>;
  setStatus: Dispatch<SetStateAction<string>>;
  t: (zh: string, en: string) => string;
};

export function useMomentInteractions<THotConfig>({
  setMoments,
  loadPointsAndTasks,
  shouldLoadDiscoverHot,
  discoverHotConfig,
  loadDiscoverHot,
  loadMomentComments,
  setStatus,
  t
}: UseMomentInteractionsArgs<THotConfig>) {
  const reportMoment = useCallback(
    async (momentId: number) => {
      const reason = window.prompt("举报原因", "垃圾信息");
      if (!reason) return;
      try {
        await api.post("/reports", {
          kind: "moment",
          targetId: momentId,
          reason
        });
        setStatus("举报已提交");
      } catch (error) {
        setStatus(mapApiError(error, "举报失败"));
      }
    },
    [setStatus]
  );

  const toggleMomentLike = useCallback(
    async (momentId: number) => {
      try {
        const result = await api.post<{ liked: boolean; count: number }>(`/moments/${momentId}/likes`, {});
        setMoments((previous) =>
          previous.map((moment) =>
            moment.id === momentId ? { ...moment, likedByMe: result.liked, likeCount: result.count } : moment
          )
        );
        void loadPointsAndTasks();
        if (shouldLoadDiscoverHot(discoverHotConfig)) {
          void loadDiscoverHot();
        }
      } catch (error) {
        setStatus(mapApiError(error, t("点赞失败", "Like failed")));
      }
    },
    [discoverHotConfig, loadDiscoverHot, loadPointsAndTasks, setMoments, setStatus, shouldLoadDiscoverHot, t]
  );

  const toggleMomentCommentLike = useCallback(
    async (momentId: number, commentId: number) => {
      try {
        await api.post(`/moments/${momentId}/comments/${commentId}/likes`, {});
        void loadMomentComments(momentId);
        void loadPointsAndTasks();
      } catch (error) {
        setStatus(mapApiError(error, t("评论点赞失败", "Comment like failed")));
      }
    },
    [loadMomentComments, loadPointsAndTasks, setStatus, t]
  );

  const toggleMomentCommentPin = useCallback(
    async (momentId: number, commentId: number) => {
      try {
        await api.post(`/moments/${momentId}/comments/${commentId}/pin`, {});
        void loadMomentComments(momentId);
      } catch (error) {
        setStatus(mapApiError(error, t("置顶失败", "Pin failed")));
      }
    },
    [loadMomentComments, setStatus, t]
  );

  return {
    reportMoment,
    toggleMomentLike,
    toggleMomentCommentLike,
    toggleMomentCommentPin
  };
}

