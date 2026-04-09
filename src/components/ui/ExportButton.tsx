"use client";

import { Download } from "lucide-react";
import { useOuraData } from "@/components/layout/OuraDataProvider";
import { exportCSV } from "@/lib/export";
import { useToast } from "@/components/ui/Toast";

interface ExportButtonProps {
  page: string;
}

export function ExportButton({ page }: ExportButtonProps) {
  const { data, days } = useOuraData();
  const { toast } = useToast();

  const handleExport = () => {
    if (!data) {
      toast("No data to export", "error");
      return;
    }
    exportCSV(data, page, days);
    toast("Data exported as CSV", "success");
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
      title="Export data as CSV"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Export</span>
    </button>
  );
}
