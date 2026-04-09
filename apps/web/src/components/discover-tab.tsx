"use client";

import { ChevronRight, CirclePlus, Heart, ImagePlus, MessageCircle, Send, Sparkles, Users, X } from "lucide-react";
import React from "react";

import type { DiscoverHotGroupRow, MomentCommentView, MomentView, UploadAsset } from "@/lib/types";

import { MomentCommentsTree } from "@/components/moment-comments-tree";
import { AdBanner } from "@/components/ui/ad-banner";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section-title";

type TFn = (zh: string, en: string) => string;

export function DiscoverTab({
  locale,
  t,
  sitePublic,
  discoverView,
  setDiscoverView,
  todayMomentsCount,
  discoverHotLoading,
  discoverHot,
  isDiscoverHotBoardVisible,
  openHotGroupFromDiscover,
  momentsLoading,
  moments,
  momentDraft,
  setMomentDraft,
  momentNotice,
  setMomentNotice,
  momentFiles,
  setMomentFiles,
  enqueueMomentUploads,
  publishMoment,
  busy,
  formatTime,
  buildAssetUrl,
  reportMoment,
  toggleMomentLike,
  expandedMomentComments,
  setExpandedMomentComments,
  momentComments,
  momentCommentsLoading,
  loadMomentComments,
  countMomentComments,
  momentReplyTargets,
  setMomentReplyTargets,
  momentCommentDrafts,
  setMomentCommentDrafts,
  submitMomentComment,
  deleteMomentComment,
  toggleMomentCommentLike,
  toggleMomentCommentPin,
  onAddAuthorAsFriend,
  cn
}: {
  locale: "zh" | "en";
  t: TFn;
  sitePublic: any;
  discoverView: "menu" | "moments";
  setDiscoverView: (next: "menu" | "moments") => void;
  todayMomentsCount: number;
  discoverHotLoading: boolean;
  discoverHot: any;
  isDiscoverHotBoardVisible: (value: any) => boolean;
  openHotGroupFromDiscover: (groupId: number) => Promise<void> | void;
  momentsLoading: boolean;
  moments: MomentView[];
  momentDraft: string;
  setMomentDraft: (next: string) => void;
  momentNotice: string;
  setMomentNotice: (next: string) => void;
  momentFiles: any[];
  setMomentFiles: React.Dispatch<React.SetStateAction<any[]>>;
  enqueueMomentUploads: (files: File[]) => void;
  publishMoment: () => Promise<void> | void;
  busy: string;
  formatTime: (value: string, locale: "zh" | "en") => string;
  buildAssetUrl: (value: string | null) => string | null;
  reportMoment: (momentId: number) => Promise<void> | void;
  toggleMomentLike: (momentId: number) => Promise<void> | void;
  expandedMomentComments: Record<number, boolean>;
  setExpandedMomentComments: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  momentComments: Record<number, MomentCommentView[] | undefined>;
  momentCommentsLoading: Record<number, boolean | undefined>;
  loadMomentComments: (momentId: number) => Promise<void> | void;
  countMomentComments: (items: MomentCommentView[]) => number;
  momentReplyTargets: Record<number, { commentId: number; nickname: string } | null>;
  setMomentReplyTargets: React.Dispatch<React.SetStateAction<Record<number, { commentId: number; nickname: string } | null>>>;
  momentCommentDrafts: Record<number, string>;
  setMomentCommentDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  submitMomentComment: (momentId: number) => Promise<void> | void;
  deleteMomentComment: (momentId: number, commentId: number) => Promise<void> | void;
  toggleMomentCommentLike: (momentId: number, commentId: number) => Promise<void> | void;
  toggleMomentCommentPin: (momentId: number, commentId: number) => Promise<void> | void;
  onAddAuthorAsFriend: (authorId: number) => void;
  cn: (...parts: Array<string | false | null | undefined>) => string;
}) {
  return (
    <div className="space-y-2.5 pb-6 pt-2">
      {discoverView === "menu" ? (
        <>
          {sitePublic.adsEnabled && (
            <AdBanner
              slot="discover-menu-top"
              title={t(sitePublic.banners["discover-menu-top"].titleZh, sitePublic.banners["discover-menu-top"].titleEn)}
              description={t(
                sitePublic.banners["discover-menu-top"].descriptionZh,
                sitePublic.banners["discover-menu-top"].descriptionEn
              )}
            />
          )}
          <Card>
            <button
              type="button"
              onClick={() => setDiscoverView("moments")}
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#123447_42%,#14532d_100%)] p-3 text-left text-white shadow-soft transition hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/90">
                    {t("今日发现", "Discover today")}
                  </div>
                  <div className="mt-1 text-lg font-bold tracking-[-0.03em]">{t("朋友圈", "Moments")}</div>
                  <div className="mt-1 text-xs text-white/80">
                    {t("查看与发布链上动态", "View and publish on-chain updates")}
                  </div>
                </div>
                <div className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  {t(`今日 ${todayMomentsCount} 条新动态`, `${todayMomentsCount} new today`)}
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90">
                {t("立即查看", "Open now")}
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          </Card>

          {isDiscoverHotBoardVisible(sitePublic.discover.hot) ? (
            <Card>
              <SectionTitle
                title={t(sitePublic.discover.hot.titleZh, sitePublic.discover.hot.titleEn)}
                hint={
                  discoverHotLoading ? t("更新中", "Refreshing") : t(sitePublic.discover.hot.hintZh, sitePublic.discover.hot.hintEn)
                }
              />
              <div className="mt-2 space-y-2">
                {sitePublic.discover.hot.moments.enabled ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {t(sitePublic.discover.hot.moments.titleZh, sitePublic.discover.hot.moments.titleEn)}
                    </div>
                    {discoverHot?.hotMoments?.length ? (
                      <div className="space-y-2">
                        {discoverHot.hotMoments
                          .slice(0, sitePublic.discover.hot.moments.limit)
                          .map((item: any) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setDiscoverView("moments")}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-jade/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-800">
                                    {item.moment.author.nickname}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{item.moment.content}</div>
                                </div>
                                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  {item.score}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
                        {t("暂无热帖，先多互动几次试试。", "No hot moments yet. Interact to generate rankings.")}
                      </div>
                    )}
                  </div>
                ) : null}

                {sitePublic.discover.hot.groups.enabled ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {t(sitePublic.discover.hot.groups.titleZh, sitePublic.discover.hot.groups.titleEn)}
                    </div>
                    {discoverHot?.hotGroups?.length ? (
                      <div className="space-y-2">
                        {discoverHot.hotGroups
                          .slice(0, sitePublic.discover.hot.groups.limit)
                          .map((item: DiscoverHotGroupRow) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => void openHotGroupFromDiscover(item.group.id)}
                              className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-jade/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                  <span className="text-xs font-semibold text-slate-800">{item.group.title}</span>
                                </div>
                                <div className="mt-1 line-clamp-2 text-[10px] text-slate-500">{item.reason}</div>
                              </div>
                              <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                {item.score}
                              </span>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
                        {t("暂无热群数据。", "No hot groups in this window yet.")}
                      </div>
                    )}
                  </div>
                ) : null}

                {sitePublic.discover.hot.recommendedUsers.enabled && discoverHot?.recommendedUsers?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {t(sitePublic.discover.hot.recommendedUsers.titleZh, sitePublic.discover.hot.recommendedUsers.titleEn)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {discoverHot.recommendedUsers
                        .slice(0, sitePublic.discover.hot.recommendedUsers.limit)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1"
                          >
                            <Avatar label={item.user.nickname} image={item.user.avatarUrl} tone="emerald" size="sm" />
                            <div className="text-[11px] font-semibold text-slate-700">{item.user.nickname}</div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {item.score}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <SectionTitle title={t("热门 Lounge", "Trending Lounges")} hint={t("站点配置推荐（非热榜）", "Site curated (not live ranking)")} />
            <div className="mt-2 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {sitePublic.discoverLounges.map((item: any) => (
                <div
                  key={item.name}
                  className="w-[170px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50 p-2.5"
                >
                  <div className="text-xs font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {t("成员", "Members")} {item.members}
                  </div>
                  <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {t(item.activeZh, item.activeEn)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title={t("链上动态预览", "On-chain feed preview")} hint={t("精选", "Featured")} />
            <div className="mt-2 space-y-2">
              {momentsLoading
                ? Array.from({ length: 2 }).map((_, index) => (
                    <button
                      key={`skeleton-${index}`}
                      type="button"
                      onClick={() => setDiscoverView("moments")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                    >
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 rounded bg-slate-200/80 skeleton-line" />
                        <div className="h-3 w-full rounded bg-slate-200/80 skeleton-line" />
                      </div>
                    </button>
                  ))
                : moments.slice(0, 2).map((moment) => (
                    <button
                      key={moment.id}
                      type="button"
                      onClick={() => setDiscoverView("moments")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-white active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                    >
                      <div className="text-xs font-semibold text-slate-800">{moment.author.nickname}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{moment.content}</div>
                    </button>
                  ))}
              {!momentsLoading && moments.length === 0 && (
                <EmptyState
                  icon={<Sparkles className="h-5 w-5" />}
                  title={t("还没有动态", "No moments yet")}
                  description={t("发布第一条链上动态，开始构建你的社交网络。", "Publish your first moment to start building your network.")}
                />
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle title={t("探索更多", "Explore more")} hint={t("快速入口", "Quick tags")} />
            <div className="mt-2 flex flex-wrap gap-2">
              {sitePublic.discoverTags.map((label: string) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDiscoverView("moments")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-jade/30 hover:text-jade-deep active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                >
                  #{label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDiscoverView("moments")}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-jade px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-emerald-300 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
            >
              {t("发布动态", "Publish moment")}
            </button>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title={t("朋友圈", "Moments")} hint={t("Visible to app users only", "Visible to app users only")} />
              <button
                type="button"
                onClick={() => setDiscoverView("menu")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
              >
                {t("返回列表", "Back to list")}
              </button>
            </div>
            <textarea
              value={momentDraft}
              onChange={(event) => {
                setMomentDraft(event.target.value);
                if (momentNotice) {
                  setMomentNotice("");
                }
              }}
              placeholder={t("分享新鲜事、群组动态或产品进展...", "Share updates, group news, or product progress...")}
              className="mt-2 h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none transition focus:border-jade/40 focus:bg-white"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition active:scale-[0.99]">
                <ImagePlus className="h-4 w-4" />
                {t("配图", "Images")}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const next = Array.from(event.target.files ?? []);
                    enqueueMomentUploads(next);
                    if (momentNotice) {
                      setMomentNotice("");
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <span className="text-[11px] text-slate-500">
                {momentFiles.length}/9 {t("张", "imgs")}
              </span>
            </div>
            {momentFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {momentFiles.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="relative overflow-hidden rounded-2xl bg-slate-100">
                    <img src={URL.createObjectURL(item.file)} alt="" className="h-24 w-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-950/55 px-2 py-1 text-[10px] text-white">
                      {item.status === "uploading" && `${t("上传中", "Uploading")} ${item.progress}%`}
                      {item.status === "done" && t("上传完成", "Uploaded")}
                      {item.status === "error" && t("上传失败", "Upload failed")}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMomentFiles((previous) => previous.filter((_, current) => current !== index))}
                      className="absolute right-2 top-2 rounded-full bg-slate-950/60 p-1 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => void publishMoment()}
              disabled={busy === "publish-moment" || (!momentDraft.trim() && momentFiles.length === 0)}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-jade px-4 py-3 font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy === "publish-moment" ? t("发布中...", "Publishing...") : t("发布动态", "Publish")}
            </button>
            {momentNotice && <p className="mt-2 text-sm text-slate-500">{momentNotice}</p>}
          </Card>

          {sitePublic.adsEnabled && (
            <AdBanner
              slot="moments-feed-top"
              title={t(sitePublic.banners["moments-feed-top"].titleZh, sitePublic.banners["moments-feed-top"].titleEn)}
              description={t(sitePublic.banners["moments-feed-top"].descriptionZh, sitePublic.banners["moments-feed-top"].descriptionEn)}
            />
          )}

          <div className="space-y-3">
            {momentsLoading && moments.length === 0
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Card key={`moments-skeleton-${index}`}>
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-slate-200/80 skeleton-line" />
                      <div className="h-3 w-full rounded bg-slate-200/80 skeleton-line" />
                      <div className="h-3 w-2/3 rounded bg-slate-200/80 skeleton-line" />
                    </div>
                  </Card>
                ))
              : moments.map((moment) => (
                  <Card key={moment.id}>
                    <div className="flex items-start gap-3">
                      <Avatar label={moment.author.nickname} image={moment.author.avatarUrl} tone="emerald" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{moment.author.nickname}</div>
                            <div className="text-[11px] text-slate-500">{formatTime(moment.createdAt, locale)}</div>
                          </div>
                          {!moment.mine && (
                            <button
                              type="button"
                              onClick={() => void reportMoment(moment.id)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                            >
                              {t("举报", "Report")}
                            </button>
                          )}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{moment.content}</p>
                        {moment.images.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {moment.images.map((image: UploadAsset) => (
                              <img
                                key={image.id}
                                src={buildAssetUrl(image.url) ?? image.url}
                                alt=""
                                className="h-24 w-full rounded-2xl object-cover"
                              />
                            ))}
                          </div>
                        )}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => void toggleMomentLike(moment.id)}
                              aria-label={
                                typeof moment.likeCount === "number"
                                  ? t(`点赞 ${moment.likeCount}`, `Like ${moment.likeCount}`)
                                  : t("点赞", "Like")
                              }
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40",
                                moment.likedByMe
                                  ? "border-jade/30 text-jade-deep"
                                  : "border-slate-200 text-slate-600 hover:border-jade/30 hover:text-jade-deep"
                              )}
                            >
                              <Heart
                                className={cn(
                                  "h-3.5 w-3.5",
                                  moment.likedByMe ? "fill-jade text-jade-deep" : "text-slate-500"
                                )}
                              />
                              <span>{typeof moment.likeCount === "number" ? moment.likeCount : 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = !expandedMomentComments[moment.id];
                                setExpandedMomentComments((previous) => ({
                                  ...previous,
                                  [moment.id]: next
                                }));
                                if (next && !momentComments[moment.id]) {
                                  void loadMomentComments(moment.id);
                                }
                              }}
                              aria-label={t("评论", "Comments")}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-jade/30 hover:text-jade-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>
                                {momentComments[moment.id]
                                  ? countMomentComments(momentComments[moment.id] ?? [])
                                  : typeof moment.commentCount === "number"
                                    ? moment.commentCount
                                    : 0}
                              </span>
                            </button>
                            {momentCommentsLoading[moment.id] ? (
                              <span className="text-[11px] text-slate-500">{t("加载中...", "Loading...")}</span>
                            ) : null}
                          </div>

                          {expandedMomentComments[moment.id] ? (
                            <div className="mt-2 space-y-2">
                              <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                                {momentReplyTargets[moment.id] ? (
                                  <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-sky-700">
                                    <span>
                                      {t("回复", "Reply")} @{momentReplyTargets[moment.id]?.nickname}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMomentReplyTargets((previous) => ({
                                          ...previous,
                                          [moment.id]: null
                                        }))
                                      }
                                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-500"
                                    >
                                      {t("取消", "Cancel")}
                                    </button>
                                  </div>
                                ) : null}
                                <textarea
                                  value={momentCommentDrafts[moment.id] ?? ""}
                                  onChange={(event) =>
                                    setMomentCommentDrafts((previous) => ({
                                      ...previous,
                                      [moment.id]: event.target.value
                                    }))
                                  }
                                  placeholder={t("写下你的评论...", "Write a comment...")}
                                  className="h-16 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 caret-slate-900 outline-none transition focus:border-jade/40 focus:bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => void submitMomentComment(moment.id)}
                                  disabled={busy === `moment-comment-${moment.id}`}
                                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-jade px-3 py-1 text-[11px] font-semibold text-ink transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {busy === `moment-comment-${moment.id}` ? t("提交中...", "Submitting...") : t("发表评论", "Comment")}
                                </button>
                              </div>

                              <MomentCommentsTree
                                items={momentComments[moment.id] ?? []}
                                locale={locale}
                                onReply={(comment) =>
                                  setMomentReplyTargets((previous) => ({
                                    ...previous,
                                    [moment.id]: {
                                      commentId: comment.id,
                                      nickname: comment.author.nickname
                                    }
                                  }))
                                }
                                onDelete={(commentId) => void deleteMomentComment(moment.id, commentId)}
                                onLike={(commentId) => void toggleMomentCommentLike(moment.id, commentId)}
                                onPin={(commentId) => void toggleMomentCommentPin(moment.id, commentId)}
                                canPin={moment.mine}
                                deletingCommentId={
                                  busy?.startsWith("moment-comment-delete-")
                                    ? Number(busy.replace("moment-comment-delete-", ""))
                                    : null
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                        {!moment.mine && (
                          <button
                            type="button"
                            onClick={() => onAddAuthorAsFriend(moment.author.id)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-jade/10 px-3 py-2 text-xs font-medium text-jade-deep transition hover:bg-jade/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade/40"
                          >
                            <CirclePlus className="h-3.5 w-3.5" />
                            {t("添加作者为好友", "Add author as friend")}
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            {!momentsLoading && moments.length === 0 && (
              <EmptyState
                icon={<MessageCircle className="h-5 w-5" />}
                title={t("还没有朋友圈内容", "No moments yet")}
                description={t("发布第一条动态，或邀请朋友加入后再回来看看。", "Publish your first moment or invite friends to get started.")}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

