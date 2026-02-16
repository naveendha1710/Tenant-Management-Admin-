import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronsRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isCompact?: boolean;
  showControls?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, isCompact = false, showControls = true }: PaginationProps) {
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5, 'dots', totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, 'dots', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'dots', currentPage - 1, currentPage, currentPage + 1, 'dots', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex justify-center">
      <nav className="flex items-center gap-1 shadow-sm rounded-lg bg-gray-50 p-1">
        {showControls && (
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
            aria-label="previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {pages.map((page, index) => {
          if (page === 'dots') {
            return (
              <button
                key={`dots-${index}`}
                onClick={() => {
                  const jump = index === 1 ? currentPage - 5 : currentPage + 5;
                  onPageChange(Math.max(1, Math.min(totalPages, jump)));
                }}
                className="group flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="jump pages"
              >
                <MoreHorizontal className="h-4 w-4 group-hover:hidden" />
                <ChevronsRight className={`h-4 w-4 hidden group-hover:block ${index === 1 ? 'rotate-180' : ''}`} />
              </button>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`flex items-center justify-center min-w-9 h-9 px-3 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
              aria-label={`page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}

        {showControls && (
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
            aria-label="next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>
    </div>
  );
}
