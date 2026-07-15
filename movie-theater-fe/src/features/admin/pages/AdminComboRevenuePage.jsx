import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, TrendingUp, ShoppingBag, Package, DollarSign } from 'lucide-react';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import AdminKpiGrid from '../components/AdminKpiGrid';
import { shiftPeriod, todayYmd } from '../utils/revenueSeriesNav';
import '../pages/DashboardPage.css';
import './AdminComboRevenuePage.css';

const CHART_COLORS = ['#a855f7', '#ec4899', '#f97316', '#06b6d4', '#10b981', '#6366f1'];

const GRANULARITIES = [
  { id: 'day', label: 'Ngày', subtitle: 'Chi tiết theo giờ' },
  { id: 'week', label: 'Tuần', subtitle: 'Chi tiết 7 ngày trong tuần' },
  { id: 'month', label: 'Tháng', subtitle: 'Chi tiết theo ngày trong tháng' },
];

const formatMoney = (val) => {
  const num = Number(val) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M đ`;
  return `${new Intl.NumberFormat('vi-VN').format(num)}đ`;
};

const formatMoneyFull = (val) => `${new Intl.NumberFormat('vi-VN').format(Number(val) || 0)}đ`;

const AreaChart = ({ labels, values, color = '#a855f7' }) => {
  const width = 560;
  const height = 220;
  const pad = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...values, 1);

  const coords = values.map((v, i) => ({
    x: pad.left + (i / Math.max(values.length - 1, 1)) * innerW,
    y: pad.top + innerH - (v / maxVal) * innerH,
  }));

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${pad.top + innerH} L ${coords[0].x} ${pad.top + innerH} Z`;

  // Keep at most ~12 x-labels and shrink dots when the period has many buckets (24h / ~31 days).
  const labelStep = Math.max(1, Math.ceil(labels.length / 12));
  const pointRadius = values.length > 16 ? 2.5 : 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-area-chart">
      <defs>
        <linearGradient id="comboAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = pad.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" className="dashboard-chart-axis-label">
              {Math.round(maxVal * t).toLocaleString('vi-VN')}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#comboAreaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {coords.map((p, i) => (
        <circle key={`pt-${i}`} cx={p.x} cy={p.y} r={pointRadius} fill="#0f1322" stroke={color} strokeWidth="2" />
      ))}
      {labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== labels.length - 1) return null;
        return (
          <text key={`lb-${i}`} x={coords[i].x} y={height - 10} textAnchor="middle" className="dashboard-chart-x-label">
            {label}
          </text>
        );
      })}
    </svg>
  );
};

const DonutChart = ({ segments }) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const stroke = 22;
  const computedTotal = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const displayTotal = segments.length === 1 && segments[0].isFallback ? 0 : segments.reduce((s, seg) => s + seg.value, 0);
  let angle = -90;

  const arcs = segments.map((seg, i) => {
    const pct = seg.value / computedTotal;
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
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: seg.color, ...seg };
  });

  return (
    <div className="dashboard-donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="dashboard-donut-chart">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.d} fill="none" stroke={arc.color} strokeWidth={stroke} />
        ))}
      </svg>
      <div className="dashboard-donut-center">
        <span className="dashboard-donut-center-label">Tháng này</span>
        <span className="dashboard-donut-center-value">{formatMoney(displayTotal)}</span>
      </div>
    </div>
  );
};

const AdminComboRevenuePage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [granularity, setGranularity] = useState('day');
  const [anchor, setAnchor] = useState(() => todayYmd());
  const [series, setSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await comboService.getComboRevenueStats();
        setStats(data);
      } catch (err) {
        notificationService.error(err.message || 'Không thể tải báo cáo doanh thu bắp nước.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let active = true;
    const loadSeries = async () => {
      setSeriesLoading(true);
      try {
        const data = await comboService.getComboRevenueSeries(granularity, anchor);
        if (active) setSeries(data);
      } catch {
        if (active) setSeries(null);
      } finally {
        if (active) setSeriesLoading(false);
      }
    };
    loadSeries();
    return () => {
      active = false;
    };
  }, [granularity, anchor]);

  const handlePeriodShift = (dir) => {
    setAnchor((prev) => shiftPeriod(series?.periodStartDate || prev, granularity, dir));
  };

  const chartData = useMemo(() => {
    if (!stats) return null;
    const byCombo = stats.byCombo || [];
    return {
      donutSegments: byCombo.map((item, i) => ({
        label: item.comboName,
        value: Number(item.revenue) || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
    };
  }, [stats]);

  const activeGranularityMeta = GRANULARITIES.find((g) => g.id === granularity) || GRANULARITIES[0];
  const seriesPoints = series?.points || [];

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-gray-400 text-sm">Đang tải báo cáo doanh thu...</span>
      </div>
    );
  }

  const growth = stats?.growth ?? 0;
  const growthLabel = growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;

  const comboKpis = [
    {
      label: 'Doanh thu tháng',
      value: formatMoney(stats?.totalRevenueThisMonth),
      badge: growthLabel,
      icon: DollarSign,
      color: 'text-amber-400',
      kpiClass: 'kpi-revenue',
    },
    {
      label: 'Đơn có bắp nước',
      value: new Intl.NumberFormat('vi-VN').format(stats?.totalOrdersThisMonth ?? 0),
      badge: 'tháng này',
      icon: ShoppingBag,
      color: 'text-emerald-400',
      kpiClass: 'kpi-showing',
    },
    {
      label: 'Combo đã bán',
      value: new Intl.NumberFormat('vi-VN').format(stats?.totalItemsSoldThisMonth ?? 0),
      badge: 'số lượng',
      icon: Package,
      color: 'text-blue-400',
      kpiClass: 'kpi-upcoming',
    },
    {
      label: 'Doanh thu tháng trước',
      value: formatMoney(stats?.totalRevenueLastMonth),
      badge: 'để so sánh',
      icon: TrendingUp,
      color: 'text-pink-400',
      kpiClass: 'kpi-total',
    },
  ];

  const donutSegments = chartData?.donutSegments?.length
    ? chartData.donutSegments
    : [{ label: 'Chưa có dữ liệu', value: 1, color: '#334155', isFallback: true }];

  return (
    <div className="dashboard-page combo-revenue-page">
      <header className="dashboard-page-header">
        <p className="combo-revenue-eyebrow">Trung tâm kinh doanh</p>
        <h1 className="dashboard-page-title">Doanh thu bắp nước</h1>
        <p className="dashboard-page-desc">
          Theo dõi doanh thu combo, số đơn và xu hướng bán hàng theo ngày, tuần, tháng.
        </p>
      </header>

      <AdminKpiGrid items={comboKpis} />

      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-panel">
          <div className="dashboard-revenue-trend-head">
            <div>
              <h2 className="dashboard-panel-title">Xu hướng doanh thu combo</h2>
              <p className="dashboard-panel-subtitle">
                {activeGranularityMeta.subtitle} · combo trong đơn đã xác nhận
              </p>
            </div>
            <div className="dashboard-granularity-toggle" role="tablist" aria-label="Khoảng thời gian">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={granularity === g.id}
                  className={`dashboard-granularity-btn ${granularity === g.id ? 'is-active' : ''}`}
                  onClick={() => setGranularity(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-period-nav">
            <button
              type="button"
              className="dashboard-period-nav-btn"
              onClick={() => handlePeriodShift(-1)}
              aria-label="Kỳ trước"
            >
              ◀
            </button>
            <span className="dashboard-period-nav-label">
              {series?.periodLabel || activeGranularityMeta.label}
            </span>
            <button
              type="button"
              className="dashboard-period-nav-btn"
              onClick={() => handlePeriodShift(1)}
              disabled={!series?.canGoNext}
              aria-label="Kỳ sau"
            >
              ▶
            </button>
            <input
              type="date"
              className="dashboard-period-date"
              value={series?.periodStartDate || anchor}
              max={todayYmd()}
              onChange={(e) => e.target.value && setAnchor(e.target.value)}
              aria-label="Chọn ngày"
            />
          </div>

          <div className="dashboard-revenue-trend-totals">
            <div className="dashboard-revenue-trend-total">
              <span className="dashboard-revenue-trend-total-label">Tổng doanh thu kỳ</span>
              <strong className="dashboard-revenue-trend-total-value">
                {formatMoneyFull(series?.totalRevenue)}
              </strong>
            </div>
            <div className="dashboard-revenue-trend-total">
              <span className="dashboard-revenue-trend-total-label">Đơn có combo</span>
              <strong className="dashboard-revenue-trend-total-value">
                {new Intl.NumberFormat('vi-VN').format(series?.totalTransactions || 0)}
              </strong>
            </div>
          </div>

          <div className="dashboard-chart-area">
            {seriesLoading ? (
              <div className="dashboard-empty-chart">Đang tải dữ liệu…</div>
            ) : seriesPoints.length > 0 ? (
              <AreaChart
                labels={seriesPoints.map((p) => p.label)}
                values={seriesPoints.map((p) => Number(p.revenue) || 0)}
                color="#f59e0b"
              />
            ) : (
              <div className="dashboard-empty-chart">Chưa có dữ liệu biểu đồ</div>
            )}
          </div>
        </div>

        <div className="dashboard-chart-panel dashboard-donut-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">Phân bổ theo combo</h2>
            <p className="dashboard-panel-subtitle">Doanh thu tháng hiện tại</p>
          </div>
          <DonutChart segments={donutSegments} />
          <ul className="dashboard-donut-legend">
            {(stats?.byCombo || []).map((item, i) => (
              <li key={item.comboUuid} className="dashboard-donut-legend-item">
                <span className="dashboard-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="dashboard-donut-legend-label">{item.comboName}</span>
                <span className="dashboard-donut-legend-value">{formatMoneyFull(item.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dashboard-mini-panel combo-revenue-table-panel">
        <h3 className="dashboard-mini-title">Chi tiết doanh thu theo combo (tháng này)</h3>
        {(stats?.byCombo || []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Chưa có giao dịch bắp nước trong tháng.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="combo-revenue-table">
              <thead>
                <tr>
                  <th>Combo</th>
                  <th>Số lượng</th>
                  <th>Doanh thu</th>
                  <th>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                {(stats.byCombo || []).map((item) => {
                  const total = Number(stats.totalRevenueThisMonth) || 1;
                  const pct = Math.round(((Number(item.revenue) || 0) / total) * 100);
                  return (
                    <tr key={item.comboUuid}>
                      <td className="font-semibold text-white">{item.comboName}</td>
                      <td>{item.quantitySold}</td>
                      <td className="text-amber-400 font-bold">{formatMoneyFull(item.revenue)}</td>
                      <td>
                        <div className="combo-revenue-bar-wrap">
                          <div className="combo-revenue-bar" style={{ width: `${pct}%` }} />
                          <span>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminComboRevenuePage;
