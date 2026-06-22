import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, TrendingUp, ShoppingBag, Package, DollarSign } from 'lucide-react';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import '../pages/DashboardPage.css';
import './AdminComboRevenuePage.css';

const CHART_COLORS = ['#a855f7', '#ec4899', '#f97316', '#06b6d4', '#10b981', '#6366f1'];

const formatMoney = (val) => {
  const num = Number(val) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M đ`;
  return `${new Intl.NumberFormat('vi-VN').format(num)}đ`;
};

const formatMoneyFull = (val) => `${new Intl.NumberFormat('vi-VN').format(Number(val) || 0)}đ`;

const formatDayLabel = (isoDate) => {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
};

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
        <circle key={labels[i]} cx={p.x} cy={p.y} r="4" fill="#0f1322" stroke={color} strokeWidth="2" />
      ))}
      {labels.map((label, i) => (
        <text key={label} x={coords[i].x} y={height - 10} textAnchor="middle" className="dashboard-chart-x-label">
          {label}
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
        <span className="dashboard-donut-center-value">{formatMoney(total)}</span>
      </div>
    </div>
  );
};

const AdminComboRevenuePage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const chartData = useMemo(() => {
    if (!stats) return null;
    const byCombo = stats.byCombo || [];
    const daily = stats.dailyRevenue || [];
    return {
      donutSegments: byCombo.map((item, i) => ({
        label: item.comboName,
        value: Number(item.revenue) || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      dailyLabels: daily.map((d) => formatDayLabel(d.date)),
      dailyValues: daily.map((d) => Number(d.revenue) || 0),
    };
  }, [stats]);

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

  const kpis = [
    {
      label: 'Doanh thu tháng',
      value: formatMoney(stats?.totalRevenueThisMonth),
      change: growthLabel,
      positive: growth >= 0,
      icon: DollarSign,
    },
    {
      label: 'Đơn có bắp nước',
      value: new Intl.NumberFormat('vi-VN').format(stats?.totalOrdersThisMonth ?? 0),
      change: 'Tháng này',
      positive: true,
      icon: ShoppingBag,
    },
    {
      label: 'Combo đã bán',
      value: new Intl.NumberFormat('vi-VN').format(stats?.totalItemsSoldThisMonth ?? 0),
      change: 'Số lượng',
      positive: true,
      icon: Package,
    },
    {
      label: 'Tháng trước',
      value: formatMoney(stats?.totalRevenueLastMonth),
      change: growthLabel,
      positive: growth >= 0,
      icon: TrendingUp,
    },
  ];

  const donutSegments = chartData?.donutSegments?.length
    ? chartData.donutSegments
    : [{ label: 'Chưa có dữ liệu', value: 1, color: '#334155' }];

  return (
    <div className="dashboard-page combo-revenue-page">
      <header className="dashboard-page-header">
        <p className="combo-revenue-eyebrow">Trung tâm kinh doanh</p>
        <h1 className="dashboard-page-title">Doanh thu bắp nước</h1>
        <p className="dashboard-page-desc">
          Theo dõi doanh thu combo, số đơn và xu hướng bán hàng 7 ngày gần nhất.
        </p>
      </header>

      <div className="dashboard-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="dashboard-kpi-card">
            <div className="dashboard-kpi-top">
              <span className="dashboard-kpi-label">{kpi.label}</span>
              <kpi.icon className="dashboard-kpi-icon text-amber-500/70" />
            </div>
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-values">
                <span className="dashboard-kpi-value">{kpi.value}</span>
                <span className={`dashboard-kpi-change ${kpi.positive ? 'is-positive' : 'is-negative'}`}>
                  {kpi.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <h2 className="dashboard-panel-title">Doanh thu 7 ngày</h2>
            <p className="dashboard-panel-subtitle">Tổng giá trị combo trong các đơn đã xác nhận</p>
          </div>
          <div className="dashboard-chart-area">
            {chartData?.dailyValues?.length ? (
              <AreaChart labels={chartData.dailyLabels} values={chartData.dailyValues} color="#f59e0b" />
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
