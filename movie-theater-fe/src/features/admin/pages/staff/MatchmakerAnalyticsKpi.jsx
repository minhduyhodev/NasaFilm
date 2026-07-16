import { BarChart3, Sparkles, User, Users } from 'lucide-react';
import AdminKpiGrid from '../../components/AdminKpiGrid';

const MatchmakerAnalyticsKpi = ({ analytics }) => {
  const total = analytics?.totalQuizzes ?? 0;
  const last7 = analytics?.quizzesLast7Days ?? 0;
  const last7Meta =
    total > 0 ? `${Math.round((last7 / total) * 100)}% trong 7 ngày qua` : null;

  return (
    <AdminKpiGrid
      items={[
        {
          label: 'Tổng quiz',
          value: total.toLocaleString('vi-VN'),
          badge: last7Meta || undefined,
          icon: BarChart3,
          color: 'text-rose-400',
        },
        {
          label: '7 ngày qua',
          value: last7.toLocaleString('vi-VN'),
          icon: Sparkles,
          color: 'text-amber-400',
        },
        {
          label: 'Thành viên',
          value: (analytics?.authenticatedQuizzes ?? 0).toLocaleString('vi-VN'),
          icon: Users,
          color: 'text-emerald-400',
        },
        {
          label: 'Khách',
          value: (analytics?.guestQuizzes ?? 0).toLocaleString('vi-VN'),
          icon: User,
          color: 'text-slate-400',
        },
      ]}
    />
  );
};

export default MatchmakerAnalyticsKpi;
