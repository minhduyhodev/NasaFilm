import React from 'react';
import { BarChart3, Sparkles, User, Users } from 'lucide-react';

const KPI_ITEMS = [
  {
    label: 'Tổng quiz',
    icon: BarChart3,
    color: 'text-rose-400',
    value: (analytics) => (analytics?.totalQuizzes ?? 0).toLocaleString('vi-VN'),
    meta: (analytics) => {
      const total = analytics?.totalQuizzes ?? 0;
      const last7 = analytics?.quizzesLast7Days ?? 0;
      if (total <= 0) return null;
      const pct = Math.round((last7 / total) * 100);
      return `${pct}% trong 7 ngày qua`;
    },
  },
  {
    label: '7 ngày qua',
    icon: Sparkles,
    color: 'text-amber-400',
    value: (analytics) => (analytics?.quizzesLast7Days ?? 0).toLocaleString('vi-VN'),
  },
  {
    label: 'Thành viên',
    icon: Users,
    color: 'text-emerald-400',
    value: (analytics) => (analytics?.authenticatedQuizzes ?? 0).toLocaleString('vi-VN'),
  },
  {
    label: 'Khách',
    icon: User,
    color: 'text-slate-400',
    value: (analytics) => (analytics?.guestQuizzes ?? 0).toLocaleString('vi-VN'),
  },
];

const MatchmakerAnalyticsKpi = ({ analytics }) => (
  <div className="adm-kpi-grid adm-kpi-grid--4 gap-3 matchmaker-analytics__kpi">
    {KPI_ITEMS.map((kpi) => {
      const Icon = kpi.icon;
      const meta = kpi.meta?.(analytics);

      return (
        <div key={kpi.label} className="adm-kpi-card kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
              {kpi.label}
            </span>
            <Icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
          </div>
          <p className={`text-xl font-black ${kpi.color} tabular-nums leading-none`}>
            {kpi.value(analytics)}
          </p>
          {meta ? (
            <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{meta}</p>
          ) : null}
        </div>
      );
    })}
  </div>
);

export default MatchmakerAnalyticsKpi;
