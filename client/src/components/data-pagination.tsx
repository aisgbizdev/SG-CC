import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
}

export function DataPagination({ currentPage, totalPages, totalItems, onPageChange }: DataPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4" data-testid="pagination-container">
      <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
        Halaman {currentPage} dari {totalPages} ({totalItems} data)
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          data-testid="button-prev-page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "outline"}
              size="sm"
              className="min-w-[36px]"
              onClick={() => onPageChange(p)}
              data-testid={`button-page-${p}`}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          data-testid="button-next-page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function usePagination<T>(items: T[], itemsPerPage = 20) {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  return {
    totalPages,
    totalItems: items.length,
    getPageItems: (page: number) => {
      const clamped = Math.min(Math.max(1, page), totalPages);
      const start = (clamped - 1) * itemsPerPage;
      return items.slice(start, start + itemsPerPage);
    },
  };
}
