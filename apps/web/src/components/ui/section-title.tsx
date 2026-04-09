import React from "react";

export function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div className="text-[15px] font-semibold text-slate-900">{title}</div>
      <div className="text-[11px] tracking-[0.06em] text-slate-400">{hint}</div>
    </div>
  );
}

