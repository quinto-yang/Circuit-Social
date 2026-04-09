"use client";

import React from "react";

import { cn } from "@/components/ui/cn";

export function ChatDecisionPanel({
  visible,
  t,
  decisionCollapsed,
  onToggleCollapsed,
  recentDecisionPath,
  onClearRecentPath,
  formatRelativeTime,
  onContinueRecentPath,
  onReviewRecentPath,
  conciergeSections,
  activeDecisionSectionId,
  setActiveDecisionSectionId,
  setActiveDecisionQuestionId,
  onDecisionSectionSelect,
  activeDecisionQuestionId,
  onDecisionQuestionOpen,
  onDecisionAction,
  sendQuickReply
}: {
  visible: boolean;
  t: (zh: string, en: string) => string;
  decisionCollapsed: boolean;
  onToggleCollapsed: () => void;
  recentDecisionPath: any;
  onClearRecentPath: () => void;
  formatRelativeTime: (value: string) => string;
  onContinueRecentPath: () => void;
  onReviewRecentPath: () => void;
  conciergeSections: any[];
  activeDecisionSectionId: string | null;
  setActiveDecisionSectionId: (next: string | null) => void;
  setActiveDecisionQuestionId: (next: string | null) => void;
  onDecisionSectionSelect: (sectionId: string) => void;
  activeDecisionQuestionId: string | null;
  onDecisionQuestionOpen: (questionId: string) => void;
  onDecisionAction: (action: any) => void;
  sendQuickReply: (text: string) => void;
}) {
  if (!visible) return null;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2.5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("Circuit 决策树助手", "Circuit decision tree")}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500"
        >
          {decisionCollapsed ? t("展开", "Expand") : t("收起", "Collapse")}
        </button>
      </div>
      {!decisionCollapsed ? (
        <>
          <div className="mt-1 text-[13px] font-semibold text-slate-800">{t("你想先做什么？", "What do you want to do first?")}</div>
          {recentDecisionPath ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{t("最近路径", "Recent path")}</div>
                <button
                  type="button"
                  onClick={onClearRecentPath}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                >
                  {t("清除", "Clear")}
                </button>
              </div>
              <div className="mt-1 text-[11px] text-slate-600">{recentDecisionPath.questionLabel}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {t("更新时间", "Updated")} · {formatRelativeTime(recentDecisionPath.updatedAt)}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onContinueRecentPath}
                  className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  {t("继续上次操作", "Continue")}
                </button>
                <button
                  type="button"
                  onClick={onReviewRecentPath}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                >
                  {t("查看路径", "Review path")}
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {conciergeSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveDecisionSectionId(section.id);
                  setActiveDecisionQuestionId(null);
                  onDecisionSectionSelect(section.id);
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  activeDecisionSectionId === section.id
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                {section.title}
              </button>
            ))}
          </div>
          {conciergeSections.find((section) => section.id === activeDecisionSectionId) ? (
            <div className="mt-2.5 space-y-2">
              {conciergeSections
                .find((section) => section.id === activeDecisionSectionId)!
                .questions.map((question: any) => (
                  <div key={question.id} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => onDecisionQuestionOpen(question.id)}
                      className="w-full text-left text-[12px] font-medium text-slate-700"
                    >
                      {question.ask}
                    </button>
                    {activeDecisionQuestionId === question.id ? (
                      <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <div className="text-[11px] leading-snug text-slate-600">{question.learn}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDecisionAction(question.action)}
                            className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white"
                          >
                            {question.actionLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => sendQuickReply(question.ask)}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {t("继续了解", "Continue")}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-1 text-[11px] text-slate-500">
          {t("已收起决策树，输入消息时不打断对话。", "Decision tree is minimized to avoid interrupting chat.")}
        </div>
      )}
    </div>
  );
}

