import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { downloadPDF, downloadExcel, downloadWord } from "@/lib/download";

type ColumnDef = { header: string; key: string; width?: number };

interface DownloadMenuProps {
  title: string;
  columns: ColumnDef[];
  data: any[];
  filename: string;
}

export function DownloadMenu({ title, columns, data, filename }: DownloadMenuProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (format: "pdf" | "excel" | "word") => {
    setLoading(true);
    try {
      if (format === "pdf") downloadPDF(title, columns, data, filename);
      else if (format === "excel") downloadExcel(title, columns, data, filename);
      else await downloadWord(title, columns, data, filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading || !data?.length} data-testid="button-download">
          <Download className="w-4 h-4 mr-1" />
          {loading ? "Memproses..." : "Download"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("pdf")} data-testid="menu-download-pdf">
          <FileText className="w-4 h-4 mr-2 text-red-500" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("excel")} data-testid="menu-download-excel">
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("word")} data-testid="menu-download-word">
          <FileType className="w-4 h-4 mr-2 text-blue-600" /> Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
