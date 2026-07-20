import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        className={cn(
          "w-full rounded-md border border-[var(--color-border)] bg-white py-2 pl-9 pr-3 text-sm outline-none ring-[var(--color-primary)]/20 transition focus:ring-4",
          className,
        )}
        {...props}
      />
    </div>
  );
}
