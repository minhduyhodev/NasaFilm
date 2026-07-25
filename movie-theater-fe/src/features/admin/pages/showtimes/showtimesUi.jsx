import { ChevronDown } from 'lucide-react';
import StatusBadgeShared from '../../components/StatusBadge';
import { STATUS_CONFIG } from './showtimesConstants';

const STATUS_VARIANT = {
  OPEN_FOR_BOOKING: 'success',
  SCHEDULED: 'info',
  SOLD_OUT: 'warning',
  DRAFT: 'muted',
  FINISHED: 'muted',
  CANCELLED: 'danger',
};

export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <StatusBadgeShared variant={STATUS_VARIANT[status] || 'muted'}>
      {cfg.label}
    </StatusBadgeShared>
  );
};

export const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="flex items-center justify-between">
          <div className="sk-line adm-skeleton" style={{ width: '80px' }} />
          <div className="sk-line adm-skeleton" style={{ width: '100px' }} />
        </div>
        <div className="sk-line adm-skeleton" style={{ width: '70%', height: '16px' }} />
        <div className="sk-line-sm adm-skeleton" style={{ width: '50%' }} />
        <div className="flex gap-3 mt-1">
          <div className="sk-line-sm adm-skeleton" style={{ width: '60px' }} />
          <div className="sk-line-sm adm-skeleton" style={{ width: '80px' }} />
        </div>
        <div className="sk-bar adm-skeleton" style={{ width: '100%' }} />
        <div className="flex gap-2 mt-1">
          <div className="sk-line adm-skeleton" style={{ width: '70px', height: '28px' }} />
          <div className="sk-line adm-skeleton" style={{ width: '70px', height: '28px' }} />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="empty-state adm-empty">
    {Icon && <Icon className="empty-state-icon" />}
    <p className="font-bold text-white/70 uppercase tracking-wider text-xs">{title}</p>
    {subtitle && <p className="text-xs text-gray-500 max-w-sm">{subtitle}</p>}
  </div>
);

export const SectionHeader = ({
  status,
  count,
  pageCount,
  isCollapsed,
  onToggle,
  onSelectAll,
  allSelected,
  selectedCount = 0,
}) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const countLabel = pageCount != null && pageCount !== count
    ? `${pageCount} / ${count} suất chiếu`
    : `${count} suất chiếu`;
  const isPartial = selectedCount > 0 && !allSelected;
  const selectLabel = allSelected
    ? 'Bỏ chọn'
    : isPartial
      ? `Chọn cả ${count}`
      : `Chọn tất cả (${count})`;
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
        {selectedCount > 0 && (
          <span
            className="st-section-header__badge shrink-0"
            style={{ color: cfg.accent, background: cfg.accentBg, borderColor: `${cfg.accent}40` }}
          >
            Đã chọn {selectedCount}
          </span>
        )}
        <div className="flex-1 h-px bg-[#1a2238] group-hover:bg-[#2a3450] transition-colors min-w-[12px]" />
      </button>
      {onSelectAll && count > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll();
          }}
          className={`st-section-header__select ${isPartial ? 'is-partial' : ''} ${allSelected ? 'is-active' : ''}`}
        >
          {selectLabel}
        </button>
      )}
    </div>
  );
};
