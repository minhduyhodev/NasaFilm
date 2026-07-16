import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, TrendingUp, Ticket, DollarSign, Percent, Film, Building2, Tags } from 'lucide-react';
import { adminDashboardService } from '../api/adminDashboardService';
import { adminMissionService } from '../api/adminMissionService';
import { TopMissionsPanel, AdminPage, PageHeader, FilterPills, AdminDatePicker } from '../components';
import TabTransition from '../../../shared/components/TabTransition';
import PosterImage from '../../../shared/components/PosterImage';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { shiftPeriod, todayYmd } from '../utils/revenueSeriesNav';
import './DashboardPage.css';

const CHART_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#f97316', '#94a3b8'];

const GRANULARITIES = [
  { id: 'day', label: 'Ngày', subtitle: 'Chi tiết theo giờ' },
  { id: 'week', label: 'Tuần', subtitle: 'Chi tiết 7 ngày trong tuần' },
  { id: 'month', label: 'Tháng', subtitle: 'Chi tiết theo ngày trong tháng' },
];

const AreaChart = ({ labels, values, color = '#ef4444' }) => {
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

  // Keep at most ~12 x-labels and shrink dots when the period has many buckets (24h / ~31 days).
  const labelStep = Math.max(1, Math.ceil(labels.length / 12));
  const pointRadius = values.length > 16 ? 2.5 : 4;

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
        <circle key={`point-${i}`} cx={p.x} cy={p.y} r={pointRadius} fill="#0f1322" stroke={color} strokeWidth="2" />
      ))}
      {labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== labels.length - 1) return null;
        return (
          <text
            key={`x-label-${i}`}
            x={coords[i].x}
            y={height - 10}
            textAnchor="middle"
            className="dashboard-chart-x-label"
          >
            {label.length > 10 ? `${label.slice(0, 9)}…` : label}
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

const getRankIndexClass = (rank) => {
  if (rank === 1) return 'is-gold';
  if (rank === 2) return 'is-silver';
  if (rank === 3) return 'is-bronze';
  return '';
};

const MoviePosterThumb = ({ url, title }) => (
  <div className="dashboard-movie-poster">
    {url ? (
      <PosterImage
        src={url}
        alt={title || 'Poster phim'}
        width={120}
        loading="lazy"
        className="dashboard-movie-poster-img"
      />
    ) : (
      <div className="dashboard-movie-poster-fallback" aria-hidden>
        <Film className="h-5 w-5" />
      </div>
    )}
  </div>
);

const TopMovieRankRow = ({ movie, rank, maxRevenue, formatRevenueFull, variant = 'default' }) => {
  const revenue = Number(movie.revenue) || 0;
  const share = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  const isRunner = variant === 'runner';

  if (isRunner) {
    return (
      <li className="dashboard-movie-rank-item is-runner">
        <span className={`dashboard-rank-index ${getRankIndexClass(rank)}`}>{rank}</span>
        <MoviePosterThumb url={movie.primaryMediaUrl} title={movie.title} />
        <div className="dashboard-movie-rank-body">
          <span className="dashboard-rank-name" title={movie.title}>{movie.title}</span>
          <span className="dashboard-rank-meta">{movie.bookingCount ?? 0} giao dịch</span>
        </div>
        <div className="dashboard-runner-trail">
          <span className="dashboard-rank-value">{formatRevenueFull(movie.revenue)}</span>
          <div className="dashboard-rank-bar-wrap">
            <div className="dashboard-rank-bar dashboard-rank-bar--movie" style={{ width: `${share}%` }} />
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={`dashboard-movie-rank-item${isRunner ? ' is-runner' : ''}`}>
      <span className={`dashboard-rank-index ${getRankIndexClass(rank)}`}>{rank}</span>
      <MoviePosterThumb url={movie.primaryMediaUrl} title={movie.title} />
      <div className="dashboard-movie-rank-body">
        <span className="dashboard-rank-name" title={movie.title}>{movie.title}</span>
        <span className="dashboard-rank-meta">{movie.bookingCount ?? 0} giao dịch</span>
        {!isRunner && (
          <div className="dashboard-rank-bar-wrap">
            <div
              className="dashboard-rank-bar dashboard-rank-bar--movie"
              style={{ width: `${share}%` }}
            />
          </div>
        )}
      </div>
      {!isRunner && (
        <span className="dashboard-rank-value">{formatRevenueFull(movie.revenue)}</span>
      )}
    </li>
  );
};

const MovieSpotlightHero = ({ movie, formatRevenueFull, maxRevenue }) => {
  if (!movie) {
    return (
      <article className="dashboard-spotlight-hero dashboard-spotlight-hero--empty">
        <Film className="h-10 w-10 text-white/20" />
        <p>Chưa có dữ liệu phim dẫn đầu</p>
      </article>
    );
  }

  const revenue = Number(movie.revenue) || 0;
  const share = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

  return (
    <article className="dashboard-spotlight-hero">
      <div className="dashboard-spotlight-hero-poster">
        {movie.primaryMediaUrl ? (
          <PosterImage
            src={movie.primaryMediaUrl}
            alt={movie.title}
            width={240}
            loading="eager"
            className="dashboard-spotlight-hero-poster-img"
          />
        ) : (
          <div className="dashboard-spotlight-hero-poster-fallback">
            <Film className="h-7 w-7" />
          </div>
        )}
        <span className="dashboard-spotlight-hero-rank">#1</span>
      </div>
      <div className="dashboard-spotlight-hero-content">
        <span className="dashboard-spotlight-hero-badge">Phim dẫn đầu</span>
        <h3 className="dashboard-spotlight-title">{movie.title}</h3>
        <p className="dashboard-spotlight-meta">{movie.bookingCount ?? 0} giao dịch · vé rạp & VOD</p>
        <div className="dashboard-spotlight-stats">
          <div>
            <span className="dashboard-spotlight-stat-label">Doanh thu</span>
            <strong className="dashboard-spotlight-stat-value">{formatRevenueFull(movie.revenue)}</strong>
          </div>
          <div>
            <span className="dashboard-spotlight-stat-label">Thị phần</span>
            <strong className="dashboard-spotlight-stat-value">{share.toFixed(0)}%</strong>
          </div>
        </div>
        <div className="dashboard-rank-bar-wrap dashboard-spotlight-bar">
          <div className="dashboard-rank-bar dashboard-rank-bar--movie" style={{ width: `${share}%` }} />
        </div>
      </div>
    </article>
  );
};

const DashboardSpotlightSection = ({ stats, formatRevenueFull, maxMovieRevenue, maxCinemaRevenue }) => {
  const topMovies = stats?.topMovies || [];
  const spotlight = topMovies[0];
  const runners = topMovies.slice(1, 5);
  const topGenres = [...(stats?.genres || [])]
    .sort((a, b) => (b.occupancyRate || 0) - (a.occupancyRate || 0))
    .slice(0, 6);
  const topCinemas = (stats?.cinemas || []).slice(0, 4);

  return (
    <section className="dashboard-spotlight">
      <div className="dashboard-spotlight-head">
        <div>
          <p className="dashboard-spotlight-eyebrow">Box office insights</p>
          <h2 className="dashboard-spotlight-heading">Phim & rạp nổi bật</h2>
        </div>
        <span className="dashboard-spotlight-tag">Tháng hiện tại</span>
      </div>

      <div className="dashboard-spotlight-bento">
        <MovieSpotlightHero
          movie={spotlight}
          formatRevenueFull={formatRevenueFull}
          maxRevenue={maxMovieRevenue}
        />

        <div className="dashboard-spotlight-aside">
          <div className="dashboard-spotlight-runners">
            <h3 className="dashboard-spotlight-subtitle">
              <Film className="dashboard-mini-title-icon" aria-hidden />
              Top tiếp theo
            </h3>
            {runners.length === 0 ? (
              <p className="dashboard-rank-empty">Chưa có phim xếp hạng tiếp theo</p>
            ) : (
              <ul className="dashboard-movie-rank-list dashboard-movie-rank-list--runners">
                {runners.map((movie, index) => (
                  <TopMovieRankRow
                    key={movie.uuid || `runner-${index}`}
                    movie={movie}
                    rank={index + 2}
                    maxRevenue={maxMovieRevenue}
                    formatRevenueFull={formatRevenueFull}
                    variant="runner"
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-spotlight-side">
            <div className="dashboard-side-card">
              <h3 className="dashboard-spotlight-subtitle">
                <Building2 className="dashboard-mini-title-icon" aria-hidden />
                Cụm rạp
              </h3>
              <ul className="dashboard-cinema-stack">
                {topCinemas.map((cinema, index) => {
                  const rank = index + 1;
                  const share = ((Number(cinema.revenue) || 0) / maxCinemaRevenue) * 100;
                  return (
                    <li key={`cinema-${cinema.name}`} className="dashboard-cinema-stack-item">
                      <div className="dashboard-cinema-stack-head">
                        <span className={`dashboard-rank-index ${getRankIndexClass(rank)}`}>{rank}</span>
                        <div className="dashboard-cinema-stack-info">
                          <span className="dashboard-rank-name">{cinema.name}</span>
                          <span className="dashboard-rank-meta">{cinema.occupancyRate}% lấp đầy</span>
                        </div>
                        <span className="dashboard-rank-value">{formatRevenueFull(cinema.revenue)}</span>
                      </div>
                      <div className="dashboard-rank-bar-wrap">
                        <div className="dashboard-rank-bar dashboard-rank-bar--cinema" style={{ width: `${share}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="dashboard-side-card">
              <h3 className="dashboard-spotlight-subtitle">
                <Tags className="dashboard-mini-title-icon" aria-hidden />
                Thể loại hot
              </h3>
              <div className="dashboard-genre-cloud">
                {topGenres.map((genre, index) => (
                  <div
                    key={`genre-${genre.name}`}
                    className="dashboard-genre-pill"
                    style={{ '--genre-weight': `${Math.max(genre.occupancyRate || 0, 12)}%` }}
                  >
                    <span className="dashboard-genre-pill-rank">{index + 1}</span>
                    <span className="dashboard-genre-pill-name">{genre.name}</span>
                    <span className="dashboard-genre-pill-value">{genre.occupancyRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TopMoviesRevenuePanel = ({ movies, formatRevenueFull }) => {
  if (!movies.length) {
    return <div className="dashboard-empty-chart">Chưa có dữ liệu doanh thu theo phim</div>;
  }

  const maxRevenue = Math.max(...movies.map((m) => Number(m.revenue) || 0), 1);

  return (
    <ul className="dashboard-movie-rank-list">
      {movies.map((movie, index) => (
        <TopMovieRankRow
          key={movie.uuid || `movie-${index}`}
          movie={movie}
          rank={index + 1}
          maxRevenue={maxRevenue}
          formatRevenueFull={formatRevenueFull}
        />
      ))}
    </ul>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [missionAnalytics, setMissionAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cinemas');
  const [revenueGranularity, setRevenueGranularity] = useState('day');
  const [revenueAnchor, setRevenueAnchor] = useState(() => todayYmd());
  const [revenueSeries, setRevenueSeries] = useState(null);
  const [seriesLoading, setSeriesLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [data, missionData] = await Promise.all([
        adminDashboardService.getDashboardStats(),
        adminMissionService.getAnalytics().catch(() => null),
      ]);
      setStats(data);
      setMissionAnalytics(missionData);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSeries = useCallback(async (granularity, date) => {
    setSeriesLoading(true);
    try {
      const data = await adminDashboardService.getRevenueSeries(granularity, date);
      setRevenueSeries(data);
    } catch (error) {
      console.error('Failed to fetch revenue series', error);
      setRevenueSeries(null);
    } finally {
      setSeriesLoading(false);
    }
  }, []);

  const handlePeriodShift = useCallback((dir) => {
    setRevenueAnchor((prev) => shiftPeriod(revenueSeries?.periodStartDate || prev, revenueGranularity, dir));
  }, [revenueSeries, revenueGranularity]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSeries(revenueGranularity, revenueAnchor);
  }, [revenueGranularity, revenueAnchor, fetchSeries]);

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
      icon: DollarSign,
    },
    {
      id: 'transactions',
      label: 'Giao dịch',
      value: transactionVal,
      change: growthLabel,
      positive: isGrowthPositive,
      icon: Ticket,
    },
    {
      id: 'conversion',
      label: 'Tỷ lệ chuyển đổi',
      value: conversionVal.toFixed(1),
      suffix: '%',
      change: null,
      positive: conversionVal >= 5,
      icon: Percent,
    },
    {
      id: 'growth',
      label: 'Tăng trưởng',
      value: Math.abs(growthVal).toFixed(1),
      suffix: '%',
      change: growthLabel,
      positive: isGrowthPositive,
      icon: TrendingUp,
    },
  ];

  const tabs = [
    { id: 'cinemas', label: 'Doanh thu rạp' },
    { id: 'movies', label: 'Top phim' },
    { id: 'genres', label: 'Thể loại phim' },
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
      : {
          labels: chartData?.cinemas.map((c) => c.name) || [],
          values: chartData?.cinemaRevenues || [],
          title: 'Doanh thu theo cụm rạp',
          subtitle: 'So sánh hiệu suất kinh doanh từng chi nhánh',
        };

  const activeGranularityMeta = GRANULARITIES.find((g) => g.id === revenueGranularity) || GRANULARITIES[0];
  const seriesPoints = revenueSeries?.points || [];

  const maxMovieRevenue = Math.max(...(stats?.topMovies || []).map((m) => Number(m.revenue) || 0), 1);
  const cinemasList = stats?.cinemas || [];
  const maxCinemaRevenue = Math.max(...cinemasList.map((c) => Number(c.revenue) || 0), 1);

  return (
    <AdminPage className="dashboard-page">
      <PageHeader
        eyebrow="NASAFilm · Operations"
        title="Bảng điều khiển"
        description="Tổng quan vận hành và phân tích hệ thống rạp chiếu phim"
        variant="display"
      />

      <div className="dashboard-kpi-grid adm-kpi-grid adm-kpi-grid--4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.id}
            className={`dashboard-kpi-card adm-kpi-card${index === 0 ? ' dashboard-kpi-card--featured' : ''}`}
          >
            <div className="dashboard-kpi-top">
              <span className="dashboard-kpi-label adm-kpi-card__label">{kpi.label}</span>
              <span className="dashboard-kpi-icon-wrap">
                <kpi.icon className="dashboard-kpi-icon" />
              </span>
            </div>
            <div className="dashboard-kpi-body">
              <div className="dashboard-kpi-values">
                <span className="dashboard-kpi-value adm-tabular">
                  {kpi.value}
                  {kpi.suffix && <span className="dashboard-kpi-suffix">{kpi.suffix}</span>}
                </span>
                {kpi.change != null && (
                  <span className={`dashboard-kpi-change ${kpi.positive ? 'is-positive' : 'is-negative'}`}>
                    {kpi.change}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <TopMissionsPanel topTemplates={missionAnalytics?.topTemplates || []} />

      <DashboardSpotlightSection
        stats={stats}
        maxMovieRevenue={maxMovieRevenue}
        maxCinemaRevenue={maxCinemaRevenue}
        formatRevenueFull={formatRevenueFull}
      />

      <section className="dashboard-chart-panel dashboard-revenue-trend">
        <div className="dashboard-revenue-trend-head">
          <div>
            <h2 className="dashboard-panel-title">Xu hướng doanh thu</h2>
            <p className="dashboard-panel-subtitle">
              {activeGranularityMeta.subtitle} · doanh thu đơn đã xác nhận
            </p>
          </div>
          <FilterPills
            value={revenueGranularity}
            onChange={setRevenueGranularity}
            items={GRANULARITIES.map((g) => ({ id: g.id, label: g.label }))}
            ariaLabel="Khoảng thời gian"
          />
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
            {revenueSeries?.periodLabel || activeGranularityMeta.label}
          </span>
          <button
            type="button"
            className="dashboard-period-nav-btn"
            onClick={() => handlePeriodShift(1)}
            disabled={!revenueSeries?.canGoNext}
            aria-label="Kỳ sau"
          >
            ▶
          </button>
          <AdminDatePicker
            value={revenueSeries?.periodStartDate || revenueAnchor}
            onChange={(v) => v && setRevenueAnchor(v)}
            max={todayYmd()}
            clearable={false}
            size="sm"
            className="dashboard-period-datepicker"
            placeholder="Chọn ngày"
          />
        </div>

        <div className="dashboard-revenue-trend-totals">
          <div className="dashboard-revenue-trend-total">
            <span className="dashboard-revenue-trend-total-label">Tổng doanh thu kỳ</span>
            <strong className="dashboard-revenue-trend-total-value">
              {formatRevenueFull(revenueSeries?.totalRevenue)}
            </strong>
          </div>
          <div className="dashboard-revenue-trend-total">
            <span className="dashboard-revenue-trend-total-label">Giao dịch</span>
            <strong className="dashboard-revenue-trend-total-value">
              {new Intl.NumberFormat('vi-VN').format(revenueSeries?.totalTransactions || 0)}
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
              color="#10b981"
            />
          ) : (
            <div className="dashboard-empty-chart">Chưa có dữ liệu doanh thu</div>
          )}
        </div>
        <div className="dashboard-chart-legend">
          <span className="dashboard-legend-dot" style={{ background: '#10b981' }} />
          <span>Doanh thu (đ)</span>
        </div>
      </section>

      <section className="dashboard-analytics">
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
            {activeTab === 'movies' ? (
              <TopMoviesRevenuePanel
                movies={chartData?.topMovies || []}
                formatRevenueFull={formatRevenueFull}
              />
            ) : activeChart.labels.length > 0 ? (
              <AreaChart labels={activeChart.labels} values={activeChart.values} />
            ) : (
              <div className="dashboard-empty-chart">Chưa có dữ liệu biểu đồ</div>
            )}
          </div>
          {activeTab !== 'movies' && (
            <div className="dashboard-chart-legend">
              <span className="dashboard-legend-dot" style={{ background: '#a855f7' }} />
              <span>{activeTab === 'genres' ? 'Tỷ lệ lấp đầy (%)' : 'Doanh thu (đ)'}</span>
            </div>
          )}
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
      </section>
    </AdminPage>
  );
};

export default DashboardPage;
