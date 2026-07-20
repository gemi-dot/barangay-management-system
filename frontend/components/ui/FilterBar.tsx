import type { ReactNode } from "react";

import { SectionCard } from "@/components/ui/SectionCard";

type FilterBarProps = {
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function FilterBar({ children, rightSlot }: FilterBarProps) {
  return (
    <SectionCard>
      <div className="flex justify-end">{rightSlot}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </SectionCard>
  );
}
