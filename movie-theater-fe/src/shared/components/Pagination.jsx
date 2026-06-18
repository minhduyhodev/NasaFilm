import React from 'react';

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

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 border-t border-[#242d42]/30 bg-transparent">
      <span className="text-[13px] text-gray-400 font-medium font-sans">
        Trang {currentPage}/{totalPages}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3 py-1 bg-[#0f172a] hover:bg-[#1E293B] border border-[#242d42] text-gray-300 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer min-w-8 h-8 flex items-center justify-center font-sans"
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-1 bg-[#0f172a] hover:bg-[#1E293B] border border-[#242d42] text-gray-300 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer min-w-8 h-8 flex items-center justify-center font-sans"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;
