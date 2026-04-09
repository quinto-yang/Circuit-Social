import React from "react";

export function AdBanner({
  slot,
  title,
  description,
  compact
}: {
  slot: string;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-xl border border-amber-200/70 bg-[linear-gradient(180deg,#fff8e8_0%,#fff3dd_100%)] p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
            AD · {slot}
          </div>
          <div className="mt-1 font-semibold text-amber-950">{title}</div>
          <div className="mt-1 text-xs text-amber-900/80">{description}</div>
        </div>
        <button
          type="button"
          className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800"
        >
          查看
        </button>
      </div>
      {!compact && <div className="mt-3 h-16 rounded-2xl border border-amber-200/70 bg-white/65" />}
    </section>
  );
}

