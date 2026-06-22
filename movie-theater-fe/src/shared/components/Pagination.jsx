import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage > 2) pages.add(currentPage - 2);
  if (currentPage < totalPages - 1) pages.add(currentPage + 2);

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
};

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage) || 1);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(safePage, totalPages);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== safePage) {
      onPageChange(page);
    }
  };

  const navBtnClass =
    'inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed';

  const navBtnEnabled =
    'bg-[#121826] border-[#2a3448] text-gray-200 hover:bg-[#1a2238] hover:border-[#3d4a63] hover:text-white active:scale-95';

  const navBtnDisabled =
    'bg-[#0a0e18] border-[#1a2238] text-gray-600 opacity-60';

  const pageBtnClass = (isActive) =>
    `inline-flex items-center justify-center min-w-9 h-9 px-2.5 rounded-lg border text-sm font-bold transition-all duration-150 cursor-pointer ${
      isActive
        ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-900/30'
        : 'bg-[#121826] border-[#2a3448] text-gray-300 hover:bg-[#1a2238] hover:border-[#3d4a63] hover:text-white active:scale-95'
    }`;

  return (
    <div className="flex flex-col gap-3 py-4 px-4 sm:px-5 border-t border-[#242d42]/40 bg-[#080b14]/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-xs text-gray-400 font-medium">
          Hiển thị{' '}
          <span className="text-gray-200 font-semibold">
            {startItem}–{endItem}
          </span>{' '}
          / <span className="text-gray-200 font-semibold">{totalItems}</span>
        </span>

        {onItemsPerPageChange && (
          <label className="inline-flex items-center gap-2 text-xs text-gray-500">
            <span className="whitespace-nowrap">Mỗi trang</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="app-select h-8 rounded-lg bg-[#121826] border border-[#2a3448] text-gray-200 text-xs px-2.5 pr-8 focus:outline-none focus:border-red-500/40 cursor-pointer"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav className="flex items-center gap-1" aria-label="Phân trang">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => goToPage(1)}
          className={`${navBtnClass} ${safePage <= 1 ? navBtnDisabled : navBtnEnabled}`}
          aria-label="Trang đầu"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => goToPage(safePage - 1)}
          className={`${navBtnClass} ${safePage <= 1 ? navBtnDisabled : navBtnEnabled}`}
          aria-label="Trang trước"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-1 mx-1">
          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex items-center justify-center min-w-9 h-9 text-gray-500 text-sm select-none"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={pageBtnClass(page === safePage)}
                aria-label={`Trang ${page}`}
                aria-current={page === safePage ? 'page' : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <span className="sm:hidden inline-flex items-center justify-center min-w-10 h-9 px-2 text-xs font-bold text-gray-300">
          {safePage}/{totalPages}
        </span>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => goToPage(safePage + 1)}
          className={`${navBtnClass} ${safePage >= totalPages ? navBtnDisabled : navBtnEnabled}`}
          aria-label="Trang sau"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => goToPage(totalPages)}
          className={`${navBtnClass} ${safePage >= totalPages ? navBtnDisabled : navBtnEnabled}`}
          aria-label="Trang cuối"
          title="Trang cuối"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
