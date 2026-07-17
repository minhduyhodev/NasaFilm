import {
  Film, Ticket, CalendarClock, Play, Eye, Ban, CreditCard,
} from 'lucide-react';
import { KPI_STATUS_MAP } from './showtimesConstants';

const KPI_ITEMS = [
  { label: 'Tổng', key: 'total', icon: Film, color: 'text-indigo-400', kpiClass: 'kpi-total' },
  { label: 'Đang Mở Bán', key: 'selling', icon: Ticket, color: 'text-emerald-400', kpiClass: 'kpi-selling' },
  { label: 'Sắp Chiếu', key: 'scheduled', icon: CalendarClock, color: 'text-blue-400', kpiClass: 'kpi-upcoming' },
  { label: 'Đang Chiếu', key: 'playing', icon: Play, color: 'text-purple-400', kpiClass: 'kpi-playing' },
  { label: 'Đã Kết Thúc', key: 'finished', icon: Eye, color: 'text-gray-400', kpiClass: 'kpi-ended' },
  { label: 'Đã Hủy', key: 'cancelled', icon: Ban, color: 'text-rose-400', kpiClass: 'kpi-cancelled' },
  { label: 'Doanh Thu', key: 'revenue', icon: CreditCard, color: 'text-pink-400', kpiClass: 'kpi-revenue', isRevenue: true },
];

const ShowtimesKpiGrid = ({ stats, statusFilter, onKpiClick }) => (
  <div className="adm-kpi-grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
    {KPI_ITEMS.map((kpi) => {
      const rawValue = stats[kpi.key] ?? 0;
      const value = kpi.isRevenue
        ? (rawValue >= 1000000 ? `${(rawValue / 1000000).toFixed(1)}M` : `${rawValue.toLocaleString('vi-VN')}đ`)
        : rawValue;
      const Icon = kpi.icon;
      const isActive = kpi.label === 'Tổng'
        ? !statusFilter
        : statusFilter === KPI_STATUS_MAP[kpi.label];

      return (
        <button
          key={kpi.label}
          type="button"
          onClick={() => onKpiClick(kpi.label)}
          className={`adm-kpi-card kpi-card kpi-card--clickable ${kpi.kpiClass}${isActive ? ' kpi-card--active' : ''}`}
          title={`Lọc theo: ${kpi.label}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
            <Icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
          </div>
          <p className={`text-xl font-black ${kpi.color} tabular-nums leading-none`}>{value}</p>
        </button>
      );
    })}
  </div>
);

export default ShowtimesKpiGrid;
