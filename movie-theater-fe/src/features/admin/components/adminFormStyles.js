export const adminInputClass =
  'w-full rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/30 transition border border-white/[0.08]';

export const adminSelectClass = `${adminInputClass} app-select`;

export const adminSelectTriggerClass =
  'admin-select-trigger w-full flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-white border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-red-500/40 focus:border-red-500/30 transition cursor-pointer';

export const adminDropdownMenuClass =
  'admin-dropdown-menu absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-white/[0.08] bg-[#121826] shadow-xl shadow-black/40 py-1 overflow-hidden animate-dropdown-fade-in';

export const getAdminDropdownItemClass = (isSelected) =>
  `admin-dropdown-item w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer flex items-center gap-2 ${
    isSelected
      ? 'admin-dropdown-item--selected text-white font-medium bg-white/[0.08]'
      : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
  }`;

export const adminFilterSelectClass =
  'app-select bg-[#0B0F19] border border-[#1A2238] text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500/30 focus:border-red-500/40';

export const adminLabelClass = 'block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide';
