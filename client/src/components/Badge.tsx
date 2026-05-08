import { clsx } from "clsx";

export type BadgeTone = "blue" | "green" | "red" | "yellow" | "purple" | "slate" | "teal";

const tones: Record<BadgeTone, string> = {
  blue: "border-blue-200 bg-blue-100 text-blue-800",
  green: "border-emerald-200 bg-emerald-100 text-emerald-800",
  red: "border-red-200 bg-red-100 text-red-800",
  yellow: "border-amber-200 bg-amber-100 text-amber-800",
  purple: "border-purple-200 bg-purple-100 text-purple-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  teal: "border-teal-200 bg-teal-100 text-teal-800"
};

export function Badge({
  tone = "slate",
  children,
  className
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-sm font-semibold leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
