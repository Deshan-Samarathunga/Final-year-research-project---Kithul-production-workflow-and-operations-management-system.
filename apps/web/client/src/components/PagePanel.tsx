import type { ReactNode } from "react";

export function PagePanel({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
      {toolbar ? <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-3 px-4 py-3">{toolbar}</div> : null}
      {children}
    </section>
  );
}
