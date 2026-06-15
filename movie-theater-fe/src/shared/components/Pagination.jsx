import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50]
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            currentPage === i
              ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
              : 'bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 gap-4 border-t border-[#1A2238] bg-white/[0.01]">
      <div className="text-xs text-gray-400 font-medium">
        Hiển thị <span className="text-white font-bold">{startIndex}</span> -{' '}
        <span className="text-white font-bold">{endIndex}</span> trong tổng số{' '}
        <span className="text-white font-bold">{totalItems}</span> bản ghi
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Số dòng hiển thị:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-[#0F1322] border border-[#1A2238] text-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-red-500/50 cursor-pointer transition-colors"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} dòng / trang
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition duration-150 cursor-pointer"
            title="Trang đầu"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition duration-150 cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {renderPageNumbers()}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition duration-150 cursor-pointer"
            title="Trang sau"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition duration-150 cursor-pointer"
            title="Trang cuối"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
