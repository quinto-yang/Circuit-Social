import React from "react";
import { X } from "lucide-react";

import { cn } from "./cn";

export function HeroCard({
  title,
  description,
  tone = "light",
  compact,
  onClose
}: {
  title: string;
  description: string;
  tone?: "light" | "dark";
  /** 我的页等场景：更矮的头部区 */
  compact?: boolean;
  onClose?: () => void;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border shadow-soft",
        compact ? "p-2.5" : "p-3",
        tone === "dark"
          ? "border-slate-900/10 bg-slate-950 text-white"
          : "border-white/70 bg-gradient-to-br from-white/95 via-white/90 to-jade/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            compact ? "text-[9px]" : "text-[10px]",
            "font-semibold uppercase tracking-[0.2em]",
            tone === "dark" ? "text-white/60" : "text-slate-500"
          )}
        >
          Circuit Notes
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onClose}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full border text-slate-500 transition hover:bg-white",
              "border-slate-200/70 bg-white/60",
              tone === "dark" && "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "font-[var(--font-display)] font-bold tracking-[-0.05em]",
          compact ? "mt-1 text-lg" : "mt-1.5 text-xl"
        )}
      >
        {title}
      </div>
      <p
        className={cn(
          "max-w-[28ch] text-slate-600",
          compact ? "mt-1 line-clamp-2 text-[11px] leading-snug" : "mt-1.5 text-xs leading-5",
          tone === "dark" && "text-white/70"
        )}
      >
        {description}
      </p>
    </section>
  );
}

