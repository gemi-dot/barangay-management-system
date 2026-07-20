type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg bg-[var(--color-surface-muted)] px-4 py-8 text-sm text-[var(--color-text-secondary)]">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-primary)]" />
      <span>{label}</span>
    </div>
  );
}
