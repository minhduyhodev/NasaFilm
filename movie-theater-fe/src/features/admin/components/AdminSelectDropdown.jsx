import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
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
  className = '',
  menuClassName = '',
  size = 'md',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((o) => o.value === value);
  const sizeClass = size === 'sm' ? 'min-h-[38px] py-2 text-xs' : 'min-h-[42px]';
  const estimatedHeight = useMemo(
    () => Math.min(220, Math.max(80, options.length * 38 + 16)),
    [options.length],
  );
  const menuStyle = useFloatingPanelPosition(open, triggerRef, {
    maxHeight: 220,
    estimatedHeight,
  });

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

  const menu = open && menuStyle && createPortal(
    <div
      ref={menuRef}
      className={`${adminDropdownPortalMenuClass} ${menuClassName}`}
      style={{
        ...menuStyle,
        overflowY: 'auto',
      }}
      role="listbox"
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="option"
          aria-selected={value === opt.value}
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
          className={getAdminDropdownItemClass(value === opt.value)}
        >
          {opt.icon}
          <span className="truncate">{opt.label}</span>
        </button>
      ))}
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
          open ? 'ring-1 ring-red-500/40 border-red-500/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {selected?.icon}
          <span className="truncate">{selected?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0"
          style={{ zIndex: ADMIN_FLOATING_BACKDROP_Z }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />,
        document.body,
      )}
      {menu}
    </div>
  );
}
