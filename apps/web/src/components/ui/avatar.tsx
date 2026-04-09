import React from "react";

import { webConfig } from "@/lib/config";

import { cn } from "./cn";

function buildAssetUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${webConfig.apiOrigin}${value}`;
}

export function Avatar({
  label,
  image,
  tone,
  size = "md"
}: {
  label: string;
  image: string | null;
  tone: "emerald" | "sky";
  size?: "sm" | "md" | "lg";
}) {
  const map = {
    sm: "h-9 w-9 text-sm",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-xl"
  };
  const bg = tone === "emerald" ? "from-jade to-emerald-700" : "from-sky-300 to-sky-500";
  const src = buildAssetUrl(image);
  if (src) {
    return <img src={src} alt="" className={cn("shrink-0 rounded-2xl object-cover", map[size])} />;
  }
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-semibold text-white",
        bg,
        map[size]
      )}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

