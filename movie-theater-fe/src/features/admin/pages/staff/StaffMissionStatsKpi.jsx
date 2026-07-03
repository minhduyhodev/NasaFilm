import React from 'react';
import { Ticket, Armchair, Crown, UserCheck } from 'lucide-react';

const KPI_ITEMS = [
  {
    label: 'Đã bán',
    icon: Ticket,
    color: 'text-emerald-400',
    dangerColor: 'text-rose-400',
    isDanger: (stats) => stats?.almostFull,
    value: (stats) => stats?.soldSeats ?? 0,
    meta: (stats) => `${stats?.occupancyPercent ?? 0}% lấp đầy`,
  },
  {
    label: 'Ghế trống',
    icon: Armchair,
    color: 'text-blue-400',
    value: (stats) => stats?.availableSeats ?? '—',
  },
  {
    label: 'VIP còn',
    icon: Crown,
    color: 'text-amber-400',
    value: (stats) => stats?.vipAvailable ?? '—',
  },
  {
    label: 'Đã check-in',
    icon: UserCheck,
    color: 'text-purple-400',
    value: (stats) => stats?.checkedInBookings ?? 0,
  },
];

const StaffMissionStatsKpi = ({ stats }) => (
  <div className="adm-kpi-grid adm-kpi-grid--4 gap-3 staff-control__stats-kpi">
    {KPI_ITEMS.map((kpi) => {
      const Icon = kpi.icon;
      const danger = kpi.isDanger?.(stats);
      const valueColor = danger && kpi.dangerColor ? kpi.dangerColor : kpi.color;
      const meta = kpi.meta?.(stats);

      return (
        <div key={kpi.label} className="adm-kpi-card kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
              {kpi.label}
            </span>
            <Icon className={`w-4 h-4 ${valueColor} opacity-60`} />
          </div>
          <p className={`text-xl font-black ${valueColor} tabular-nums leading-none`}>
            {kpi.value(stats)}
          </p>
          {meta ? (
            <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{meta}</p>
          ) : null}
        </div>
      );
    })}
  </div>
);

export default StaffMissionStatsKpi;
