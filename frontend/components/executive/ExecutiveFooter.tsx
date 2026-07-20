type ExecutiveFooterProps = {
  version: string;
};

export function ExecutiveFooter({ version }: ExecutiveFooterProps) {
  return (
    <footer className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
      <p className="font-semibold text-slate-900">Barangay Integrated Management System</p>
      <p className="mt-1">Developed by</p>
      <p className="font-semibold">SoftWorks Community Solutions</p>
      <p className="mt-1 text-slate-600">Code That Cares. Technology That Serves Communities.</p>

      <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Version {version}</span>
        <span>Copyright © 2026 SoftWorks Community Solutions. All Rights Reserved.</span>
      </div>
    </footer>
  );
}
