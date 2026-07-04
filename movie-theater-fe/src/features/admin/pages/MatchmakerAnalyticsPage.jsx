import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminPage, PageHeader } from '../components';
import { adminDiscoverService } from '../api/adminDiscoverService';
import MatchmakerAnalyticsKpi from './staff/MatchmakerAnalyticsKpi';
import TabTransition from '../../../shared/components/TabTransition';
import './MatchmakerAnalyticsPage.css';

const MOOD_COLORS = {
  RELAX: '#06b6d4',
  EXCITING: '#f97316',
  EMOTIONAL: '#a855f7',
  THRILLING: '#ef4444',
};

const VIEWING_COLORS = {
  THEATER: '#22c55e',
  HOME: '#3b82f6',
  BOTH: '#f59e0b',
};

const CHART_FALLBACK_COLORS = ['#a855f7', '#ec4899', '#f97316', '#06b6d4', '#10b981'];

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
  let angle = -90;

  const arcs = segments.map((seg) => {
    const sweep = total > 0 ? (seg.value / total) * 360 : 0;
    const start = angle;
    angle += sweep;
    const end = angle;
    const large = sweep > 180 ? 1 : 0;
    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(end));
    const y2 = cy + r * Math.sin(rad(end));
    return {
      ...seg,
      d: sweep > 0 ? `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` : null,
    };
  });

  if (total === 0) {
    return <p className="matchmaker-analytics__empty">Chưa có dữ liệu tâm trạng.</p>;
  }

  return (
    <div className="matchmaker-analytics__mood-chart">
      <div className="matchmaker-analytics__donut-wrap">
        <svg viewBox={`0 0 ${size} ${size}`} className="matchmaker-analytics__donut-svg" aria-hidden>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {arcs.map((arc) =>
            arc.d ? (
              <path
                key={arc.label}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
              />
            ) : null,
          )}
        </svg>
        <div className="matchmaker-analytics__donut-center">
          <span className="matchmaker-analytics__donut-center-label">Quiz</span>
          <span className="matchmaker-analytics__donut-center-value">{total.toLocaleString('vi-VN')}</span>
        </div>
      </div>
      <ul className="matchmaker-analytics__legend">
        {segments.map((seg) => (
          <li key={seg.label} className="matchmaker-analytics__legend-item">
            <span className="matchmaker-analytics__legend-dot" style={{ background: seg.color }} />
            <span className="matchmaker-analytics__legend-label">{seg.label}</span>
            <span className="matchmaker-analytics__legend-value">
              {seg.pct.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
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
        ...item,
        color: VIEWING_COLORS[item.key] || CHART_FALLBACK_COLORS[index % CHART_FALLBACK_COLORS.length],
      })),
    [items],
  );

  const maxPct = Math.max(...rows.map((row) => row.percentage), 1);

  if (rows.length === 0) {
    return <p className="matchmaker-analytics__empty">Chưa có dữ liệu nơi xem.</p>;
  }

  return (
    <div className="matchmaker-analytics__bar-chart">
      {rows.map((row) => (
        <div key={row.key} className="matchmaker-analytics__bar-row">
          <div className="matchmaker-analytics__bar-head">
            <span className="matchmaker-analytics__bar-label">{row.label}</span>
            <span className="matchmaker-analytics__bar-meta">
              {row.count.toLocaleString('vi-VN')} ·{' '}
              {row.percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
            </span>
          </div>
          <div className="matchmaker-analytics__bar-track">
            <div
              className="matchmaker-analytics__bar-fill"
              style={{
                width: `${(row.percentage / maxPct) * 100}%`,
                background: `linear-gradient(90deg, ${row.color}, ${row.color}cc)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const MatchmakerAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setError('');
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

  const handleRefresh = () => {
    setLoading(true);
    loadAnalytics();
  };

  const topMood = analytics?.moodDistribution?.[0];

  return (
    <TabTransition>
      <AdminPage className="matchmaker-analytics">
        <PageHeader
          eyebrow="Phân tích khán giả"
          title="Thống kê quiz gợi ý phim"
          description="Phân bố tâm trạng và nơi xem từ quiz trên trang chủ — gợi ý điều phối suất chiếu và nhập phim VOD."
          variant="display"
        />

        {loading && !analytics ? (
          <div className="matchmaker-analytics__loading">
            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            <span>Đang tải thống kê quiz...</span>
          </div>
        ) : error ? (
          <div className="matchmaker-analytics__error-panel">
            <p>{error}</p>
            <button type="button" className="matchmaker-analytics__retry-btn" onClick={handleRefresh}>
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
                <h2 className="matchmaker-analytics__chart-title">Phân bố tâm trạng</h2>
                <MoodDonutChart items={analytics?.moodDistribution} />
              </section>
              <section className="matchmaker-analytics__chart-panel">
                <h2 className="matchmaker-analytics__chart-title">Nơi xem ưa thích</h2>
                <ViewingBarChart items={analytics?.viewingDistribution} />
              </section>
            </div>
          </>
        )}
      </AdminPage>
    </TabTransition>
  );
};

export default MatchmakerAnalyticsPage;
