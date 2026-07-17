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
        color: stats?.almostFull ? 'text-rose-400' : 'text-emerald-400',
      },
      {
        label: 'Ghế trống',
        value: stats?.availableSeats ?? '—',
        icon: Armchair,
        color: 'text-sky-400',
      },
      {
        label: 'VIP còn',
        value: stats?.vipAvailable ?? '—',
        icon: Crown,
        color: 'text-amber-400',
      },
      {
        label: 'Đã check-in',
        value: stats?.checkedInBookings ?? 0,
        icon: UserCheck,
        color: 'text-rose-400',
      },
    ]}
  />
);

export default StaffMissionStatsKpi;
