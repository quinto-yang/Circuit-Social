import React from "react";
import { Copy } from "lucide-react";

import { cn } from "./cn";

export function DataRow({
  label,
  value,
  displayValue,
  copyable,
  onCopied,
  compact
}: {
  label: string;
  value: string;
  displayValue?: string;
  copyable?: boolean;
  onCopied?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2",
        compact ? "border border-slate-200/70 bg-white" : "bg-slate-50"
      )}
    >
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-0.5 break-all text-sm text-slate-700">{displayValue ?? value}</div>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard.writeText(value).then(() => {
              onCopied?.();
            })
          }
          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-jade/30 hover:text-jade-deep active:scale-[0.98]"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

