import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  adminLabelClass,
  adminSelectTriggerClass,
  adminDropdownMenuClass,
  getAdminDropdownItemClass,
} from './adminFormStyles';

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
  const selected = options.find((o) => o.value === value);
  const sizeClass = size === 'sm' ? 'min-h-[38px] py-2 text-xs' : 'min-h-[42px]';

  return (
    <div className={`relative ${className}`}>
      {label && <label className={labelClassName}>{label}</label>}
      <button
        type="button"
        disabled={disabled}
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
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className={`${adminDropdownMenuClass} ${menuClassName}`}>
            {options.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
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
          </div>
        </>
      )}
    </div>
  );
}
