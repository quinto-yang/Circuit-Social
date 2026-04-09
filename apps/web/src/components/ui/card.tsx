import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white/85 p-3 shadow-soft backdrop-blur">
      {children}
    </section>
  );
}

