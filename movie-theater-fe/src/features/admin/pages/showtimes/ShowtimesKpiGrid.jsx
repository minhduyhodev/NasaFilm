import {
  Film, Ticket, CalendarClock, Play, Eye, Ban, CreditCard,
} from 'lucide-react';
import AdminKpiGrid from '../../components/AdminKpiGrid';
import { KPI_STATUS_MAP } from './showtimesConstants';

const KPI_ITEMS = [
  { label: 'Tổng', key: 'total', icon: Film, kpiClass: 'kpi-total' },
  { label: 'Đang Mở Bán', key: 'selling', icon: Ticket, kpiClass: 'kpi-selling' },
  { label: 'Sắp Chiếu', key: 'scheduled', icon: CalendarClock, kpiClass: 'kpi-upcoming' },
  { label: 'Đang Chiếu', key: 'playing', icon: Play, kpiClass: 'kpi-playing' },
  { label: 'Đã Kết Thúc', key: 'finished', icon: Eye, kpiClass: 'kpi-ended' },
  { label: 'Đã Hủy', key: 'cancelled', icon: Ban, kpiClass: 'kpi-cancelled' },
  { label: 'Doanh Thu', key: 'revenue', icon: CreditCard, kpiClass: 'kpi-revenue', isRevenue: true },
];

const ShowtimesKpiGrid = ({ stats, statusFilter, onKpiClick }) => {
  const items = KPI_ITEMS.map((kpi) => {
    const rawValue = stats[kpi.key] ?? 0;
    const value = kpi.isRevenue
      ? (rawValue >= 1000000 ? `${(rawValue / 1000000).toFixed(1)}M` : `${rawValue.toLocaleString('vi-VN')}đ`)
      : rawValue;
    const isActive = kpi.label === 'Tổng'
      ? !statusFilter
      : statusFilter === KPI_STATUS_MAP[kpi.label];

    return {
      label: kpi.label,
      value,
      icon: kpi.icon,
      kpiClass: kpi.kpiClass,
      active: isActive,
      onClick: () => onKpiClick(kpi.label),
    };
  });

  return <AdminKpiGrid items={items} columns={7} className="showtimes-kpi-grid" />;
};

export default ShowtimesKpiGrid;
