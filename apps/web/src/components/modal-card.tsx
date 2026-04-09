"use client";

import React from "react";

import { cn } from "@/components/ui/cn";

export function ModalCard({
  title,
  subtitle,
  children,
  actions,
  stickyActions
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  stickyActions?: boolean;
}) {
  return (
    <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-4 shadow-panel backdrop-blur">
      <div className="shrink-0">
        <div className="font-[var(--font-display)] text-xl font-bold tracking-[-0.04em] text-slate-950">
          {title}
        </div>
        {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
      </div>
      <div className={cn("mt-3 flex-1 overflow-y-auto pr-1", stickyActions && "pb-4")}>{children}</div>
      {actions ? (
        <div className={cn("mt-4", stickyActions && "sticky bottom-0 border-t border-slate-200 bg-white/95 pt-3")}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

