"use client";

import React from "react";
import { Copy, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function ChatGroupPanels({
  open,
  conversation,
  members,
  role,
  onCloseGroupManage,
  onMute,
  onKick,
  onCopyInviteCode,
  onLeaveGroup,
  mentions,
  setMentions,
  draft,
  setDraft,
  memberActionTarget,
  setMemberActionTarget,
  memberProfileOpen,
  setMemberProfileOpen
}: {
  open: boolean;
  conversation: any;
  members: any[];
  role: "owner" | "member";
  onCloseGroupManage: () => void;
  onMute: (member: any) => void;
  onKick: (memberId: number) => void;
  onCopyInviteCode: () => void;
  onLeaveGroup: () => void;
  mentions: number[];
  setMentions: (next: number[]) => void;
  draft: string;
  setDraft: (value: string) => void;
  memberActionTarget: any;
  setMemberActionTarget: (next: any) => void;
  memberProfileOpen: boolean;
  setMemberProfileOpen: (next: boolean) => void;
}) {
  const canQuickManageFromAvatar = conversation.kind === "group" && role === "owner";

  return (
    <>
      {open && conversation.kind === "group" && (
        <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-panel backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">群管理</div>
              <div className="text-[11px] text-slate-500">查看成员、禁言、移出和群号信息</div>
            </div>
            <button
              type="button"
              onClick={onCloseGroupManage}
              aria-label="关闭群成员与提及"
              className="rounded-full bg-slate-100 p-2 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {members.map((member) => {
              const muted = member.mutedUntil && new Date(member.mutedUntil).getTime() > Date.now();
              return (
                <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar label={member.nickname} image={member.avatarUrl} tone="emerald" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-semibold text-slate-900">{member.nickname}</div>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          {member.role}
                        </span>
                        {muted && (
                          <span className="rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-semibold text-coral">
                            muted
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-slate-500">{shortAddress(member.primaryWalletAddress)}</div>
                    </div>
                    {role === "owner" && member.role !== "owner" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onMute(member)}
                          className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800"
                        >
                          {muted ? "解禁" : "禁言"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onKick(member.id)}
                          className="rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-[11px] font-medium text-coral"
                        >
                          移出
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCopyInviteCode}
              disabled={!conversation.inviteCode}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              群号：{conversation.inviteCode ?? "—"}
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onLeaveGroup}
              className="rounded-full border border-coral/30 bg-coral/10 px-4 py-2 text-xs font-semibold text-coral"
            >
              退出群聊
            </button>
          </div>
        </div>
      )}

      {memberActionTarget && conversation.kind === "group" && (
        <div className="absolute inset-x-3 bottom-20 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-panel backdrop-blur">
          {!memberProfileOpen ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar label={memberActionTarget.nickname} image={memberActionTarget.avatarUrl} tone="emerald" size="sm" />
                  <div>
                    <div className="font-semibold text-slate-900">{memberActionTarget.nickname}</div>
                    <div className="text-xs text-slate-500">成员操作</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberActionTarget(null)}
                  aria-label="关闭成员操作"
                  className="rounded-full bg-slate-100 p-2 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!mentions.includes(memberActionTarget.id)) {
                      setMentions([...mentions, memberActionTarget.id]);
                    }
                    const mentionToken = `@${memberActionTarget.nickname} `;
                    if (!draft.includes(mentionToken)) {
                      setDraft(`${mentionToken}${draft}`.trimStart());
                    }
                    setMemberActionTarget(null);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => setMemberProfileOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  个人资料
                </button>
                {canQuickManageFromAvatar && memberActionTarget.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => {
                      onMute(memberActionTarget);
                      setMemberActionTarget(null);
                    }}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
                  >
                    {memberActionTarget.mutedUntil && new Date(memberActionTarget.mutedUntil).getTime() > Date.now()
                      ? "解禁"
                      : "禁言"}
                  </button>
                )}
                {canQuickManageFromAvatar && memberActionTarget.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => {
                      onKick(memberActionTarget.id);
                      setMemberActionTarget(null);
                    }}
                    className="rounded-2xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-medium text-coral"
                  >
                    移除群聊
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">个人资料</div>
                <button
                  type="button"
                  onClick={() => setMemberProfileOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  返回
                </button>
              </div>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <Avatar label={memberActionTarget.nickname} image={memberActionTarget.avatarUrl} tone="emerald" size="md" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{memberActionTarget.nickname}</div>
                    <div className="text-xs text-slate-500">{memberActionTarget.role === "owner" ? "群主" : "群成员"}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="rounded-2xl bg-white px-3 py-2">用户 ID：{memberActionTarget.id}</div>
                  <div className="rounded-2xl bg-white px-3 py-2 break-all">钱包：{memberActionTarget.primaryWalletAddress}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

