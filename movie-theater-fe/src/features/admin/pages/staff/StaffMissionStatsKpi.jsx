import { Ticket, Armchair, Crown, UserCheck } from 'lucide-react';
import AdminKpiGrid from '../../components/AdminKpiGrid';

const StaffMissionStatsKpi = ({ stats }) => (
  <AdminKpiGrid
    items={[
      {
        label: 'Đã bán',
        value: stats?.soldSeats ?? 0,
        badge: `${stats?.occupancyPercent ?? 0}% lấp đầy`,
        icon: Ticket,
        kpiClass: stats?.almostFull ? 'kpi-inactive' : 'kpi-active',
      },
      {
        label: 'Ghế trống',
        value: stats?.availableSeats ?? '—',
        icon: Armchair,
        kpiClass: 'kpi-total',
      },
      {
        label: 'VIP còn',
        value: stats?.vipAvailable ?? '—',
        icon: Crown,
        kpiClass: 'kpi-showing',
      },
      {
        label: 'Đã check-in',
        value: stats?.checkedInBookings ?? 0,
        icon: UserCheck,
        kpiClass: 'kpi-upcoming',
      },
    ]}
  />
);

export default StaffMissionStatsKpi;
