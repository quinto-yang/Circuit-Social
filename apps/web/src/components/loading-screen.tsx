"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function LoadingScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-4">
      <div className="rounded-2xl border border-white/60 bg-white/85 px-5 py-6 text-center shadow-panel backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-jade/10">
          <Sparkles className="h-6 w-6 text-jade-deep" />
        </div>
        <div className="mt-4 font-[var(--font-display)] text-2xl font-bold text-slate-900">Circuit Social</div>
        <div className="mt-2 text-sm text-slate-500">正在建立链上会话...</div>
      </div>
    </main>
  );
}

