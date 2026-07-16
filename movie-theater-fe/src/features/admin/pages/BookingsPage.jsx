import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, DollarSign, CheckCircle2, XCircle, Ticket, Calendar, Film,
  MapPin, Clock, Loader2, AlertCircle, Sparkles,
  X, ChevronDown, SlidersHorizontal, CalendarDays
} from 'lucide-react';import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import UserAvatar from '../../../shared/components/UserAvatar';
import Pagination from '../../../shared/components/Pagination';
import TabTransition from '../../../shared/components/TabTransition';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import PosterImage from '../../../shared/components/PosterImage';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import {
  AdminPage,
  PageHeader,
  FilterPills,
  StatusBadge,
  AdminTableShell,
  AdminDatePicker,
  AdminMonthCalendar,
} from '../components';
import { toIsoDate } from '../components/calendar/dateUtils';
import {
  getAdminBookingArchiveLabel,
  partitionAdminBookings,
} from '../utils/adminBookingUtils';
import './BookingsPage.css';

const BOOKING_STATUS_COLOR = {
  CONFIRMED: '#34d399',
  CANCELLED: '#f87171',
  PENDING: '#fbbf24',
  REFUND_PENDING: '#fbbf24',
  REFUND_PROCESSING: '#38bdf8',
  REFUNDED: '#94a3b8',
};

const CALENDAR_LEGEND = [
  { label: 'Thành công', color: '#34d399' },
  { label: 'Chờ / hoàn tiền', color: '#fbbf24' },
  { label: 'Đã hủy', color: '#f87171' },
];

function bookingDayIso(booking) {
  const raw = booking?.showtimeStartTime || booking?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

const BookingsPage = () => {
  useMediaUrlRouting();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [listTab, setListTab] = useState('active');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [moviesMap, setMoviesMap] = useState({});
  const [cinemasList, setCinemasList] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCinema, setSelectedCinema] = useState('');
  const [selectedShowtime, setSelectedShowtime] = useState('');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), monthIndex: t.getMonth() };
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchAuxiliaryData = async () => {
    try {
      const moviesData = await movieService.getMovies({ size: 100 });
      const moviesList = moviesData?.content || [];
      const moviesMapping = {};
      moviesList.forEach(m => {
        if (m.title && m.primaryMediaUrl) {
          moviesMapping[m.title.toLowerCase().trim()] = m.primaryMediaUrl;
        }
      });
      const showtimesData = await showtimeService.getAdminShowtimes();
      (showtimesData || []).forEach((st) => {
        if (st.movieTitle && st.moviePosterUrl) {
          moviesMapping[st.movieTitle.toLowerCase().trim()] = st.moviePosterUrl;
        }
      });
      setMoviesMap(moviesMapping);
      const cinemasData = await movieService.getCinemas();
      setCinemasList(cinemasData || []);
      setShowtimes(showtimesData || []);
    } catch (err) {
      console.error('Failed to fetch auxiliary data:', err);
    }
  };

  const fetchBookings = useCallback(async (keyword = '') => {
    setIsLoading(true);
    try {
      const data = await bookingService.getAdminBookings(keyword, {
        unpaged: true,
        status: statusFilter,
        cinema: selectedCinema,
        startDate,
        endDate,
      });
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      notificationService.error('Không thể tải danh sách đơn đặt vé từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedCinema, startDate, endDate]);

  useEffect(() => { fetchAuxiliaryData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchBookings(searchTerm); }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchBookings]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_BOOKINGS, () => fetchBookings(searchTerm));

  useEffect(() => {
    setCurrentPage(1);
    setArchivedPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, selectedCinema, selectedShowtime]);

  useEffect(() => {
    if (statusFilter === 'CANCELLED') {
      setListTab('archived');
    }
  }, [statusFilter]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCinema('');
    setSelectedShowtime('');
    setStatusFilter('ALL');
    setSearchTerm('');
    setListTab('active');
  };

  const handleKpiClick = (label) => {
    if (label === 'THÀNH CÔNG' || label === 'DOANH THU') {
      setStatusFilter('CONFIRMED');
      setListTab('active');
    } else if (label === 'ĐÃ HỦY') {
      setStatusFilter('CANCELLED');
      setListTab('archived');
    } else if (label === 'TỔNG ĐƠN HÀNG') {
      setStatusFilter('ALL');
      setListTab('active');
    }
    setCurrentPage(1);
    setArchivedPage(1);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hours}:${minutes} | ${day}/${month}/${year}`;
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0đ';
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  const getBookingShowtime = (booking) => {
    // The server now returns the booking's own showtime directly, so we no longer guess it by
    // fuzzy-matching movie + room + createdAt date against the loaded showtime list.
    if (booking?.showtimeStartTime) {
      return { startTime: booking.showtimeStartTime, endTime: booking.showtimeEndTime };
    }
    return null;
  };

  const getBookingShowtimeTime = (booking) => {
    const st = getBookingShowtime(booking);
    return st ? new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;
  };

  const uniqueShowtimeOptions = React.useMemo(() => {
    const options = [];
    showtimes.forEach(st => {
      if (st.startTime) {
        const timeStr = new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (!options.includes(timeStr)) options.push(timeStr);
      }
    });
    return options.sort();
  }, [showtimes]);

  const filteredBookings = React.useMemo(() => {
    // keyword/status/cinema/date already applied server-side; only showtime remains client-side
    const list = bookings.filter((b) => {
      if (selectedShowtime) {
        const stTime = getBookingShowtimeTime(b);
        if (stTime !== selectedShowtime) return false;
      }
      return true;
    });

    const statusRank = { PENDING: 0, CONFIRMED: 1, CANCELLED: 2 };
    return list.sort((a, b) => {
      const ra = statusRank[a.status?.toUpperCase()] ?? 1;
      const rb = statusRank[b.status?.toUpperCase()] ?? 1;
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [bookings, selectedShowtime, showtimes]);

  const { active: activeBookings, archived: archivedBookings } = React.useMemo(
    () => partitionAdminBookings(filteredBookings),
    [filteredBookings, showtimes],
  );

  const stats = React.useMemo(() => {
    const baseListForStats = bookings.filter((b) => {
      if (selectedShowtime) {
        const stTime = getBookingShowtimeTime(b);
        if (stTime !== selectedShowtime) return false;
      }
      return true;
    });
    let revenue = 0, confirmed = 0, cancelled = 0;
    baseListForStats.forEach((b) => {
      if (b.status?.toUpperCase() === 'CONFIRMED') { revenue += b.totalPrice || 0; confirmed += 1; }
      else if (b.status?.toUpperCase() === 'CANCELLED') cancelled += 1;
    });
    const avgOrderValue = confirmed > 0 ? Math.round(revenue / confirmed) : 0;
    return { totalRevenue: revenue, confirmedCount: confirmed, cancelledCount: cancelled, totalCount: baseListForStats.length, avgOrderValue };
  }, [bookings, selectedShowtime, showtimes]);

  const paginatedActiveBookings = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return activeBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [activeBookings, currentPage, itemsPerPage]);

  const paginatedArchivedBookings = React.useMemo(() => {
    const startIndex = (archivedPage - 1) * itemsPerPage;
    return archivedBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [archivedBookings, archivedPage, itemsPerPage]);

  const displayedBookings = listTab === 'archived' ? archivedBookings : activeBookings;
  const paginatedBookings = listTab === 'archived' ? paginatedArchivedBookings : paginatedActiveBookings;
  const tabCurrentPage = listTab === 'archived' ? archivedPage : currentPage;
  const tabPageCount = Math.max(1, Math.ceil(displayedBookings.length / itemsPerPage) || 1);

  const calendarEvents = React.useMemo(() => {
    return filteredBookings
      .map((b) => {
        const date = bookingDayIso(b);
        if (!date) return null;
        const status = (b.status || '').toUpperCase();
        const timeLabel = getBookingShowtimeTime(b);
        return {
          id: b.bookingUuid,
          date,
          label: b.customerName || b.movieTitle || 'Đơn',
          color: BOOKING_STATUS_COLOR[status] || '#94a3b8',
          meta: [b.movieTitle, timeLabel, formatPrice(b.totalPrice)].filter(Boolean).join(' · '),
          raw: b,
        };
      })
      .filter(Boolean);
  }, [filteredBookings, showtimes]);

  const hasActiveFilters = startDate || endDate || selectedCinema || selectedShowtime || statusFilter !== 'ALL' || searchTerm;

  const kpiActive = (label) => {
    if (label === 'TỔNG ĐƠN HÀNG') return statusFilter === 'ALL';
    if (label === 'THÀNH CÔNG' || label === 'DOANH THU') return statusFilter === 'CONFIRMED';
    if (label === 'ĐÃ HỦY') return statusFilter === 'CANCELLED';
    return false;
  };

  const getStatusConfig = (row) => {
    const s = row?.status?.toUpperCase();
    if (s === 'CONFIRMED') {
      const activity = (row?.activityStatus || '').toLowerCase();
      if (activity === 'expired') return {
        label: 'Đã qua suất',
        accentBorder: 'bk-order-row--confirmed',
        badgeVariant: 'muted',
      };
      if (activity === 'used') return {
        label: 'Đã sử dụng',
        accentBorder: 'bk-order-row--confirmed',
        badgeVariant: 'info',
      };
      return {
        label: 'Thành công',
        accentBorder: 'bk-order-row--confirmed',
        badgeVariant: 'success',
      };
    }
    if (s === 'CANCELLED') return {
      label: 'Đã hủy',
      accentBorder: 'bk-order-row--cancelled',
      badgeVariant: 'danger',
    };
    if (s === 'REFUND_PENDING') return {
      label: 'Chờ duyệt hoàn tiền',
      accentBorder: 'bk-order-row--pending',
      badgeVariant: 'warning',
    };
    if (s === 'REFUND_PROCESSING') return {
      label: 'Đang hoàn tiền',
      accentBorder: 'bk-order-row--pending',
      badgeVariant: 'info',
    };
    if (s === 'REFUNDED') return {
      label: 'Đã hoàn tiền',
      accentBorder: 'bk-order-row--confirmed',
      badgeVariant: 'success',
    };
    return {
      label: 'Chờ xử lý',
      accentBorder: 'bk-order-row--pending',
      badgeVariant: 'warning',
    };
  };

  const renderOrderRow = (row, archived = false) => {
    const statusCfg = getStatusConfig(row);
    const rawPoster = moviesMap[row.movieTitle?.toLowerCase().trim()];
    const seatList = row.seats ? row.seats.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const st = getBookingShowtime(row);
    const showtimeStr = st && st.startTime
      ? `${new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${new Date(st.startTime).toLocaleDateString('vi-VN')}`
      : null;
    const isRefundPending = row.status?.toUpperCase() === 'REFUND_PENDING';
    const archiveLabel = archived ? getAdminBookingArchiveLabel(row) : null;

    return (
      <div
        key={row.bookingUuid}
        className={`bk-order-row ${statusCfg.accentBorder}`}
      >
        {archived && archiveLabel && (
          <span className="bk-order-archive-badge">{archiveLabel}</span>
        )}
        <div className="bk-order-cell bk-order-cell--customer">
          <div className="bk-order-customer">
            <UserAvatar
              src={row.customerAvatarUrl}
              name={row.customerName}
              fallbackClassName="bg-slate-800"
              borderClassName="border border-white/10"
            />
            <div className="min-w-0">
              <div className="bk-order-customer__name">{row.customerName || 'N/A'}</div>
              <div className="bk-order-customer__email">{row.customerEmail || 'N/A'}</div>
              <div className="bk-order-customer__id">#{row.bookingUuid ? row.bookingUuid.substring(0, 8).toUpperCase() : 'N/A'}</div>
            </div>
          </div>
        </div>

        <div className="bk-order-cell">
          <div className="bk-order-movie">
            <div className="bk-order-movie__poster">
              {rawPoster ? (
                <PosterImage src={rawPoster} alt="Poster" width={80} className="w-full h-full object-cover" />
              ) : (<Film className="w-4 h-4 text-gray-600" />)}
            </div>
            <div className="min-w-0">
              <div className="bk-order-movie__title">{row.movieTitle || 'N/A'}</div>
              <div className="bk-order-movie__meta">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{row.cinemaRoomName || 'N/A'}</span>
              </div>
              {showtimeStr ? (
                <div className="bk-order-movie__showtime">{showtimeStr}</div>
              ) : (
                <div className="bk-order-movie__meta mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Chưa ghép suất chiếu</span>
                </div>
              )}
              <div className="bk-order-movie__meta mt-1">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="font-mono text-[10px]">{formatDateTime(row.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bk-order-cell">
          <p className="bk-order-label">Ghế</p>
          {seatList.length > 0 ? (
            <div>
              {seatList.map((seat) => (
                <span key={seat} className="bk-seat-tag">{seat}</span>
              ))}
              {row.combos && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate" title={row.combos}>{row.combos}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-600">—</span>
          )}
        </div>

        <div className="bk-order-cell">
          <p className="bk-order-label">Thanh toán</p>
          <p className="bk-order-price">{formatPrice(row.totalPrice)}</p>
          {row.paymentMethod && (
            <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-[#1A2238] text-[9px] font-bold text-gray-500 uppercase">{row.paymentMethod}</span>
          )}
        </div>

        <div className="bk-order-cell bk-order-cell--actions gap-2">
          <StatusBadge variant={statusCfg.badgeVariant}>{statusCfg.label}</StatusBadge>
          {isRefundPending && (
            <Link to="/admin/refunds" className="bk-action-btn bk-action-btn--checkin no-underline">
              <DollarSign className="w-3 h-3" />
              Duyệt hoàn tiền
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trung tâm vận hành đơn hàng"
        title="Quản lý đơn hàng & doanh thu"
        description="Theo dõi, tra cứu và đối soát trạng thái giao dịch đặt vé của khách hàng trên toàn bộ chi nhánh."
        variant="display"
        secondaryActions={
          hasActiveFilters
            ? [{ label: 'Đặt lại bộ lọc', onClick: handleClearFilters, icon: <X className="w-3.5 h-3.5" /> }]
            : []
        }
      />

      {/* KPI CARDS */}
      <div className="adm-kpi-grid adm-kpi-grid--5">
        {[
          { label: 'DOANH THU', value: formatPrice(stats.totalRevenue), badge: 'Đơn thành công', icon: DollarSign, color: 'text-amber-400', kpiClass: 'kpi-revenue', clickable: true },
          { label: 'THÀNH CÔNG', value: stats.confirmedCount, badge: 'đơn đặt vé', icon: CheckCircle2, color: 'text-emerald-400', kpiClass: 'kpi-success', clickable: true },
          { label: 'ĐÃ HỦY', value: stats.cancelledCount, badge: 'đơn đã hủy', icon: XCircle, color: 'text-rose-400', kpiClass: 'kpi-cancelled', clickable: true },
          { label: 'TỔNG ĐƠN HÀNG', value: stats.totalCount, badge: 'tổng giao dịch', icon: Ticket, color: 'text-indigo-400', kpiClass: 'kpi-total', clickable: true },
          { label: 'GIÁ TRỊ AOV', value: formatPrice(stats.avgOrderValue), badge: 'trung bình/đơn', icon: Sparkles, color: 'text-blue-400', kpiClass: 'kpi-aov', clickable: false }
        ].map(kpi => {
          const Tag = kpi.clickable ? 'button' : 'div';
          return (
            <Tag
              key={kpi.label}
              type={kpi.clickable ? 'button' : undefined}
              onClick={kpi.clickable ? () => handleKpiClick(kpi.label) : undefined}
              className={`adm-kpi-card kpi-card ${kpi.kpiClass} ${kpi.clickable ? 'adm-kpi-card--clickable kpi-card--clickable' : ''} ${kpiActive(kpi.label) ? 'adm-kpi-card--active kpi-card--active' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
              </div>
              <p className={`text-xl font-black ${kpi.color} leading-none truncate`} title={kpi.value.toString()}>{kpi.value}</p>
              <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{kpi.badge}</p>
            </Tag>
          );
        })}
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bk-toolbar adm-toolbar">
        <div className="bk-toolbar__row adm-toolbar__row">
          <div className="bk-toolbar__search adm-toolbar__search">
            <Search className="bk-toolbar__search-icon adm-toolbar__search-icon" />
            <input
              className="bk-control bk-control--search adm-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, email, phim..."
            />
          </div>

          <FilterPills
            value={statusFilter}
            onChange={(key) => {
              setStatusFilter(key);
              if (key === 'CANCELLED') setListTab('archived');
              else setListTab('active');
            }}
            items={[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CONFIRMED', label: 'Thành công' },
              { id: 'CANCELLED', label: 'Đã hủy' },
            ]}
            ariaLabel="Lọc trạng thái đơn"
          />

          <FilterPills
            value={viewMode}
            onChange={setViewMode}
            items={[
              { id: 'list', label: 'Danh sách' },
              { id: 'calendar', label: 'Lịch' },
            ]}
            ariaLabel="Chế độ xem"
          />

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className={`bk-chip ${advancedOpen ? 'bk-chip--active bk-chip--muted' : ''}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Bộ lọc nâng cao
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {advancedOpen && (
          <div className="bk-toolbar__row bk-toolbar__row--advanced">

            <div className="bk-filter-field" style={{ minWidth: 180 }}>
              <AdminDatePicker
                label="Từ ngày mua"
                value={startDate}
                onChange={setStartDate}
                max={endDate || undefined}
                size="sm"
                placeholder="Chọn ngày"
              />
            </div>

            <div className="bk-filter-field" style={{ minWidth: 180 }}>
              <AdminDatePicker
                label="Đến ngày mua"
                value={endDate}
                onChange={setEndDate}
                min={startDate || undefined}
                size="sm"
                placeholder="Chọn ngày"
              />
            </div>

            <div className="bk-filter-field">
              <label>Rạp chiếu</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setActiveDropdown(activeDropdown === 'cinema' ? null : 'cinema'); }}
                  className="bk-filter-trigger"
                >
                  <MapPin className="bk-filter-trigger__icon" />
                  <span className="truncate block pr-2">{selectedCinema || 'Tất cả rạp'}</span>
                  <ChevronDown className="bk-filter-trigger__chevron" />
                </button>

              {activeDropdown === 'cinema' && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)}></div>
                  <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-[#1c2333] border border-[#242d42] rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 text-left animate-dropdown-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCinema('');
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-lg hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer border-0 bg-transparent ${
                        !selectedCinema ? 'text-red-400 bg-red-500/10 font-bold' : 'text-gray-300'
                      }`}
                    >
                      Tất cả rạp
                    </button>
                    {cinemasList.map((c) => (
                      <button
                        key={c.uuid}
                        type="button"
                        onClick={() => {
                          setSelectedCinema(c.name);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center px-3 py-2 rounded-lg hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer border-0 bg-transparent ${
                          selectedCinema === c.name ? 'text-red-400 bg-red-500/10 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>

            <div className="bk-filter-field">
              <label>Khung giờ suất chiếu</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setActiveDropdown(activeDropdown === 'showtime' ? null : 'showtime'); }}
                  className="bk-filter-trigger"
                >
                  <Clock className="bk-filter-trigger__icon" />
                  <span className="truncate block pr-2">{selectedShowtime || 'Tất cả khung giờ'}</span>
                  <ChevronDown className="bk-filter-trigger__chevron" />
                </button>

              {activeDropdown === 'showtime' && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDropdown(null)}></div>
                  <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-[#1c2333] border border-[#242d42] rounded-xl shadow-2xl p-1.5 space-y-0.5 z-50 text-left animate-dropdown-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedShowtime('');
                        setActiveDropdown(null);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-lg hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer border-0 bg-transparent ${
                        !selectedShowtime ? 'text-red-400 bg-red-500/10 font-bold' : 'text-gray-300'
                      }`}
                    >
                      Tất cả khung giờ
                    </button>
                    {uniqueShowtimeOptions.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedShowtime(t);
                          setActiveDropdown(null);
                        }}
                        className={`w-full flex items-center px-3 py-2 rounded-lg hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer border-0 bg-transparent ${
                          selectedShowtime === t ? 'text-red-400 bg-red-500/10 font-bold' : 'text-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        )}

        <div className="bk-toolbar__summary">
          <span>
            Hiển thị <strong>{activeBookings.length}</strong> đơn đang hoạt động
            {archivedBookings.length > 0 && (
              <> · <strong>{archivedBookings.length}</strong> đơn đã qua / đóng</>
            )}
            {' '}/ {bookings.length} tổng
          </span>
          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="text-[10px] font-bold text-red-400 hover:text-red-300 border-0 bg-transparent cursor-pointer p-0">
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <TabTransition activeKey={viewMode}>
      {viewMode === 'calendar' ? (
        isLoading ? (
          <div className="adm-loading">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            <p>Đang tải lịch đơn đặt vé...</p>
          </div>
        ) : (
          <AdminMonthCalendar
            year={calendarMonth.year}
            monthIndex={calendarMonth.monthIndex}
            onMonthChange={setCalendarMonth}
            selectedDate={calendarSelectedDate}
            onSelectDate={setCalendarSelectedDate}
            events={calendarEvents}
            legend={CALENDAR_LEGEND}
            emptyTitle="Chọn một ngày"
            emptyDescription="Nhấp vào ô lịch để xem đơn đặt vé theo ngày suất chiếu."
            renderDetail={(date, dayEvents) => {
              if (!dayEvents.length) {
                return (
                  <div className="adm-month-cal__empty">
                    <CalendarDays className="adm-month-cal__empty-icon" />
                    <div className="adm-month-cal__empty-title">Không có đơn</div>
                    <p className="adm-month-cal__empty-desc">Ngày này chưa có đơn đặt vé phù hợp bộ lọc.</p>
                  </div>
                );
              }
              return (
                <div className="adm-month-cal__list">
                  {dayEvents.map((ev) => {
                    const row = ev.raw;
                    const statusCfg = getStatusConfig(row);
                    return (
                      <div key={ev.id} className="adm-month-cal__list-item">
                        <span className="adm-month-cal__dot mt-1.5" style={{ background: ev.color }} />
                        <div className="adm-month-cal__list-item-main">
                          <div className="adm-month-cal__list-item-title">{ev.label}</div>
                          <div className="adm-month-cal__list-item-meta">{ev.meta}</div>
                          <div className="mt-2">
                            <StatusBadge variant={statusCfg.badgeVariant}>{statusCfg.label}</StatusBadge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        )
      ) : (
      <AdminTableShell
        toolbar={(
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <FilterPills
              value={listTab}
              onChange={setListTab}
              items={[
                { id: 'active', label: 'Đơn đang hoạt động', count: activeBookings.length },
                { id: 'archived', label: 'Đơn đã qua / đóng', count: archivedBookings.length },
              ]}
              ariaLabel="Nhóm danh sách đơn"
            />
            {!isLoading && displayedBookings.length > 0 && (
              <span className="text-[10px] text-[var(--adm-text-dim)] font-mono adm-tabular">
                Trang {tabCurrentPage} / {tabPageCount}
              </span>
            )}
          </div>
        )}
        footer={displayedBookings.length > 0 ? (
          <Pagination
            currentPage={tabCurrentPage}
            totalItems={displayedBookings.length}
            itemsPerPage={itemsPerPage}
            onPageChange={listTab === 'archived' ? setArchivedPage : setCurrentPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
              setArchivedPage(1);
            }}
          />
        ) : null}
      >
        <TabTransition activeKey={listTab}>
          {isLoading ? (
            <div className="adm-loading">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
              <p>Đang tải dữ liệu đơn đặt vé...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="adm-empty">
              <Ticket className="w-14 h-14 opacity-40" />
              <div>
                <p className="text-sm font-bold text-[var(--adm-text)] mb-1">Không tìm thấy đơn đặt vé nào</p>
                <p className="text-xs">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={handleClearFilters} className="adm-btn adm-btn--ghost">
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : displayedBookings.length === 0 ? (
            <p className="adm-empty">
              {listTab === 'archived'
                ? 'Không có đơn đã qua / đóng phù hợp bộ lọc.'
                : 'Không có đơn đang hoạt động phù hợp bộ lọc.'}
            </p>
          ) : (
            <div>
              {paginatedBookings.map((row) => renderOrderRow(row, listTab === 'archived'))}
            </div>
          )}
        </TabTransition>
      </AdminTableShell>
      )}
      </TabTransition>
    </AdminPage>
  );
};

export default BookingsPage;
