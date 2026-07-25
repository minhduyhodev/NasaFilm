import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import {
  adminLabelClass,
  adminSelectTriggerClass,
  adminDropdownPortalMenuClass,
  getAdminDropdownItemClass,
} from './adminFormStyles';
import { useFloatingPanelPosition, ADMIN_FLOATING_BACKDROP_Z } from './useFloatingPanelPosition';

export default function AdminSelectDropdown({
  label,
  labelClassName = adminLabelClass,
  value,
  options,
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  searchable = false,
  emptyMessage = 'Không tìm thấy kết quả',
  className = '',
  menuClassName = '',
  size = 'md',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const selected = options.find((o) => o.value === value);
  const sizeClass = size === 'sm' ? 'min-h-[38px] py-2 text-xs' : 'min-h-[42px]';

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((opt) => String(opt.label).toLowerCase().includes(q));
  }, [options, query, searchable]);

  const menuMaxHeight = searchable ? 300 : 220;
  const estimatedHeight = useMemo(() => {
    const searchH = searchable ? 52 : 0;
    const portalPad = searchable ? 0 : 12;
    const listPad = 12;
    const itemsH = Math.max(filteredOptions.length, 1) * 40;
    return Math.min(menuMaxHeight, searchH + portalPad + listPad + itemsH);
  }, [filteredOptions.length, menuMaxHeight, searchable]);

  const menuStyle = useFloatingPanelPosition(open, triggerRef, {
    maxHeight: menuMaxHeight,
    estimatedHeight,
    constrainToModal: !searchable,
    placement: 'bottom',
  });

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }

    if (searchable) {
      const id = window.requestAnimationFrame(() => searchRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const close = () => setOpen(false);

  const menu = open && menuStyle && createPortal(
    <div
      ref={menuRef}
      className={`${adminDropdownPortalMenuClass} ${searchable ? 'adm-dropdown-portal--searchable' : ''} ${menuClassName}`}
      style={{
        ...menuStyle,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: searchable ? 0 : undefined,
      }}
      role="listbox"
    >
      {searchable ? (
        <div className="adm-dropdown__search">
          <Search className="adm-dropdown__search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            className="adm-dropdown__search-input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}
      <div className="adm-dropdown__list">
        {filteredOptions.length === 0 ? (
          <p className="adm-dropdown__empty">{emptyMessage}</p>
        ) : (
          filteredOptions.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              aria-disabled={Boolean(opt.disabled)}
              disabled={Boolean(opt.disabled)}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                close();
              }}
              className={`${getAdminDropdownItemClass(value === opt.value)}${
                opt.disabled ? ' adm-dropdown__item--disabled' : ''
              }`}
            >
              {opt.icon}
              <span className="truncate">{opt.label}</span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && <label className={labelClassName}>{label}</label>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`${adminSelectTriggerClass} ${sizeClass} ${
          open ? 'ring-1 ring-accent/40 border-accent/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {selected?.icon}
          <span className={`truncate ${selected ? '' : 'text-foreground-muted'}`}>
            {selected?.label || placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-foreground-muted shrink-0 transition-transform duration-300 ease-expo-out ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0"
          style={{ zIndex: ADMIN_FLOATING_BACKDROP_Z }}
          onClick={close}
          aria-hidden="true"
        />,
        document.body,
      )}
      {menu}
    </div>
  );
}
