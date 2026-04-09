import { useCallback, type Dispatch, type SetStateAction } from "react";

import { api } from "@/lib/api";
import { mapApiError } from "@/lib/api-error";
import type { MomentCommentView } from "@/lib/types";

type MomentReplyTarget = {
  commentId: number;
  nickname: string;
};

type UseMomentCommentsArgs = {
  momentCommentDrafts: Record<number, string>;
  momentReplyTargets: Record<number, MomentReplyTarget | null>;
  setMomentCommentsLoading: Dispatch<SetStateAction<Record<number, boolean>>>;
  setMomentComments: Dispatch<SetStateAction<Record<number, MomentCommentView[]>>>;
  setBusy: Dispatch<SetStateAction<string | null>>;
  setMomentCommentDrafts: Dispatch<SetStateAction<Record<number, string>>>;
  setMomentReplyTargets: Dispatch<SetStateAction<Record<number, MomentReplyTarget | null>>>;
  setExpandedMomentComments: Dispatch<SetStateAction<Record<number, boolean>>>;
  setStatus: Dispatch<SetStateAction<string>>;
  t: (zh: string, en: string) => string;
};

export function useMomentComments({
  momentCommentDrafts,
  momentReplyTargets,
  setMomentCommentsLoading,
  setMomentComments,
  setBusy,
  setMomentCommentDrafts,
  setMomentReplyTargets,
  setExpandedMomentComments,
  setStatus,
  t
}: UseMomentCommentsArgs) {
  const loadMomentComments = useCallback(
    async (momentId: number) => {
      setMomentCommentsLoading((previous) => ({ ...previous, [momentId]: true }));
      try {
        const result = await api.get<{ comments: MomentCommentView[] }>(`/moments/${momentId}/comments`);
        setMomentComments((previous) => ({ ...previous, [momentId]: result.comments }));
      } catch (error) {
        setStatus(mapApiError(error, t("加载评论失败", "Failed to load comments")));
      } finally {
        setMomentCommentsLoading((previous) => ({ ...previous, [momentId]: false }));
      }
    },
    [setMomentComments, setMomentCommentsLoading, setStatus, t]
  );

  const submitMomentComment = useCallback(
    async (momentId: number) => {
      const content = (momentCommentDrafts[momentId] ?? "").trim();
      if (!content) return;
      const replyTarget = momentReplyTargets[momentId];
      setBusy(`moment-comment-${momentId}`);
      try {
        const result = await api.post<{ comments: MomentCommentView[] }>(`/moments/${momentId}/comments`, {
          content,
          parentCommentId: replyTarget?.commentId ?? null
        });
        setMomentComments((previous) => ({ ...previous, [momentId]: result.comments }));
        setMomentCommentDrafts((previous) => ({ ...previous, [momentId]: "" }));
        setMomentReplyTargets((previous) => ({ ...previous, [momentId]: null }));
        setExpandedMomentComments((previous) => ({ ...previous, [momentId]: true }));
      } catch (error) {
        setStatus(mapApiError(error, t("评论失败", "Comment failed")));
      } finally {
        setBusy(null);
      }
    },
    [
      momentCommentDrafts,
      momentReplyTargets,
      setBusy,
      setExpandedMomentComments,
      setMomentCommentDrafts,
      setMomentComments,
      setMomentReplyTargets,
      setStatus,
      t
    ]
  );

  const deleteMomentComment = useCallback(
    async (momentId: number, commentId: number) => {
      setBusy(`moment-comment-delete-${commentId}`);
      try {
        const result = await api.delete<{ comments: MomentCommentView[] }>(
          `/moments/${momentId}/comments/${commentId}`
        );
        setMomentComments((previous) => ({ ...previous, [momentId]: result.comments }));
      } catch (error) {
        setStatus(mapApiError(error, t("删除评论失败", "Delete comment failed")));
      } finally {
        setBusy(null);
      }
    },
    [setBusy, setMomentComments, setStatus, t]
  );

  return { loadMomentComments, submitMomentComment, deleteMomentComment };
}

