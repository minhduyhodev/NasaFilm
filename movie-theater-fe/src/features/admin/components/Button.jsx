import React from 'react';
import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer border-none font-ui';

export const PrimaryButton = ({ children, loading, className = '', type = 'button', ...props }) => (
  <button
    type={type}
    className={`${base} adm-btn adm-btn--primary px-3.5 py-2 ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
    {children}
  </button>
);

export const DangerButton = ({ children, loading, className = '', type = 'button', ...props }) => (
  <button
    type={type}
    className={`${base} bg-red-600 text-white hover:bg-[#d12c2c] shadow-lg shadow-red-600/20 px-3.5 py-2 ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
    {children}
  </button>
);

export const GhostButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={`${base} adm-btn adm-btn--ghost px-3 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);
