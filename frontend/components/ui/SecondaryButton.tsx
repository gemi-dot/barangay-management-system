import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: ReactNode;
};

export function SecondaryButton({ className, leftIcon, children, ...props }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
}
