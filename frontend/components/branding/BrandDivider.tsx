type BrandDividerProps = {
  className?: string;
};

export function BrandDivider({ className = "" }: BrandDividerProps) {
  return <div className={`h-px w-full bg-slate-200/80 dark:bg-slate-700/80 ${className}`} aria-hidden="true" />;
}
