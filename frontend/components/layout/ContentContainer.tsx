import type { ReactNode } from "react";

type ContentContainerProps = {
  children: ReactNode;
};

export function ContentContainer({ children }: ContentContainerProps) {
  return <div className="mx-auto max-w-[var(--layout-max-width)] space-y-4 px-4 py-5 sm:px-6 lg:px-8">{children}</div>;
}
