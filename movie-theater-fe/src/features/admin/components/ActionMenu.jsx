import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { GhostButton } from './Button';

/**
 * Overflow menu — destructive actions live here (Linear pattern).
 * @param {{ label: string, icon?: React.ReactNode, onClick: () => void, destructive?: boolean, disabled?: boolean }[]} items
 */
const ActionMenu = ({ items = [], align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!items.length) return null;

  const regular = items.filter((i) => !i.destructive);
  const destructive = items.filter((i) => i.destructive);

  return (
    <div className="relative" ref={ref}>
      <GhostButton
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="px-2"
      >
        <MoreHorizontal className="w-4 h-4" />
      </GhostButton>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-1 min-w-[180px] rounded-lg bg-[#121826] py-1 shadow-xl ring-1 ring-white/[0.08] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {regular.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white transition disabled:opacity-40 cursor-pointer bg-transparent border-none"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {regular.length > 0 && destructive.length > 0 && (
            <div className="my-1 border-t border-white/[0.06]" />
          )}
          {destructive.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition disabled:opacity-40 cursor-pointer bg-transparent border-none"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
