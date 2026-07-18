import {
  useState, useRef, useEffect, useLayoutEffect, useId, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const MENU_MAX_HEIGHT = 256;
const MENU_MAX_HEIGHT_POSTER = 340;
const MENU_GAP = 6;

function getMenuPosition(triggerEl, hasPosters = false) {
  const maxMenuHeight = hasPosters ? MENU_MAX_HEIGHT_POSTER : MENU_MAX_HEIGHT;
  const rect = triggerEl.getBoundingClientRect();
  const width = rect.width;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
  const spaceAbove = rect.top - MENU_GAP;
  const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;

  let top;
  let maxHeight;
  if (openUpward) {
    maxHeight = Math.min(maxMenuHeight, spaceAbove);
    top = rect.top - MENU_GAP - maxHeight;
  } else {
    maxHeight = Math.min(maxMenuHeight, spaceBelow);
    top = rect.bottom + MENU_GAP;
  }

  return {
    position: 'fixed',
    top: Math.max(8, top),
    left,
    width,
    maxHeight: Math.max(120, maxHeight),
    zIndex: 10050,
  };
}

export function CounterSelectDropdown({
  id,
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Chọn...',
  /** When set, closed trigger always shows this text (selection still works in the menu). */
  triggerLabel = null,
  disabled = false,
  emptyMessage = 'Không có dữ liệu',
  fieldClassName = '',
  className = '',
  variant = 'field',
  leadingIcon: LeadingIcon = null,
  iconClassName = '',
  menuMinWidth,
}) {
  const isHeader = variant === 'header';
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const generatedId = useId();
  const triggerId = id || generatedId;
  const listId = `${triggerId}-list`;

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const hasPosters = options.some((opt) => Boolean(opt.image));
    const position = getMenuPosition(triggerRef.current, hasPosters);
    if (menuMinWidth) {
      position.width = Math.max(position.width, menuMinWidth);
      position.left = Math.max(8, Math.min(
        triggerRef.current.getBoundingClientRect().left,
        window.innerWidth - position.width - 8,
      ));
    }
    setMenuStyle(position);
  }, [options, menuMinWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, options.length, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const selected = options.find((opt) => opt.value === value);
  const hasValue = value !== '' && value != null;
  const display = triggerLabel ?? selected?.label ?? placeholder;
  const hasPosters = options.some((opt) => Boolean(opt.image));

  const menu = open && menuStyle && createPortal(
    <div
      id={listId}
      ref={menuRef}
      role="listbox"
      className={[
        'counter-pos__dropdown-menu',
        'counter-pos__dropdown-menu--portal',
        isHeader && 'counter-header__dropdown-menu',
        hasPosters && 'counter-pos__dropdown-menu--posters',
      ].filter(Boolean).join(' ')}
      style={menuStyle}
    >
      {options.length === 0 ? (
        <div className="counter-pos__dropdown-empty">{emptyMessage}</div>
      ) : (
        options.map((opt, index) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="option"
              aria-selected={isSelected}
              style={{ '--item-index': index }}
              className={[
                'counter-pos__dropdown-item',
                opt.image && 'counter-pos__dropdown-item--with-poster',
                isSelected && 'counter-pos__dropdown-item--active',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="counter-pos__dropdown-item-main">
                {opt.image && (
                  <img
                    src={opt.image}
                    alt=""
                    className="counter-pos__dropdown-item-poster"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className="counter-pos__dropdown-item-label">{opt.label}</span>
              </span>
              {isSelected && (
                <Check className="counter-pos__dropdown-item-check" size={14} aria-hidden />
              )}
            </button>
          );
        })
      )}
    </div>,
    document.body,
  );

  return (
    <div
      ref={rootRef}
      className={isHeader
        ? `counter-header__select ${className}`.trim()
        : `staff-control__field counter-pos__field-select ${fieldClassName}`.trim()}
    >
      {!isHeader && label && (
        <label className="staff-control__field-label" htmlFor={triggerId}>
          {label}
        </label>
      )}
      <div
        ref={triggerRef}
        className={[
          isHeader ? 'counter-header__dropdown' : 'counter-pos__dropdown',
          open && (isHeader ? 'counter-header__dropdown--open' : 'counter-pos__dropdown--open'),
          disabled && (isHeader ? 'counter-header__dropdown--disabled' : 'counter-pos__dropdown--disabled'),
          hasValue && !isHeader && 'counter-pos__dropdown--filled',
        ].filter(Boolean).join(' ')}
      >
        <button
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={isHeader ? label || placeholder : undefined}
          className={isHeader ? 'counter-header__dropdown-trigger' : 'counter-pos__dropdown-trigger'}
          onClick={() => !disabled && setOpen((prev) => !prev)}
        >
          {isHeader && LeadingIcon && (
            <LeadingIcon
              className={`counter-header__dropdown-icon ${iconClassName}`.trim()}
              aria-hidden
            />
          )}
          <span
            className={[
              isHeader ? 'counter-header__dropdown-value' : 'counter-pos__dropdown-value',
              !isHeader && hasValue && 'counter-pos__dropdown-value--filled',
              !isHeader && selected?.image && 'counter-pos__dropdown-value--with-poster',
            ].filter(Boolean).join(' ')}
          >
            {!isHeader && selected?.image && (
              <img
                src={selected.image}
                alt=""
                className="counter-pos__dropdown-value-poster"
                loading="lazy"
                decoding="async"
              />
            )}
            <span className={isHeader ? 'counter-header__dropdown-value-text' : 'counter-pos__dropdown-value-text'}>
              {display}
            </span>
          </span>
          <ChevronDown
            className={isHeader ? 'counter-header__dropdown-chevron' : 'counter-pos__dropdown-chevron'}
            aria-hidden
          />
        </button>
      </div>
      {menu}
    </div>
  );
}
