import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clapperboard, Loader2, PieChart } from 'lucide-react';
import { AdminPage, FilterPills, PageHeader } from '../components';
import { adminDiscoverService } from '../api/adminDiscoverService';
import MatchmakerAnalyticsKpi from './staff/MatchmakerAnalyticsKpi';
import MatchmakerQuizTab from './staff/MatchmakerQuizTab';
import TabTransition from '../../../shared/components/TabTransition';
import './MatchmakerAnalyticsPage.css';

const MOOD_COLORS = {
  RELAX: '#06b6d4',
  EXCITING: '#f97316',
  EMOTIONAL: '#e11d48',
  THRILLING: '#ef4444',
};

const VIEWING_COLORS = {
  THEATER: '#22c55e',
  HOME: '#3b82f6',
  BOTH: '#f59e0b',
};

const CHART_FALLBACK_COLORS = ['#ef4444', '#f59e0b', '#f97316', '#06b6d4', '#10b981'];

const TAB_ITEMS = [
  { id: 'analytics', label: 'Thống kê' },
  { id: 'quiz', label: 'Cấu hình quiz' },
];

const MoodDonutChart = ({ items }) => {
  const segments = useMemo(
    () =>
      (items || []).map((item, index) => ({
        label: item.label,
        value: item.count,
        pct: item.percentage,
        color: MOOD_COLORS[item.key] || CHART_FALLBACK_COLORS[index % CHART_FALLBACK_COLORS.length],
      })),
    [items],
  );

  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const stroke = 22;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="matchmaker-analytics__empty">Chưa có dữ liệu tâm trạng.</p>;
  }

  let offset = 0;
  const rings = segments.map((seg) => {
    const length = total > 0 ? (seg.value / total) * circumference : 0;
    const ring = { ...seg, length, offset };
    offset += length;
    return ring;
  });

  return (
    <div className="matchmaker-analytics__mood-chart">
      <div className="matchmaker-analytics__donut-wrap">
        <svg viewBox={`0 0 ${size} ${size}`} className="matchmaker-analytics__donut-svg" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {rings.map((ring) =>
              ring.length > 0 ? (
                <circle
                  key={ring.label}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${ring.length} ${circumference - ring.length}`}
                  strokeDashoffset={-ring.offset}
                  className="matchmaker-analytics__donut-seg"
                />
              ) : null,
            )}
          </g>
        </svg>
        <div className="matchmaker-analytics__donut-center">
          <span className="matchmaker-analytics__donut-center-label">quiz</span>
          <span className="matchmaker-analytics__donut-center-value">{total}</span>
        </div>
      </div>
      <ul className="matchmaker-analytics__legend">
        {segments.map((seg) => (
          <li key={seg.label} className="matchmaker-analytics__legend-item">
            <span className="matchmaker-analytics__legend-dot" style={{ background: seg.color }} />
            <span className="matchmaker-analytics__legend-label">{seg.label}</span>
            <span className="matchmaker-analytics__legend-value">
              {seg.value} · {seg.pct?.toLocaleString?.('vi-VN', { maximumFractionDigits: 1 }) ?? seg.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ViewingBarChart = ({ items }) => {
  const rows = useMemo(
    () =>
      (items || []).map((item, index) => ({
        label: item.label,
        percentage: item.percentage || 0,
        count: item.count || 0,
        color: VIEWING_COLORS[item.key] || CHART_FALLBACK_COLORS[index % CHART_FALLBACK_COLORS.length],
      })),
    [items],
  );

  if (!rows.length) {
    return <p className="matchmaker-analytics__empty">Chưa có dữ liệu nơi xem.</p>;
  }

  const maxPct = Math.max(...rows.map((row) => row.percentage), 1);

  return (
    <div className="matchmaker-analytics__bar-chart">
      {rows.map((row) => (
        <div key={row.label} className="matchmaker-analytics__bar-row">
          <div className="matchmaker-analytics__bar-head">
            <span className="matchmaker-analytics__bar-label">{row.label}</span>
            <span className="matchmaker-analytics__bar-meta">
              {row.count} · {row.percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
            </span>
          </div>
          <div className="matchmaker-analytics__bar-track">
            <div
              className="matchmaker-analytics__bar-fill"
              style={{
                width: `${(row.percentage / maxPct) * 100}%`,
                background: `linear-gradient(90deg, ${row.color}, ${row.color}99)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const MatchmakerAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await adminDiscoverService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setAnalytics(null);
      setError(err?.message || 'Không thể tải thống kê quiz gợi ý phim');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const topMood = analytics?.moodDistribution?.[0];

  return (
    <AdminPage className="matchmaker-analytics">
      <div className="mma-linear-atmosphere" aria-hidden="true">
        <div className="mma-blob mma-blob--1" />
        <div className="mma-blob mma-blob--2" />
        <div className="mma-blob mma-blob--3" />
      </div>

      <PageHeader
        eyebrow="Gợi ý phim"
        title="Quản lý gợi ý phim"
        description="Thống kê quiz Matchmaker và cấu hình lựa chọn, ghim phim theo mood."
        variant="display"
      />

      <FilterPills
        items={TAB_ITEMS}
        value={activeTab}
        onChange={setActiveTab}
        className="mma-tabs"
        ariaLabel="Tab quản lý gợi ý phim"
      />

      <TabTransition activeKey={activeTab}>
        {activeTab === 'analytics' && (
          loading && !analytics ? (
            <div className="matchmaker-analytics__loading">
              <Loader2 className="w-6 h-6 animate-spin text-red-400" />
              <span>Đang tải thống kê quiz...</span>
            </div>
          ) : error ? (
            <div className="matchmaker-analytics__error-panel">
              <p>{error}</p>
              <button type="button" className="matchmaker-analytics__retry-btn" onClick={loadAnalytics}>
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <MatchmakerAnalyticsKpi analytics={analytics} />

              {topMood && (analytics?.totalQuizzes ?? 0) > 0 && (
                <p className="matchmaker-analytics__highlight">
                  Xu hướng hiện tại: <strong>{topMood.label}</strong> chiếm{' '}
                  {topMood.percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% lượt quiz.
                </p>
              )}

              <div className="matchmaker-analytics__charts">
                <section className="matchmaker-analytics__chart-panel">
                  <div className="matchmaker-analytics__panel-head">
                    <h2 className="matchmaker-analytics__chart-title">
                      <PieChart className="w-3.5 h-3.5" />
                      Phân bố tâm trạng
                    </h2>
                    <span className="matchmaker-analytics__panel-badge">
                      {(analytics?.totalQuizzes ?? 0).toLocaleString('vi-VN')} quiz
                    </span>
                  </div>
                  <MoodDonutChart items={analytics?.moodDistribution} />
                </section>
                <section className="matchmaker-analytics__chart-panel">
                  <div className="matchmaker-analytics__panel-head">
                    <h2 className="matchmaker-analytics__chart-title">
                      <Clapperboard className="w-3.5 h-3.5" />
                      Nơi xem ưa thích
                    </h2>
                    <span className="matchmaker-analytics__panel-badge">
                      {(analytics?.viewingDistribution?.length ?? 0)} nhóm
                    </span>
                  </div>
                  <ViewingBarChart items={analytics?.viewingDistribution} />
                </section>
              </div>
            </>
          )
        )}

        {activeTab === 'quiz' && <MatchmakerQuizTab />}
      </TabTransition>
    </AdminPage>
  );
};

export default MatchmakerAnalyticsPage;
