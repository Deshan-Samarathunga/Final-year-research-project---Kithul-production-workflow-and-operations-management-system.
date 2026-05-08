import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger" | "dark" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
  secondary: "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  danger: "border-red-600 bg-red-600 text-white hover:bg-red-700",
  dark: "border-slate-900 bg-slate-950 text-white hover:bg-slate-800",
  ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

export function Button({ variant = "secondary", icon, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
