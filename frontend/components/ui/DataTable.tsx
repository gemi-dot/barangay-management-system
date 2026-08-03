import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string | number;
  className?: string;
  scrollContainerClassName?: string;
  tableClassName?: string;
};

export function DataTable<T>({
  columns,
  rows,
  loading,
  emptyTitle = "No records",
  emptyDescription = "There are no rows to display for this view.",
  rowKey,
  className,
  scrollContainerClassName,
  tableClassName,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]", className)}>
      <div className={cn("w-full overflow-x-auto", scrollContainerClassName)}>
        <table className={cn("min-w-full", tableClassName)}>
          <thead className="bg-slate-100">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`px-5 py-3 text-left text-sm font-semibold ${column.className ?? ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8">
                  <LoadingState label="Loading records..." />
                </td>
              </tr>
            ) : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : null}

            {!loading &&
              rows.map((row) => (
                <tr key={rowKey(row)} className="border-t border-slate-200 hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={`${String(rowKey(row))}-${column.key}`} className={`px-5 py-3 text-sm text-slate-700 ${column.className ?? ""}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
