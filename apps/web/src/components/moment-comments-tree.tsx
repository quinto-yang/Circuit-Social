import type { MomentCommentView } from "@/lib/types";

type MomentCommentsTreeProps = {
  items: MomentCommentView[];
  locale: "zh" | "en";
  onReply: (comment: MomentCommentView) => void;
  onDelete: (commentId: number) => void;
  onLike: (commentId: number) => void;
  onPin: (commentId: number) => void;
  canPin: boolean;
  deletingCommentId: number | null;
  depth?: number;
};

export function MomentCommentsTree({
  items,
  locale,
  onReply,
  onDelete,
  onLike,
  onPin,
  canPin,
  deletingCommentId,
  depth = 0
}: MomentCommentsTreeProps) {
  function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500">
        {locale === "en" ? "No comments yet" : "还没有评论"}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((comment) => (
        <div
          key={comment.id}
          className={cn("rounded-xl border border-slate-200 bg-white px-2.5 py-2", depth > 0 ? "ml-4" : "")}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5">
                <div className="text-[12px] font-semibold text-slate-800">{comment.author.nickname}</div>
                {comment.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {/* 置顶徽标 */}
                    <span>📌</span>
                    {locale === "en" ? "Pinned" : "置顶"}
                  </span>
                ) : null}
              </div>
              <div className="text-[10px] text-slate-400">{comment.createdAt}</div>
            </div>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onLike(comment.id)}
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
                  comment.likedByMe
                    ? "border-jade/30 bg-jade/10 text-jade-deep"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                )}
              >
                <span className={cn("h-3 w-3", comment.likedByMe ? "text-jade-deep" : "text-slate-500")}>♥</span>
              </button>
              {canPin && depth === 0 ? (
                <button
                  type="button"
                  onClick={() => onPin(comment.id)}
                  className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                >
                  📌
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onReply(comment)}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                ↩
              </button>
              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="inline-flex items-center justify-center rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-medium text-coral transition hover:bg-coral/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40"
                >
                  {deletingCommentId === comment.id
                    ? locale === "en"
                      ? "Deleting..."
                      : "删除中..."
                    : locale === "en"
                      ? "Delete"
                      : "删除"}
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-5 text-slate-700">{comment.content}</p>
          {comment.replies.length > 0 ? (
            <div className="mt-1.5">
              <MomentCommentsTree
                items={comment.replies}
                locale={locale}
                onReply={onReply}
                onDelete={onDelete}
                onLike={onLike}
                onPin={onPin}
                canPin={canPin}
                deletingCommentId={deletingCommentId}
                depth={depth + 1}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

