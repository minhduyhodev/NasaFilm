import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MovieReviewPagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
  compact = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage) || 1);
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== safePage && !isLoading) {
      onPageChange(page);
    }
  };

  if (compact) {
    if (totalPages <= 1) {
      return (
        <span className="movie-reviews-pager-compact-count">
          {totalItems} bình luận
        </span>
      );
    }

    return (
      <div className="movie-reviews-pager-compact" aria-label="Phân trang bình luận">
        <button
          type="button"
          className="movie-reviews-pager-btn"
          disabled={safePage <= 1 || isLoading}
          onClick={() => goToPage(safePage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="movie-reviews-pager-compact-label">
          {safePage}/{totalPages}
        </span>
        <button
          type="button"
          className="movie-reviews-pager-btn"
          disabled={safePage >= totalPages || isLoading}
          onClick={() => goToPage(safePage + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={`movie-reviews-pager-bar ${isLoading ? 'is-loading' : ''}`}>
      <div className="movie-reviews-pager-meta">
        <span className="movie-reviews-pager-range">
          Hiển thị <strong>{startItem}–{endItem}</strong> / <strong>{totalItems}</strong>
        </span>
        {onItemsPerPageChange && (
          <label className="movie-reviews-pager-size">
            <span>Mỗi trang</span>
            <select
              value={itemsPerPage}
              disabled={isLoading}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="movie-reviews-pager-select"
            >
              {[5, 10, 15, 20].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="movie-reviews-pager-nav" aria-label="Phân trang bình luận">
          <button
            type="button"
            className="movie-reviews-pager-btn"
            disabled={safePage <= 1 || isLoading}
            onClick={() => goToPage(safePage - 1)}
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>

          <div className="movie-reviews-pager-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`movie-reviews-pager-page${pageNum === safePage ? ' is-active' : ''}`}
                disabled={isLoading}
                onClick={() => goToPage(pageNum)}
                aria-label={`Trang ${pageNum}`}
                aria-current={pageNum === safePage ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="movie-reviews-pager-btn"
            disabled={safePage >= totalPages || isLoading}
            onClick={() => goToPage(safePage + 1)}
            aria-label="Trang sau"
          >
            <span>Sau</span>
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
};

export default MovieReviewPagination;
