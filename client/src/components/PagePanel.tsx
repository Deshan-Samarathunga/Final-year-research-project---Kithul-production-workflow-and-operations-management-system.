import type { ReactNode } from "react";

export function PagePanel({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <section className="flex min-h-[calc(100vh-120px)] flex-col rounded-md border border-slate-200 bg-white shadow-panel">
      {toolbar ? <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 py-3">{toolbar}</div> : null}
      {children}
    </section>
  );
}
