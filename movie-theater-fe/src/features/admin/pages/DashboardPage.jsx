import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, TrendingUp, Ticket, DollarSign, Percent, Film } from 'lucide-react';
import { adminDashboardService } from '../api/adminDashboardService';
import TabTransition from '../../../shared/components/TabTransition';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import './DashboardPage.css';

const CHART_COLORS = ['#a855f7', '#ec4899', '#f97316', '#06b6d4', '#10b981', '#6366f1'];

const generateSparkline = (seed, count = 14) => {
  const base = Math.max(Number(seed) || 1, 1);
  return Array.from({ length: count }, (_, i) => {
    const wave = Math.sin(i * 0.65 + base * 0.01) * 0.12;
    const trend = 0.55 + (i / (count - 1)) * 0.45;
    return base * trend * (1 + wave);
  });
};

const Sparkline = ({ data, color = '#ef4444', className = '' }) => {
  const width = 120;
  const height = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`dashboard-sparkline ${className}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const AreaChart = ({ labels, values, color = '#a855f7' }) => {
  const width = 560;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...values, 1);
  const minVal = 0;

  const coords = values.map((v, i) => ({
    x: pad.left + (i / Math.max(values.length - 1, 1)) * innerW,
    y: pad.top + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH,
  }));

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + innerH - t * innerH,
    label: Math.round(minVal + t * (maxVal - minVal)).toLocaleString('vi-VN'),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-area-chart">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={`y-tick-${i}`}>
          <line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" className="dashboard-chart-axis-label">{tick.label}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((p, i) => (
        <circle key={`point-${i}`} cx={p.x} cy={p.y} r="4" fill="#0f1322" stroke={color} strokeWidth="2" />
      ))}
      {labels.map((label, i) => (
        <text
          key={`x-label-${i}`}
          x={coords[i].x}
          y={height - 10}
          textAnchor="middle"
          className="dashboard-chart-x-label"
        >
          {label.length > 10 ? `${label.slice(0, 9)}…` : label}
        </text>
      ))}
    </svg>
  );
};

const DonutChart = ({ segments }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const stroke = 22;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = -90;

  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const sweep = pct * 360;
    const start = angle;
    angle += sweep;
    const end = angle;
    const large = sweep > 180 ? 1 : 0;
    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(start));
    const y1 = cy + r * Math.sin(rad(start));
    const x2 = cx + r * Math.cos(rad(end));
    const y2 = cy + r * Math.sin(rad(end));
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    return { d, color: seg.color || CHART_COLORS[i % CHART_COLORS.length], pct, ...seg };
  });

  return (
    <div className="dashboard-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="dashboard-donut-chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <path
            key={`${arc.label}-${i}`}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="dashboard-donut-center">
        <span className="dashboard-donut-center-label">Tổng</span>
        <span className="dashboard-donut-center-value">{total.toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cinemas');

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminDashboardService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_DASHBOARD, fetchStats);

  const formatRevenue = (val) => {
    if (val == null) return '0';
    const num = Number(val);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatRevenueFull = (val) => {
    if (val == null) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(Number(val))}đ`;
  };

  const chartData = useMemo(() => {
    if (!stats) return null;

    const cinemas = (stats.cinemas || []).slice(0, 6);
    const genres = [...(stats.genres || [])]
      .sort((a, b) => (b.occupancyRate || 0) - (a.occupancyRate || 0))
      .slice(0, 6);

    const topMovies = (stats.topMovies || []).slice(0, 6);
    const movieRevenues = topMovies.map((m) => Number(m.revenue) || 0);

    const cinemaRevenues = cinemas.map((c) => Number(c.revenue) || 0);
    const genreOccupancy = genres.map((g) => g.occupancyRate || 0);

    const donutSegments = cinemas.map((c, i) => ({
      label: c.name,
      value: Number(c.revenue) || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })).filter((s) => s.value > 0);

    return {
      cinemas,
      genres,
      topMovies,
      cinemaRevenues,
      genreOccupancy,
      movieRevenues,
      donutSegments: donutSegments.length ? donutSegments : [{ label: 'Chưa có dữ liệu', value: 1, color: '#334155' }],
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-gray-400 text-sm font-medium">Đang tải bảng điều khiển...</span>
      </div>
    );
  }

  const revenueVal = stats ? formatRevenue(stats.totalRevenue) : '0';
  const transactionVal = stats ? new Intl.NumberFormat('vi-VN').format(stats.totalTransactions) : '0';
  const growthVal = stats ? stats.growth : 0;
  const conversionVal = stats ? stats.conversionRate : 0;
  const growthLabel = growthVal >= 0 ? `+${growthVal.toFixed(1)}%` : `${growthVal.toFixed(1)}%`;
  const isGrowthPositive = growthVal >= 0;

  const kpis = [
    {
      id: 'revenue',
      label: 'Doanh thu tháng',
      value: revenueVal,
      suffix: 'đ',
      change: growthLabel,
      positive: isGrowthPositive,
      sparkColor: '#ef4444',
      spark: generateSparkline(Number(stats?.totalRevenue) || 100),
      icon: DollarSign,
    },
    {
      id: 'transactions',
      label: 'Giao dịch',
      value: transactionVal,
      change: isGrowthPositive ? growthLabel : `${Math.abs(growthVal).toFixed(1)}%`,
      positive: (stats?.totalTransactions || 0) > 0,
      sparkColor: '#ef4444',
      spark: generateSparkline(stats?.totalTransactions || 50),
      icon: Ticket,
    },
    {
      id: 'conversion',
      label: 'Tỷ lệ chuyển đổi',
      value: conversionVal.toFixed(1),
      suffix: '%',
      change: `${conversionVal >= 10 ? '+' : ''}${(conversionVal * 0.1).toFixed(1)}%`,
      positive: conversionVal >= 5,
      sparkColor: '#ef4444',
      spark: generateSparkline(conversionVal * 100 || 20),
      icon: Percent,
    },
    {
      id: 'growth',
      label: 'Tăng trưởng',
      value: Math.abs(growthVal).toFixed(1),
      suffix: '%',
      change: growthLabel,
      positive: isGrowthPositive,
      sparkColor: '#ef4444',
      spark: generateSparkline(Math.abs(growthVal) * 1000 || 30),
      icon: TrendingUp,
    },
  ];

  const tabs = [
    { id: 'cinemas', label: 'Doanh thu rạp' },
    { id: 'movies', label: 'Top phim' },
    { id: 'genres', label: 'Thể loại phim' },
    { id: 'overview', label: 'Tổng quan' },
  ];

  const activeChart =
    activeTab === 'movies'
      ? {
          labels: chartData?.topMovies.map((m) => m.title) || [],
          values: chartData?.movieRevenues || [],
          title: 'Top phim doanh thu cao',
          subtitle: 'Tổng doanh thu vé rạp và VOD theo phim',
        }
      : activeTab === 'genres'
      ? {
          labels: chartData?.genres.map((g) => g.name) || [],
          values: chartData?.genreOccupancy || [],
          title: 'Tỷ lệ lấp đầy theo thể loại',
          subtitle: 'Phân tích xu hướng khán giả theo genre',
        }
      : activeTab === 'overview'
        ? {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            values: generateSparkline(Number(stats?.totalRevenue) || 100, 7),
            title: 'Xu hướng doanh thu tuần',
            subtitle: 'Ước tính từ dữ liệu giao dịch hiện tại',
          }
        : {
            labels: chartData?.cinemas.map((c) => c.name) || [],
            values: chartData?.cinemaRevenues || [],
            title: 'Doanh thu theo cụm rạp',
            subtitle: 'So sánh hiệu suất kinh doanh từng chi nhánh',
          };

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <h1 className="dashboard-page-title">Bảng điều khiển</h1>
        <p className="dashboard-page-desc">Tổng quan vận hành và phân tích hệ thống rạp chiếu phim</p>
      </header>

      <div className="dashboard-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="dashboard-kpi-card">
            <div className="dashboard-kpi-top">
              <span className="dashboard-kpi-label">{kpi.label}</span>
              <kpi.icon className="dashboard-kpi-icon" />
            </div>
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-values">
                <span className="dashboard-kpi-value">
                  {kpi.value}
                  {kpi.suffix && <span className="dashboard-kpi-suffix">{kpi.suffix}</span>}
                </span>
                <span className={`dashboard-kpi-change ${kpi.positive ? 'is-positive' : 'is-negative'}`}>
                  {kpi.change}
                </span>
              </div>
              <Sparkline data={kpi.spark} color={kpi.sparkColor} />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`dashboard-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <TabTransition activeKey={activeTab} className="dashboard-charts-grid">
        <div className="dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2 className="dashboard-panel-title">{activeChart.title}</h2>
              <p className="dashboard-panel-subtitle">{activeChart.subtitle}</p>
            </div>
          </div>
          <div className="dashboard-chart-area">
            {activeChart.labels.length > 0 ? (
              <AreaChart labels={activeChart.labels} values={activeChart.values} />
            ) : (
              <div className="dashboard-empty-chart">Chưa có dữ liệu biểu đồ</div>
            )}
          </div>
          <div className="dashboard-chart-legend">
            <span className="dashboard-legend-dot" style={{ background: '#a855f7' }} />
            <span>{activeTab === 'genres' ? 'Tỷ lệ lấp đầy (%)' : 'Doanh thu (đ)'}</span>
          </div>
        </div>

        <div className="dashboard-chart-panel dashboard-donut-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2 className="dashboard-panel-title">Phân bổ doanh thu</h2>
              <p className="dashboard-panel-subtitle">Theo cụm rạp chiếu</p>
            </div>
          </div>
          <DonutChart segments={chartData?.donutSegments || []} />
          <ul className="dashboard-donut-legend">
            {(chartData?.donutSegments || []).map((seg, i) => (
              <li key={`${seg.label}-${i}`} className="dashboard-donut-legend-item">
                <span className="dashboard-legend-dot" style={{ background: seg.color }} />
                <span className="dashboard-donut-legend-label">{seg.label}</span>
                <span className="dashboard-donut-legend-value">{formatRevenueFull(seg.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </TabTransition>

      <div className="dashboard-bottom-grid">
        <div className="dashboard-mini-panel">
          <h3 className="dashboard-mini-title">
            <Film className="inline w-4 h-4 mr-1.5 -mt-0.5 text-amber-400" aria-hidden />
            Top phim doanh thu
          </h3>
          <ul className="dashboard-rank-list">
            {(stats?.topMovies || []).length === 0 && (
              <li className="text-sm text-gray-500 py-2">Chưa có dữ liệu doanh thu theo phim</li>
            )}
            {(stats?.topMovies || []).slice(0, 5).map((movie, i) => (
              <li key={`movie-${movie.uuid || i}`} className="dashboard-rank-item">
                <span className="dashboard-rank-index">{i + 1}</span>
                <div className="dashboard-rank-info">
                  <span className="dashboard-rank-name">{movie.title}</span>
                  <span className="dashboard-rank-meta">{movie.bookingCount ?? 0} giao dịch</span>
                </div>
                <span className="dashboard-rank-value">{formatRevenueFull(movie.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-mini-panel">
          <h3 className="dashboard-mini-title">Top cụm rạp</h3>
          <ul className="dashboard-rank-list">
            {(stats?.cinemas || []).slice(0, 5).map((cinema, i) => (
              <li key={`cinema-${i}-${cinema.name}`} className="dashboard-rank-item">
                <span className="dashboard-rank-index">{i + 1}</span>
                <div className="dashboard-rank-info">
                  <span className="dashboard-rank-name">{cinema.name}</span>
                  <span className="dashboard-rank-meta">{cinema.occupancyRate}% lấp đầy</span>
                </div>
                <span className="dashboard-rank-value">{formatRevenueFull(cinema.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-mini-panel">
          <h3 className="dashboard-mini-title">Thể loại nổi bật</h3>
          <ul className="dashboard-rank-list">
            {[...(stats?.genres || [])]
              .sort((a, b) => (b.occupancyRate || 0) - (a.occupancyRate || 0))
              .slice(0, 5)
              .map((genre, i) => (
                <li key={`genre-${i}-${genre.name}`} className="dashboard-rank-item">
                  <span className="dashboard-rank-index">{i + 1}</span>
                  <div className="dashboard-rank-info">
                    <span className="dashboard-rank-name">{genre.name}</span>
                    <div className="dashboard-rank-bar-wrap">
                      <div className="dashboard-rank-bar" style={{ width: `${Math.min(genre.occupancyRate || 0, 100)}%` }} />
                    </div>
                  </div>
                  <span className="dashboard-rank-value">{genre.occupancyRate}%</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
