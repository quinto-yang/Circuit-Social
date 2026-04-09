"use client";

import React from "react";

export function Overlay({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-slate-950/25 p-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="关闭遮罩"
      />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

