"use client";

import { ChevronRight } from "lucide-react";
import React from "react";

export function MenuSheet({
  title,
  actions
}: {
  title: string;
  actions: Array<{
    label: string;
    description: string;
    badge?: number;
    onClick: () => void;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-2.5 shadow-panel backdrop-blur">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">{title}</div>
      <div className="space-y-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-left"
          >
            <div>
              <div className="font-semibold text-slate-900">{action.label}</div>
              <div className="text-xs text-slate-500">{action.description}</div>
            </div>
            <div className="flex items-center gap-2">
              {action.badge ? (
                <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-semibold text-white">
                  {action.badge}
                </span>
              ) : null}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

