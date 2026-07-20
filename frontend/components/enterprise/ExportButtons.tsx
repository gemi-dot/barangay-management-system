import { Download, FileSpreadsheet } from "lucide-react";

import { SecondaryButton } from "@/components/ui/SecondaryButton";

type ExportButtonsProps<T> = {
  rows: T[];
  fileName: string;
  toExportRecord: (row: T) => Record<string, string | number | boolean | null | undefined>;
  disabled?: boolean;
};

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButtons<T>({ rows, fileName, toExportRecord, disabled = false }: ExportButtonsProps<T>) {
  function exportCsv() {
    if (rows.length === 0) {
      return;
    }

    const records = rows.map(toExportRecord);
    const headers = Object.keys(records[0]);
    const lines = [headers.join(",")];

    for (const record of records) {
      const values = headers.map((header) => {
        const raw = record[header];
        const value = raw === null || raw === undefined ? "" : String(raw);
        return escapeCsvValue(value);
      });
      lines.push(values.join(","));
    }

    downloadCsv(lines.join("\n"), fileName);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <SecondaryButton onClick={exportCsv} disabled={disabled || rows.length === 0}>
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </SecondaryButton>
      <SecondaryButton onClick={() => window.print()} disabled={disabled}>
        <Download className="h-4 w-4" />
        Print View
      </SecondaryButton>
    </div>
  );
}
