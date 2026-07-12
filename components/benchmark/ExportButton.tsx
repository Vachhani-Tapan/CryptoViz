"use client";

import { useState } from "react";
import type { BenchmarkResult, BenchmarkSession } from "@/types/benchmark";
import { exportToCSV, exportSessionToCSV } from "@/lib/utils/csvExport";

interface ExportButtonProps {
  results: BenchmarkResult[];
  session?: BenchmarkSession | null;
  disabled?: boolean;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ExportButton({
  results,
  session,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const runExport = (callback: () => void) => {
    setIsExporting(true);
    try {
      callback();
    } finally {
      setIsExporting(false);
    }
  };

  const baseClass =
    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || isExporting || results.length === 0}
        onClick={() =>
          runExport(() =>
            exportToCSV(results, `benchmark-results-${Date.now()}.csv`),
          )
        }
        className={`${baseClass} border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800`}
      >
        Export Results (CSV)
      </button>

      <button
        type="button"
        disabled={disabled || isExporting || !session}
        onClick={() => session && runExport(() => exportSessionToCSV(session))}
        className={`${baseClass} border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800`}
      >
        Export Session (CSV)
      </button>

      <button
        type="button"
        disabled={disabled || isExporting || !session}
        onClick={() =>
          session &&
          runExport(() =>
            downloadJson(session, `benchmark-session-${session.id}.json`),
          )
        }
        className={`${baseClass} border-teal-600 bg-teal-600 text-white hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-500 dark:hover:bg-teal-600`}
      >
        Export JSON
      </button>
    </div>
  );
}
