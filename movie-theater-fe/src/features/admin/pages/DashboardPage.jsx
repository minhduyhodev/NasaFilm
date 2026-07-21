import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { logger } from '../../../shared/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Film,
  Headphones,
  Image,
  Loader2,
  Receipt,
  RefreshCw,
  Tags,
  Target,
  Ticket,
  TrendingUp,
  Undo2,
  Users,
} from 'lucide-react';
import { adminDashboardService } from '../api/adminDashboardService';
import { adminMissionService } from '../api/adminMissionService';
import { AdminPage, FilterPills } from '../components';
import AdminSelectDropdown from '../components/AdminSelectDropdown';
import DashboardViewTransition from '../../../shared/components/DashboardViewTransition';
import PosterImage from '../../../shared/components/PosterImage';
import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { supportService } from '../../../shared/services/supportService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { shiftPeriod, todayYmd } from '../utils/revenueSeriesNav';
import './DashboardPage.css';

const CHART_COLORS = ['#3b82f6', '#14b8a6', '#f97316', '#94a3b8', '#a78bfa', '#f43f5e'];
const RING_COLORS = ['#3b82f6', '#14b8a6', '#f97316'];

const DASHBOARD_VIEWS = [
  { id: 'revenue', title: 'Phân tích doanh thu', subtitle: 'Doanh thu, rạp, phòng chiếu và tỉ lệ lấp đầy' },
  { id: 'content', title: 'Nội dung & nhiệm vụ', subtitle: 'Media, phim hot, thể loại hot và tỉ lệ hoàn thành' },
  { id: 'activity', title: 'Hoạt động gần đây', subtitle: 'Theo dõi sự kiện vận hành và nhảy tới trang xử lý' },
];

const GRANULARITIES = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

const DonutChart = ({ segments, centerValue }) => {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const stroke = 24;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = -90;

  const arcs = segments.map((seg, i) => {
    const pct = seg.value / total;
    const sweep = Math.max(pct * 360, pct > 0 ? 0.8 : 0);
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
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      color: seg.color || CHART_COLORS[i % CHART_COLORS.length],
      ...seg,
    };
  });

  return (
    <div className="dash-donut">
      <svg viewBox={`0 0 ${size} ${size}`} className="dash-donut__svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <path key={`${arc.label}-${i}`} d={arc.d} fill="none" stroke={arc.color} strokeWidth={stroke} />
        ))}
      </svg>
      <div className="dash-donut__center">
        <strong>{centerValue}</strong>
        <span>Đồng</span>
      </div>
    </div>
  );
};

const MissionRing = ({ label, pct, detail, hint, color }) => {
  const size = 118;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safePct = Math.min(100, Math.max(0, Number(pct) || 0));
  const offset = c - (safePct / 100) * c;

  return (
    <article className="dash-ring">
      <div className="dash-ring__gauge" style={{ '--ring': color }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--ring)"
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="dash-ring__center">
          <strong>{Math.round(safePct)}%</strong>
          <span>{label}</span>
        </div>
      </div>
      <p className="dash-ring__detail">{detail}</p>
      {hint ? <p className="dash-ring__hint">{hint}</p> : null}
    </article>
  );
};

const OccupancyBars = ({ items, emptyLabel }) => {
  const max = Math.max(...items.map((item) => Number(item.rate) || 0), 1);
  if (!items.length) {
    return <p className="dash-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="dash-bars">
      {items.map((item) => {
        const rate = Number(item.rate) || 0;
        return (
          <li key={item.key} className="dash-bars__item">
            <div className="dash-bars__meta">
              <strong>{item.label}</strong>
              {item.sub ? <span>{item.sub}</span> : null}
            </div>
            <div className="dash-bars__track" aria-hidden>
              <span style={{ width: `${Math.min(100, (rate / max) * 100)}%` }} />
            </div>
            <em>{rate.toFixed(1).replace('.', ',')}%</em>
          </li>
        );
      })}
    </ul>
  );
};

const SERIES_PLACEHOLDER_COUNT = 7;
/** Keep bounce visible even when API responds instantly. */
const SERIES_LOAD_MIN_MS = 1000;

const SeriesBar = ({ height, loading, index, title }) => {
  const reduceMotion = useReducedMotion();
  const safeHeight = Math.max(4, Number(height) || 4);
  const bounceHeights = [
    `${10 + (index % 4) * 6}%`,
    `${78 + (index % 3) * 6}%`,
    `${22 + (index % 5) * 5}%`,
    `${64 + (index % 2) * 10}%`,
    `${16 + (index % 3) * 8}%`,
  ];

  return (
    <motion.span
      className="dash-series__bar"
      title={title}
      initial={false}
      animate={
        reduceMotion
          ? { height: `${safeHeight}%` }
          : loading
            ? { height: bounceHeights }
            : { height: `${safeHeight}%` }
      }
      transition={
        reduceMotion
          ? { duration: 0 }
          : loading
            ? {
                duration: 1.35,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: [0.45, 0.05, 0.55, 0.95],
                delay: (index % 7) * 0.12,
              }
            : {
                duration: 1.05,
                ease: [0.22, 1, 0.36, 1],
                delay: index * 0.055,
              }
      }
    />
  );
};

const RevenueSeriesChart = ({ points, loading, formatRevenue }) => {
  const displayPoints = points.length
    ? points
    : Array.from({ length: SERIES_PLACEHOLDER_COUNT }, (_, i) => ({
        periodStart: `placeholder-${i}`,
        label: '···',
        revenue: 0,
        height: 24,
        placeholder: true,
      }));

  return (
    <div
      className={`dash-series__chart${loading ? ' is-loading' : ''}`}
      role="img"
      aria-busy={loading || undefined}
      aria-label="Biểu đồ doanh thu theo kỳ"
    >
      {displayPoints.map((point, index) => (
        <div
          key={`series-bar-${index}`}
          className="dash-series__col"
          title={point.placeholder ? undefined : formatRevenue(point.revenue)}
        >
          <div className="dash-series__bar-wrap">
            <SeriesBar
              height={point.height}
              loading={loading}
              index={index}
              title={point.placeholder ? undefined : formatRevenue(point.revenue)}
            />
          </div>
          <em>{point.label}</em>
        </div>
      ))}
    </div>
  );
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [missionAnalytics, setMissionAnalytics] = useState(null);
  const [mediaStats, setMediaStats] = useState({ actors: 0, countries: 0, genres: 0 });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeView, setActiveView] = useState('revenue');
  const [viewDirection, setViewDirection] = useState(1);
  const [revenueGranularity, setRevenueGranularity] = useState('week');
  const [revenueAnchor, setRevenueAnchor] = useState(() => todayYmd());
  const [revenueSeries, setRevenueSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [cinemaFilter, setCinemaFilter] = useState('all');
  const seriesReqIdRef = useRef(0);

  const fetchStats = useCallback(async () => {
    try {
      const [data, missionData, actors, countries, genres] = await Promise.all([
        adminDashboardService.getDashboardStats(),
        adminMissionService.getAnalytics().catch(() => null),
        movieService.getActors().catch(() => []),
        movieService.getCountries(true).catch(() => []),
        movieService.getGenres(true).catch(() => []),
      ]);
      setStats(data);
      setMissionAnalytics(missionData);
      setMediaStats({
        actors: Array.isArray(actors) ? actors.length : 0,
        countries: Array.isArray(countries) ? countries.length : 0,
        genres: Array.isArray(genres) ? genres.length : 0,
      });
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Failed to fetch dashboard stats', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const [bookingsRes, refundsRes, supportRes] = await Promise.all([
        bookingService.getAdminBookings('', { page: 0, size: 6 }).catch(() => ({ content: [] })),
        bookingService.getAdminPendingRefunds({ page: 0, size: 5 }).catch(() => ({ content: [] })),
        supportService.getAdminSupportRequests({ page: 0, size: 5 }).catch(() => []),
      ]);

      const bookingItems = (bookingsRes?.content || []).map((item) => ({
        id: `booking-${item.bookingUuid}`,
        type: 'booking',
        title: item.movieTitle || 'Đơn đặt vé mới',
        detail: [item.customerName, item.cinemaRoomName, item.status].filter(Boolean).join(' · '),
        at: item.createdAt,
        path: '/admin/bookings',
        icon: Ticket,
      }));

      const refundItems = (refundsRes?.content || []).slice(0, 5).map((item) => ({
        id: `refund-${item.refundUuid || item.bookingUuid}`,
        type: 'refund',
        title: 'Yêu cầu hoàn tiền',
        detail: [item.customerName || item.movieTitle, item.status].filter(Boolean).join(' · '),
        at: item.createdAt || item.requestedAt,
        path: '/admin/refunds',
        icon: Undo2,
      }));

      const supportList = Array.isArray(supportRes)
        ? supportRes
        : (supportRes?.content || []);
      const supportItems = supportList.slice(0, 5).map((item) => ({
        id: `support-${item.ticketCode || item.uuid}`,
        type: 'support',
        title: item.subject || item.ticketCode || 'Hỗ trợ khách hàng',
        detail: [item.ticketCode, item.status, item.customerName].filter(Boolean).join(' · '),
        at: item.updatedAt || item.createdAt,
        path: '/admin/support',
        icon: Headphones,
      }));

      const merged = [...bookingItems, ...refundItems, ...supportItems]
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
        .slice(0, 12);

      setActivities(merged);
    } catch (error) {
      logger.error('Failed to fetch dashboard activities', error);
      setActivities([]);
    }
  }, []);

  const fetchSeries = useCallback(async (granularity, date) => {
    const reqId = ++seriesReqIdRef.current;
    setSeriesLoading(true);
    const startedAt = Date.now();
    try {
      const data = await adminDashboardService.getRevenueSeries(granularity, date);
      const remaining = SERIES_LOAD_MIN_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      if (reqId !== seriesReqIdRef.current) return;
      setRevenueSeries(data);
    } catch (error) {
      logger.error('Failed to fetch revenue series', error);
      if (reqId !== seriesReqIdRef.current) return;
      setRevenueSeries(null);
    } finally {
      if (reqId === seriesReqIdRef.current) {
        setSeriesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSeries(revenueGranularity, revenueAnchor);
  }, [revenueGranularity, revenueAnchor, fetchSeries]);

  useEffect(() => {
    if (activeView === 'activity') {
      fetchActivities();
    }
  }, [activeView, fetchActivities]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_DASHBOARD, fetchStats);

  const switchView = (viewId) => {
    const currentIdx = DASHBOARD_VIEWS.findIndex((v) => v.id === activeView);
    const nextIdx = DASHBOARD_VIEWS.findIndex((v) => v.id === viewId);
    if (nextIdx < 0 || viewId === activeView) return;
    setViewDirection(nextIdx > currentIdx ? 1 : -1);
    setActiveView(viewId);
  };

  const stepView = (delta) => {
    const currentIdx = DASHBOARD_VIEWS.findIndex((v) => v.id === activeView);
    const nextIdx = (currentIdx + delta + DASHBOARD_VIEWS.length) % DASHBOARD_VIEWS.length;
    switchView(DASHBOARD_VIEWS[nextIdx].id);
  };

  const handlePeriodShift = useCallback((dir) => {
    setRevenueAnchor((prev) => shiftPeriod(revenueSeries?.periodStartDate || prev, revenueGranularity, dir));
  }, [revenueSeries, revenueGranularity]);

  const formatRevenueFull = (val) => {
    if (val == null) return '0đ';
    return `${new Intl.NumberFormat('vi-VN').format(Number(val))}đ`;
  };

  const formatRevenueShort = (val) => {
    const num = Number(val) || 0;
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')} triệu`;
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatRevenueCompact = (val) => {
    const num = Number(val) || 0;
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1_000) return `${Math.round(num / 1_000)}K`;
    return String(num);
  };

  const cinemaStats = useMemo(() => {
    const cinemas = (stats?.cinemas || []).slice(0, 6);
    const total = cinemas.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0) || 1;
    const segments = cinemas
      .map((c, i) => ({
        label: c.name,
        value: Number(c.revenue) || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
        pct: ((Number(c.revenue) || 0) / total) * 100,
        occupancyRate: Number(c.occupancyRate) || 0,
      }))
      .filter((s) => s.value > 0);
    return {
      cinemas,
      total,
      segments: segments.length ? segments : [{ label: 'Chưa có dữ liệu', value: 1, color: '#475569', pct: 100, occupancyRate: 0 }],
    };
  }, [stats]);

  const filteredSegments = useMemo(() => {
    if (cinemaFilter === 'all') return cinemaStats.segments;
    return cinemaStats.segments.filter((s) => s.label === cinemaFilter);
  }, [cinemaStats, cinemaFilter]);

  const cinemaOptions = useMemo(() => [
    { value: 'all', label: 'Theo rạp chiếu' },
    ...cinemaStats.cinemas.map((c) => ({ value: c.name, label: c.name })),
  ], [cinemaStats]);

  const topMovies = useMemo(() => (stats?.topMovies || []).slice(0, 6), [stats]);

  const hotGenres = useMemo(() => {
    return [...(stats?.genres || [])]
      .sort((a, b) => (Number(b.occupancyRate) || 0) - (Number(a.occupancyRate) || 0))
      .slice(0, 6)
      .map((g, i) => ({
        key: g.name || `genre-${i}`,
        label: g.name,
        rate: Number(g.occupancyRate) || 0,
      }));
  }, [stats]);

  const occupancyByCinema = useMemo(() => (
    (stats?.cinemas || []).slice(0, 6).map((c, i) => ({
      key: c.name || `cinema-${i}`,
      label: c.name,
      rate: Number(c.occupancyRate) || 0,
      sub: formatRevenueFull(c.revenue),
    }))
  ), [stats]);

  const rooms = useMemo(() => (stats?.rooms || []).slice(0, 8), [stats]);

  const seriesPoints = useMemo(() => {
    const points = revenueSeries?.points || [];
    const max = Math.max(...points.map((p) => Number(p.revenue) || 0), 1);
    return points.map((p) => ({
      ...p,
      height: Math.max(6, ((Number(p.revenue) || 0) / max) * 100),
    }));
  }, [revenueSeries]);

  const missionRings = useMemo(() => {
    const templates = (missionAnalytics?.topTemplates || []).slice(0, 3);
    return templates.map((item, index) => ({
      label: item.title || item.code,
      pct: item.completionRate ?? 0,
      detail: `${item.completedCount ?? 0} / ${item.enrolledCount ?? 0}`,
      hint: `${item.enrolledCount ?? 0} tham gia`,
      color: RING_COLORS[index % RING_COLORS.length],
    }));
  }, [missionAnalytics]);

  const growthVal = stats?.growth ?? 0;
  const growthLabel = `${growthVal >= 0 ? '↑' : '↓'} ${Math.abs(growthVal).toFixed(1).replace('.', ',')}%`;
  const periodRevenue = Number(revenueSeries?.totalRevenue ?? stats?.totalRevenue) || 0;
  const periodTxns = Number(revenueSeries?.totalTransactions ?? stats?.totalTransactions) || 0;
  const avgOccupancy = useMemo(() => {
    const list = stats?.cinemas || [];
    if (!list.length) return 0;
    return list.reduce((sum, c) => sum + (Number(c.occupancyRate) || 0), 0) / list.length;
  }, [stats]);
  const activeViewMeta = DASHBOARD_VIEWS.find((v) => v.id === activeView) || DASHBOARD_VIEWS[0];
  const donutCenterValue = formatRevenueShort(
    cinemaFilter === 'all' ? cinemaStats.total : (filteredSegments[0]?.value || 0),
  );

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <span className="text-sm font-medium text-gray-400">Đang tải bảng điều khiển...</span>
      </div>
    );
  }

  const revenueCards = [
    ...[
      { label: 'Tổng doanh thu kỳ', value: `${formatRevenueCompact(periodRevenue)}đ` },
      { label: 'Giao dịch kỳ', value: new Intl.NumberFormat('vi-VN').format(periodTxns) },
      { label: 'Tăng trưởng tháng', value: `${Math.abs(growthVal).toFixed(1)}%` },
      { label: 'Lấp đầy TB', value: `${avgOccupancy.toFixed(1)}%` },
    ].map((kpi) => (
      <article key={kpi.label} className="dash-kpi">
        <span>{kpi.label}</span>
        <strong>{kpi.value}</strong>
      </article>
    )),
    <section key="series" className={`dash-panel dash-series${seriesLoading ? ' is-loading' : ''}`}>
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Doanh thu theo kỳ</h2>
        </div>
        <span className="dash-panel__meta">
          {seriesLoading ? 'Đang tải…' : (revenueSeries?.periodLabel || 'Kỳ hiện tại')}
        </span>
      </header>
      {!seriesLoading && seriesPoints.length === 0 ? (
        <p className="dash-empty">Chưa có dữ liệu doanh thu theo kỳ</p>
      ) : (
        <RevenueSeriesChart
          points={seriesPoints}
          loading={seriesLoading}
          formatRevenue={formatRevenueFull}
        />
      )}
      <p className="dash-series__total">
        Tổng kỳ: <strong>{seriesLoading ? '…' : formatRevenueFull(periodRevenue)}</strong>
      </p>
    </section>,
    <section key="hero" className="dash-hero">
      <header className="dash-hero__head">
        <h2 className="dash-hero__title">
          Doanh thu theo rạp
          <CircleHelp size={14} aria-hidden />
        </h2>
      </header>
      <div className="dash-hero__body">
        <div className="dash-hero__stat">
          <p className="dash-hero__value">{formatRevenueFull(cinemaStats.total)}</p>
          <p className="dash-hero__label">Tổng doanh thu rạp</p>
          <p className={`dash-hero__trend${growthVal >= 0 ? ' is-up' : ' is-down'}`}>
            <TrendingUp size={14} aria-hidden />
            {growthLabel} so với kỳ trước
          </p>
        </div>
        <DonutChart segments={filteredSegments} centerValue={donutCenterValue} />
        <ul className="dash-legend">
          {filteredSegments.map((seg, i) => (
            <li key={`${seg.label}-${i}`}>
              <span className="dash-legend__dot" style={{ background: seg.color }} />
              <span className="dash-legend__name">{seg.label}</span>
              <span className="dash-legend__value">{formatRevenueFull(seg.value)}</span>
              <span className="dash-legend__pct">({(seg.pct ?? 0).toFixed(1).replace('.', ',')}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </section>,
    <section key="occupancy" className="dash-panel">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Tỉ lệ lấp đầy theo rạp</h2>
        </div>
        <Link to="/admin/cinemas" className="dash-panel__link">
          Quản lý rạp <ChevronRight size={14} />
        </Link>
      </header>
      <OccupancyBars items={occupancyByCinema} emptyLabel="Chưa có dữ liệu lấp đầy" />
    </section>,
    <section key="rooms" className="dash-panel">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Doanh thu & lấp đầy phòng chiếu</h2>
          <span className="dash-panel__count">{rooms.length}</span>
        </div>
        <Link to="/admin/showtimes" className="dash-panel__link">
          Suất chiếu <ChevronRight size={14} />
        </Link>
      </header>
      {rooms.length === 0 ? (
        <p className="dash-empty">Chưa có dữ liệu phòng chiếu</p>
      ) : (
        <ul className="dash-room-list">
          {rooms.map((room, index) => (
            <li key={`${room.name}-${room.cinemaName}-${index}`} className="dash-room-item">
              <div>
                <strong>{room.name}</strong>
                <span>{room.cinemaName}</span>
              </div>
              <div className="dash-room-item__stats">
                <em>{formatRevenueShort(room.revenue)}</em>
                <span>{(Number(room.occupancyRate) || 0).toFixed(1).replace('.', ',')}% lấp đầy</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>,
  ];

  const contentCards = [
    <section key="media" className="dash-panel dash-media">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">
            <Image size={15} aria-hidden />
            Quản lý media
          </h2>
        </div>
        <Link to="/admin/media" className="dash-panel__link">
          Mở danh mục <ChevronRight size={14} />
        </Link>
      </header>
      <div className="dash-media__grid">
        <Link to="/admin/media" className="dash-media__tile">
          <Users size={18} aria-hidden />
          <strong>{mediaStats.actors}</strong>
          <span>Diễn viên</span>
        </Link>
        <Link to="/admin/media" className="dash-media__tile">
          <Clapperboard size={18} aria-hidden />
          <strong>{mediaStats.countries}</strong>
          <span>Quốc gia</span>
        </Link>
        <Link to="/admin/media" className="dash-media__tile">
          <Tags size={18} aria-hidden />
          <strong>{mediaStats.genres}</strong>
          <span>Thể loại</span>
        </Link>
      </div>
    </section>,
    <section key="movies" className="dash-panel">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Phim hot</h2>
          <span className="dash-panel__count">{topMovies.length}</span>
        </div>
        <Link to="/admin/movies" className="dash-panel__link">
          Xem tất cả <ChevronRight size={14} />
        </Link>
      </header>
      <ul className="dash-show-list">
        {topMovies.length === 0 ? (
          <li className="dash-empty">Chưa có dữ liệu phim</li>
        ) : (
          topMovies.map((movie, index) => (
            <li key={movie.uuid || `movie-${index}`}>
              <Link to="/admin/movies" className="dash-show-item">
                <span className="dash-show-item__time">{String(index + 1).padStart(2, '0')}</span>
                <div className="dash-show-item__poster">
                  {movie.primaryMediaUrl ? (
                    <PosterImage src={movie.primaryMediaUrl} alt={movie.title} width={72} loading="lazy" />
                  ) : (
                    <Film size={14} />
                  )}
                </div>
                <div className="dash-show-item__copy">
                  <strong>{movie.title}</strong>
                  <span>{movie.bookingCount ?? 0} giao dịch · {formatRevenueFull(movie.revenue)}</span>
                </div>
                <ChevronRight size={16} className="dash-show-item__chevron" aria-hidden />
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>,
    <section key="genres" className="dash-panel">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Thể loại hot</h2>
        </div>
        <Link to="/admin/media" className="dash-panel__link">
          Quản lý thể loại <ChevronRight size={14} />
        </Link>
      </header>
      <OccupancyBars items={hotGenres} emptyLabel="Chưa có dữ liệu thể loại" />
    </section>,
    <section key="missions" className="dash-panel">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">
            <Target size={15} aria-hidden />
            Tỉ lệ nhiệm vụ hoàn thành
          </h2>
        </div>
        <Link to="/admin/missions" className="dash-panel__link">
          Xem tất cả <ChevronRight size={14} />
        </Link>
      </header>
      {missionRings.length === 0 ? (
        <p className="dash-empty">Chưa có dữ liệu nhiệm vụ</p>
      ) : (
        <div className="dash-rings">
          {missionRings.map((ring) => (
            <MissionRing key={ring.label} {...ring} />
          ))}
        </div>
      )}
    </section>,
  ];

  const activityCards = [
    <section key="activity-summary" className="dash-panel dash-activity-summary">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Tóm tắt vận hành</h2>
        </div>
      </header>
      <div className="dash-activity-summary__grid">
        <button type="button" className="dash-activity-summary__tile" onClick={() => navigate('/admin/bookings')}>
          <Ticket size={18} aria-hidden />
          <strong>{new Intl.NumberFormat('vi-VN').format(stats?.totalTransactions || 0)}</strong>
          <span>Giao dịch tháng</span>
        </button>
        <button type="button" className="dash-activity-summary__tile" onClick={() => navigate('/admin/refunds')}>
          <Undo2 size={18} aria-hidden />
          <strong>{activities.filter((a) => a.type === 'refund').length}</strong>
          <span>Hoàn tiền chờ xử lý</span>
        </button>
        <button type="button" className="dash-activity-summary__tile" onClick={() => navigate('/admin/support')}>
          <Headphones size={18} aria-hidden />
          <strong>{activities.filter((a) => a.type === 'support').length}</strong>
          <span>Hỗ trợ gần đây</span>
        </button>
        <button type="button" className="dash-activity-summary__tile" onClick={() => navigate('/admin/missions')}>
          <Receipt size={18} aria-hidden />
          <strong>{missionRings.length}</strong>
          <span>Nhiệm vụ theo dõi</span>
        </button>
      </div>
    </section>,
    <section key="activity-feed" className="dash-panel dash-activity-feed">
      <header className="dash-panel__head">
        <div className="dash-panel__title-row">
          <h2 className="dash-panel__title">Hoạt động gần đây</h2>
          <span className="dash-panel__count">{activities.length}</span>
        </div>
      </header>
      {activities.length === 0 ? (
        <p className="dash-empty">Chưa có hoạt động gần đây để hiển thị</p>
      ) : (
        <ul className="dash-activity-list">
          {activities.map((item) => {
            const Icon = item.icon || Ticket;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="dash-activity-item"
                  onClick={() => navigate(item.path)}
                >
                  <span className={`dash-activity-item__icon is-${item.type}`}>
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="dash-activity-item__copy">
                    <strong>{item.title}</strong>
                    <span>{item.detail || 'Nhấn để mở trang liên quan'}</span>
                  </span>
                  <span className="dash-activity-item__meta">
                    <em>{formatRelativeTime(item.at)}</em>
                    <ChevronRight size={16} aria-hidden />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>,
  ];

  const viewCards = {
    revenue: revenueCards,
    content: contentCards,
    activity: activityCards,
  };

  return (
    <AdminPage className={`dashboard-page dashboard-page--${activeView}`} softEnter={false}>
      <header className="dash-header">
        <div className="dash-header__top">
          <div className="dash-header__left">
            <button type="button" className="dash-header__nav" onClick={() => stepView(-1)} aria-label="Trang trước">
              <ChevronLeft size={18} />
            </button>
            <div className="dash-header__titles">
              <h1 className="dash-header__title">{activeViewMeta.title}</h1>
              <p className="dash-header__subtitle">{activeViewMeta.subtitle}</p>
            </div>
          </div>
          <div className="dash-header__right">
            <div className="dash-header__dots" aria-hidden>
              {DASHBOARD_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`dash-header__dot${activeView === view.id ? ' is-active' : ''}`}
                  onClick={() => switchView(view.id)}
                  aria-label={view.title}
                />
              ))}
            </div>
            <button type="button" className="dash-header__nav" onClick={() => stepView(1)} aria-label="Trang sau">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {activeView === 'revenue' ? (
          <div className="dash-header__filters">
            <div className="dash-period">
              <button
                type="button"
                className="dash-period__btn"
                onClick={() => handlePeriodShift(-1)}
                aria-label="Kỳ trước"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="dash-period__pill">
                <CalendarDays size={15} aria-hidden />
                <span>{revenueSeries?.periodLabel || 'Kỳ hiện tại'}</span>
              </div>
              <button
                type="button"
                className="dash-period__btn"
                onClick={() => handlePeriodShift(1)}
                disabled={!revenueSeries?.canGoNext}
                aria-label="Kỳ sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <AdminSelectDropdown
              value={cinemaFilter}
              options={cinemaOptions}
              onChange={setCinemaFilter}
              size="sm"
              className="dash-cinema-select"
            />

            <FilterPills
              value={revenueGranularity}
              onChange={setRevenueGranularity}
              items={GRANULARITIES.map((g) => ({ id: g.id, label: g.label }))}
              ariaLabel="Khoảng thời gian"
              className="dash-granularity"
            />
          </div>
        ) : null}
      </header>

      <DashboardViewTransition activeKey={activeView} direction={viewDirection}>
        {viewCards[activeView] || revenueCards}
      </DashboardViewTransition>

      {lastUpdated ? (
        <footer className="dash-footer">
          <RefreshCw size={12} aria-hidden />
          Dữ liệu cập nhật lúc{' '}
          {lastUpdated.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </footer>
      ) : null}
    </AdminPage>
  );
};

export default DashboardPage;
