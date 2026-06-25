import React from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_CONFIG } from './showtimesConstants';

export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pillBg} border ${cfg.pillBorder} ${cfg.pillText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

export const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="flex items-center justify-between">
          <div className="sk-line skeleton-pulse" style={{ width: '80px' }} />
          <div className="sk-line skeleton-pulse" style={{ width: '100px' }} />
        </div>
        <div className="sk-line skeleton-pulse" style={{ width: '70%', height: '16px' }} />
        <div className="sk-line-sm skeleton-pulse" style={{ width: '50%' }} />
        <div className="flex gap-3 mt-1">
          <div className="sk-line-sm skeleton-pulse" style={{ width: '60px' }} />
          <div className="sk-line-sm skeleton-pulse" style={{ width: '80px' }} />
        </div>
        <div className="sk-bar skeleton-pulse" style={{ width: '100%' }} />
        <div className="flex gap-2 mt-1">
          <div className="sk-line skeleton-pulse" style={{ width: '70px', height: '28px' }} />
          <div className="sk-line skeleton-pulse" style={{ width: '70px', height: '28px' }} />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="empty-state">
    {Icon && <Icon className="empty-state-icon" />}
    <p className="font-bold text-white/70 uppercase tracking-wider text-xs">{title}</p>
    {subtitle && <p className="text-xs text-gray-500 max-w-sm">{subtitle}</p>}
  </div>
);

export const SectionHeader = ({ status, count, pageCount, isCollapsed, onToggle, onSelectAll, allSelected }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const countLabel = pageCount != null && pageCount !== count
    ? `${pageCount} / ${count} suất chiếu`
    : `${count} suất chiếu`;
  return (
    <div className="st-section-header">
      <button
        type="button"
        onClick={onToggle}
        className="st-section-header__toggle group"
      >
        <ChevronDown
          className={`w-4 h-4 text-gray-500 section-header-chevron shrink-0 ${isCollapsed ? 'rotated' : ''}`}
        />
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0"
          style={{ background: cfg.accentBg, borderColor: `${cfg.accent}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.accent }}>
            {cfg.section}
          </span>
        </div>
        <span className="text-[11px] font-bold text-gray-500 tabular-nums shrink-0">{countLabel}</span>
        <div className="flex-1 h-px bg-[#1a2238] group-hover:bg-[#2a3450] transition-colors min-w-[12px]" />
      </button>
      {onSelectAll && count > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll();
          }}
          className="st-section-header__select"
        >
          {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
        </button>
      )}
    </div>
  );
};
