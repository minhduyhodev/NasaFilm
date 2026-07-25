import { BarChart3, Sparkles, User, Users } from 'lucide-react';
import AdminKpiGrid from '../../components/AdminKpiGrid';

const MatchmakerAnalyticsKpi = ({ analytics }) => {
  const total = analytics?.totalQuizzes ?? 0;
  const last7 = analytics?.quizzesLast7Days ?? 0;
  const last7Pct = total > 0 ? Math.round((last7 / total) * 100) : null;

  return (
    <AdminKpiGrid
      columns={4}
      className="mb-5"
      items={[
        {
          label: 'Tổng quiz',
          value: total.toLocaleString('vi-VN'),
          icon: BarChart3,
          kpiClass: 'kpi-total',
          badge: last7Pct != null ? `${last7Pct}% trong 7 ngày qua` : null,
        },
        {
          label: '7 ngày qua',
          value: last7.toLocaleString('vi-VN'),
          icon: Sparkles,
          kpiClass: 'kpi-showing',
        },
        {
          label: 'Thành viên',
          value: (analytics?.authenticatedQuizzes ?? 0).toLocaleString('vi-VN'),
          icon: Users,
          kpiClass: 'kpi-active',
        },
        {
          label: 'Khách',
          value: (analytics?.guestQuizzes ?? 0).toLocaleString('vi-VN'),
          icon: User,
          kpiClass: 'kpi-upcoming',
        },
      ]}
    />
  );
};

export default MatchmakerAnalyticsKpi;
