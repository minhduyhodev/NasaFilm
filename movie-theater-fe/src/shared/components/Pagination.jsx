import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

/**
 * Page list with ellipsis for long ranges.
 * e.g. 1 2 3 4 5 ... 12 | 1 ... 4 5 6 ... 12 | 1 ... 8 9 10 11 12
 */
const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

/**
 * Compact page-size menu — absolute panel above trigger.
 */
const PageSizeMenu = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`pg__size-menu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="pg__size-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Số mục mỗi trang"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="pg__size-value">{value}</span>
        <ChevronDown className="pg__size-chevron" strokeWidth={2.25} />
      </button>

      {open && (
        <div id={listId} className="pg__size-panel" role="listbox">
          {options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                className={`pg__size-option${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Admin pagination — Trang X/Y + page size + page numbers + prev/next.
 */
const Pagination = ({
  currentPage,
  totalPages: totalPagesProp,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
}) => {
  const totalPages =
    totalPagesProp ??
    Math.max(1, Math.ceil((totalItems ?? 0) / itemsPerPage) || 1);

  const safePage = Math.min(Math.max(Number(currentPage) || 1, 1), totalPages);
  const pageItems = getPageItems(safePage, totalPages);
  const isFirst = safePage <= 1;
  const isLast = safePage >= totalPages;

  const goTo = (page) => {
    if (page >= 1 && page <= totalPages && page !== safePage) {
      onPageChange(page);
    }
  };

  return (
    <div className="pg">
      <div className="pg__meta">
        <p className="pg__label" aria-live="polite">
          Trang{' '}
          <span className="pg__current">{safePage}</span>
          <span className="pg__slash">/</span>
          <span className="pg__total">{totalPages}</span>
        </p>

        {onItemsPerPageChange && (
          <div className="pg__size">
            <span className="pg__size-text">Mỗi trang</span>
            <PageSizeMenu
              value={itemsPerPage}
              options={itemsPerPageOptions}
              onChange={(size) => {
                onItemsPerPageChange(size);
                onPageChange(1);
              }}
            />
          </div>
        )}
      </div>

      <nav className="pg__nav" aria-label="Phân trang">
        <button
          type="button"
          className="pg__btn"
          disabled={isFirst}
          onClick={() => goTo(safePage - 1)}
          aria-label="Trang trước"
          title="Trang trước"
        >
          <ChevronLeft className="pg__icon" strokeWidth={2} />
        </button>

        <div className="pg__pages">
          {pageItems.map((item, index) =>
            item === '...' ? (
              <span key={`ellipsis-${index}`} className="pg__ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`pg__page${item === safePage ? ' is-active' : ''}`}
                onClick={() => goTo(item)}
                aria-label={`Trang ${item}`}
                aria-current={item === safePage ? 'page' : undefined}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          className="pg__btn"
          disabled={isLast}
          onClick={() => goTo(safePage + 1)}
          aria-label="Trang tiếp"
          title="Trang tiếp"
        >
          <ChevronRight className="pg__icon" strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
