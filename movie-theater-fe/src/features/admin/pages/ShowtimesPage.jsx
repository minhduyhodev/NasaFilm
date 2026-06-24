import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film, Search, Plus, Calendar, Tv, X, Play,
  Ban, CheckCircle, MapPin, CreditCard, LayoutGrid,
  AlignJustify, Clock, ChevronDown,
  Layers,
  CalendarDays, Building2,
  Eye, XCircle, Ticket, Hash,
  DoorOpen, CalendarClock
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../shared/utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import './ShowtimesPage.css';

// ========== CONSTANTS ==========



const STATUS_ORDER = ['OPEN_FOR_BOOKING', 'SCHEDULED', 'SOLD_OUT', 'DRAFT', 'FINISHED', 'CANCELLED'];

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Nháp', icon: Hash, section: 'Nháp',
    dotClass: 'bg-zinc-400', pillBg: 'bg-zinc-500/10', pillBorder: 'border-zinc-500/20', pillText: 'text-zinc-400',
    accent: '#71717a', accentBg: 'rgba(113,113,122,0.1)',
  },
  SCHEDULED: {
    label: 'Sắp Chiếu', icon: CalendarClock, section: 'Sắp Chiếu',
    dotClass: 'bg-blue-400', pillBg: 'bg-blue-500/10', pillBorder: 'border-blue-500/20', pillText: 'text-blue-400',
    accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)',
  },
  OPEN_FOR_BOOKING: {
    label: 'Đang Mở Bán', icon: Ticket, section: 'Đang Mở Bán',
    dotClass: 'bg-emerald-400 animate-pulse', pillBg: 'bg-emerald-500/10', pillBorder: 'border-emerald-500/20', pillText: 'text-emerald-400',
    accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)',
  },
  SOLD_OUT: {
    label: 'Hết Ghế', icon: CheckCircle, section: 'Hết Ghế',
    dotClass: 'bg-amber-400', pillBg: 'bg-amber-500/10', pillBorder: 'border-amber-500/20', pillText: 'text-amber-400',
    accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.1)',
  },
  CANCELLED: {
    label: 'Đã Hủy', icon: XCircle, section: 'Đã Hủy',
    dotClass: 'bg-rose-400', pillBg: 'bg-rose-500/10', pillBorder: 'border-rose-500/20', pillText: 'text-rose-400',
    accent: '#f43f5e', accentBg: 'rgba(244,63,94,0.1)',
  },
  FINISHED: {
    label: 'Đã Kết Thúc', icon: Ban, section: 'Đã Kết Thúc',
    dotClass: 'bg-gray-500', pillBg: 'bg-zinc-700/20', pillBorder: 'border-zinc-700/30', pillText: 'text-gray-500',
    accent: '#52525b', accentBg: 'rgba(82,82,91,0.1)',
  },
};

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const SORT_OPTIONS = [
  { value: 'startTime_asc', label: 'Giờ chiếu (sớm → muộn)' },
  { value: 'startTime_desc', label: 'Giờ chiếu (muộn → sớm)' },
  { value: 'movie_asc', label: 'Tên phim (A → Z)' },
  { value: 'revenue_desc', label: 'Giá vé (cao → thấp)' },
];

const VIEW_MODES = [
  { key: 'grid', icon: LayoutGrid, label: 'Lưới' },
  { key: 'list', icon: AlignJustify, label: 'Danh sách' },
  { key: 'room', icon: DoorOpen, label: 'Phòng chiếu' },
];

// ========== HELPERS ==========

const formatTimeOnly = (s) => {
  if (!s) return '--:--';
  return new Date(s).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (d) => {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatWeekday = (d) => {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[d.getDay()];
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};



const getValidTransitions = (status) => {
  switch (status) {
    case 'DRAFT': return [{ target: 'SCHEDULED', label: 'Sắp Chiếu' }];
    case 'SCHEDULED': return [
      { target: 'OPEN_FOR_BOOKING', label: 'Mở Bán Vé' },
      { target: 'CANCELLED', label: 'Hủy Suất' }
    ];
    case 'OPEN_FOR_BOOKING': return [
      { target: 'SOLD_OUT', label: 'Hết Vé' },
      { target: 'FINISHED', label: 'Kết Thúc' },
      { target: 'CANCELLED', label: 'Hủy Suất' }
    ];
    case 'SOLD_OUT': return [
      { target: 'OPEN_FOR_BOOKING', label: 'Mở Lại' },
      { target: 'FINISHED', label: 'Kết Thúc' },
      { target: 'CANCELLED', label: 'Hủy Suất' }
    ];
    default: return [];
  }
};

const getTransitionBtnClass = (t) => {
  if (t === 'CANCELLED') return 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20';
  if (t === 'OPEN_FOR_BOOKING') return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
  if (t === 'FINISHED') return 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20';
  return 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20';
};

const sortShowtimes = (arr, sortKey) => {
  const sorted = [...arr];
  switch (sortKey) {
    case 'startTime_asc': return sorted.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    case 'startTime_desc': return sorted.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    case 'movie_asc': return sorted.sort((a, b) => (a.movieTitle || '').localeCompare(b.movieTitle || ''));
    case 'revenue_desc': return sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    default: return sorted;
  }
};

// ========== SUB-COMPONENTS ==========

/** Status Badge Pill */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.pillBg} border ${cfg.pillBorder} ${cfg.pillText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

/** Loading Skeleton */
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="flex items-center justify-between">
          <div className="sk-line skeleton-pulse" style={{ width: '80px' }} />
          <div className="sk-line skeleton-pulse" style={{ width: '100px' }} />
        </div>
        <div className="sk-line skeleton-pulse" style={{ width: '70%', height: '16px' }} />
        <div className="sk-line-sm skeleton-pulse" style={{ width: '50%' }} />
        <div className="flex gap-3 mt-1">
          <div className="sk-line-sm skeleton-pulse" style={{ width: '60px' }} />
          <div className="sk-line-sm skeleton-pulse" style={{ width: '80px' }} />
        </div>
        <div className="sk-bar skeleton-pulse" style={{ width: '100%' }} />
        <div className="flex gap-2 mt-1">
          <div className="sk-line skeleton-pulse" style={{ width: '70px', height: '28px' }} />
          <div className="sk-line skeleton-pulse" style={{ width: '70px', height: '28px' }} />
        </div>
      </div>
    ))}
  </div>
);

/** Empty State */
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="empty-state">
    {Icon && <Icon className="empty-state-icon" />}
    <p className="font-bold text-white/70 uppercase tracking-wider text-xs">{title}</p>
    {subtitle && <p className="text-xs text-gray-500 max-w-sm">{subtitle}</p>}
  </div>
);

/** Section Header for status groups */
const SectionHeader = ({ status, count, isCollapsed, onToggle }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-3 px-1 group cursor-pointer text-left"
    >
      <ChevronDown
        className={`w-4 h-4 text-gray-500 section-header-chevron ${isCollapsed ? 'rotated' : ''}`}
      />
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        style={{ background: cfg.accentBg, borderColor: cfg.accent + '30' }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.accent }}>
          {cfg.section}
        </span>
      </div>
      <span className="text-[11px] font-bold text-gray-500 tabular-nums">{count} suất chiếu</span>
      <div className="flex-1 h-px bg-[#1a2238] group-hover:bg-[#2a3450] transition-colors" />
    </button>
  );
};

// ========== MAIN COMPONENT ==========

const ShowtimesPage = () => {
  useMediaUrlRouting();

  // ---------- STATE ----------
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cinemaFilter, setCinemaFilter] = useState('');
  const [sortKey, setSortKey] = useState('startTime_asc');
  const [groupBy, setGroupBy] = useState('status'); // 'status' | 'cinema'

  // View
  const [viewMode, setViewMode] = useState('grid');
  const [selectedDate, setSelectedDate] = useState('today');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Sections collapse state
  const [collapsedSections, setCollapsedSections] = useState({});

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [searchMovieKeyword, setSearchMovieKeyword] = useState('');
  const [formData, setFormData] = useState({
    movieUuid: '', cinemaUuid: '', cinemaRoomUuid: '', startTime: '', basePrice: 85000, vipPrice: 120000, couplePrice: 160000,
  });

  // Auto-scheduling modal
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [isAutoPreviewOpen, setIsAutoPreviewOpen] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState([]);
  const [selectedPreviewUuids, setSelectedPreviewUuids] = useState(new Set());
  const [autoFormData, setAutoFormData] = useState({
    startDate: '',
    endDate: '',
    cinemaUuid: '',
    roomUuids: [],
    movieUuids: [],
    startTime: '08:00',
    endTime: '23:30',
    basePrice: 85000,
    vipPrice: 120000,
    couplePrice: 160000,
    intervalMinutes: 15,
    trailerBuffer: 10,
    goldenHourWeight: 1.0,
    weekendWeight: 1.0,
    ratingWeight: 1.0,
    genreWeight: 1.0,
  });
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [isSavingAuto, setIsSavingAuto] = useState(false);

  const fetchShowtimes = async () => {
    setIsLoading(true);
    try {
      const data = await showtimeService.getAdminShowtimes();
      const items = data || [];
      setShowtimes(items);

      // Auto-finish expired showtimes (endTime has passed)
      const now = new Date();
      const expiredItems = items.filter(s =>
        s.endTime && new Date(s.endTime) < now &&
        ['OPEN_FOR_BOOKING', 'SOLD_OUT', 'SCHEDULED'].includes(s.status)
      );
      if (expiredItems.length > 0) {
        const finishPromises = expiredItems.map(s =>
          showtimeService.updateShowtimeStatus(s.uuid, 'FINISHED').catch(() => {})
        );
        await Promise.all(finishPromises);
        // Re-fetch after auto-finishing
        const refreshed = await showtimeService.getAdminShowtimes();
        setShowtimes(refreshed || []);
      }
    } catch (error) {
      console.error('Failed to fetch showtimes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovies = async () => {
    setIsLoadingMovies(true);
    try {
      const data = await movieService.getMovies({ size: 100 });
      if (data && data.content) {
        setMovies(data.content);
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setIsLoadingMovies(false);
    }
  };

  const fetchCinemas = async () => {
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      setCinemas(data.content || data);
    } catch (error) {
      console.error('Failed to fetch cinemas:', error);
    }
  };

  // ---------- DATA FETCHING ----------
  useEffect(() => {
    fetchShowtimes();
    fetchMovies();
    fetchCinemas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, cinemaFilter, selectedDate, sortKey]);

  const handleAutoClick = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setAutoFormData({
      startDate: todayStr,
      endDate: tomorrowStr,
      cinemaUuid: cinemas[0]?.uuid || '',
      roomUuids: [],
      movieUuids: [],
      startTime: '08:00',
      endTime: '23:30',
      basePrice: 85000,
      vipPrice: 120000,
      couplePrice: 160000,
      intervalMinutes: 15,
      trailerBuffer: 10,
      goldenHourWeight: 1.0,
      weekendWeight: 1.0,
      ratingWeight: 1.0,
      genreWeight: 1.0,
    });
    setRooms([]);
    setPreviewGenerated([]);
    setSelectedPreviewUuids(new Set());
    setIsAutoPreviewOpen(false);
    setIsAutoModalOpen(true);

    if (cinemas[0]?.uuid) {
      cinemaService.getRoomsByCinema(cinemas[0].uuid)
        .then(data => setRooms(data.filter(r => r.status === 'ACTIVE')))
        .catch(console.error);
    }
  };

  const handleAutoSubmit = async (e) => {
    e.preventDefault();
    if (autoFormData.roomUuids.length === 0) {
      notificationService.warning('Vui lòng chọn ít nhất một phòng chiếu');
      return;
    }
    if (autoFormData.movieUuids.length === 0) {
      notificationService.warning('Vui lòng chọn ít nhất một bộ phim');
      return;
    }

    setIsAutoLoading(true);
    try {
      const data = await showtimeService.getAutoShowtimesPreview(autoFormData);
      setPreviewGenerated(data || []);
      const uuids = new Set((data || []).map((_, idx) => idx));
      setSelectedPreviewUuids(uuids);
      setIsAutoPreviewOpen(true);
      notificationService.success('Phân tích lịch chiếu tối ưu hoàn tất!');
    } catch (err) {
      notificationService.error(err.message || 'Lỗi khi phân tích lịch chiếu');
    } finally {
      setIsAutoLoading(false);
    }
  };

  const handleSaveAuto = async () => {
    if (selectedPreviewUuids.size === 0) {
      notificationService.warning('Vui lòng chọn ít nhất một suất chiếu để lưu');
      return;
    }

    setIsSavingAuto(true);
    try {
      const selectedRequests = previewGenerated
        .filter((_, idx) => selectedPreviewUuids.has(idx))
        .map(p => ({
          movieUuid: p.movieUuid,
          cinemaRoomUuid: p.cinemaRoomUuid,
          startTime: p.startTime,
          basePrice: p.basePrice,
          vipPrice: p.vipPrice,
          couplePrice: p.couplePrice,
        }));

      await showtimeService.saveAutoShowtimes(selectedRequests);
      setIsAutoModalOpen(false);
      setIsAutoPreviewOpen(false);
      fetchShowtimes();
      notificationService.success('Đã lưu lịch chiếu tự động thành công!');
    } catch (err) {
      notificationService.error(err.message || 'Lỗi khi lưu lịch chiếu');
    } finally {
      setIsSavingAuto(false);
    }
  };

  const togglePreviewSelection = (index) => {
    setSelectedPreviewUuids(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  // ---------- HANDLERS ----------
  const handleCinemaChange = async (cinemaUuid) => {
    setFormData(prev => ({ ...prev, cinemaUuid, cinemaRoomUuid: '' }));
    if (!cinemaUuid) { setRooms([]); return; }
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data.filter(r => r.status === 'ACTIVE'));
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleAddClick = () => {
    setFormData({
      movieUuid: movies[0]?.uuid || '', cinemaUuid: cinemas[0]?.uuid || '',
      cinemaRoomUuid: '', startTime: '', basePrice: 85000, vipPrice: 120000, couplePrice: 160000,
    });
    if (cinemas[0]?.uuid) handleCinemaChange(cinemas[0].uuid);
    setIsMovieDropdownOpen(false);
    setSearchMovieKeyword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cinemaRoomUuid) {
      notificationService.warning('Vui lòng chọn phòng chiếu');
      return;
    }
    try {
      const isoStartTime = new Date(formData.startTime).toISOString();
      await showtimeService.createShowtime({
        movieUuid: formData.movieUuid,
        cinemaRoomUuid: formData.cinemaRoomUuid,
        startTime: isoStartTime,
        basePrice: parseFloat(formData.basePrice),
        vipPrice: parseFloat(formData.vipPrice),
        couplePrice: parseFloat(formData.couplePrice),
      });
      setIsModalOpen(false);
      fetchShowtimes();
      notificationService.success('Tạo suất chiếu thành công!');
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi tạo suất chiếu');
    }
  };

  const handleStatusTransition = async (showtimeUuid, newStatus) => {
    if (newStatus === 'CANCELLED' && !window.confirm('Bạn có chắc chắn muốn hủy suất chiếu này? Hành động này sẽ tự động hủy và hoàn tiền toàn bộ vé đã đặt.')) {
      return;
    }
    try {
      await showtimeService.updateShowtimeStatus(showtimeUuid, newStatus);
      fetchShowtimes();
      notificationService.success('Cập nhật trạng thái thành công!');
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (action === 'CANCELLED' && !window.confirm(`Bạn có chắc chắn muốn hủy ${ids.length} suất chiếu?`)) return;
    try {
      for (const id of ids) {
        await showtimeService.updateShowtimeStatus(id, action);
      }
      setSelectedIds(new Set());
      fetchShowtimes();
      notificationService.success(`Đã cập nhật ${ids.length} suất chiếu thành công!`);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi cập nhật hàng loạt');
    }
  };

  const toggleSelection = useCallback((uuid) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ---------- DERIVED DATA ----------
  const today = useMemo(() => new Date(), []);

  // Date nav items: today + 6 next days
  const dateNavItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayShowtimes = showtimes.filter(s => s.startTime && isSameDay(new Date(s.startTime), d));
      const movieSet = new Set(dayShowtimes.map(s => s.movieUuid).filter(Boolean));
      const revenue = dayShowtimes.reduce((sum, s) => sum + (s.basePrice || 0), 0);
      items.push({
        key: i === 0 ? 'today' : i === 1 ? 'tomorrow' : `day_${i}`,
        date: d,
        label: i === 0 ? 'Hôm Nay' : i === 1 ? 'Ngày Mai' : formatWeekday(d),
        dateStr: formatDateShort(d),
        count: dayShowtimes.length,
        movies: movieSet.size,
        revenue,
      });
    }
    return items;
  }, [showtimes, today]);

  // Unique cinema names from data
  const uniqueCinemaNames = useMemo(
    () => Array.from(new Set(showtimes.map(s => s.cinemaName).filter(Boolean))).sort(),
    [showtimes]
  );

  // Filter by selected date
  const dateFilteredShowtimes = useMemo(() => {
    if (selectedDate === 'all') return showtimes;
    const navItem = dateNavItems.find(d => d.key === selectedDate);
    if (!navItem) return showtimes;
    return showtimes.filter(s => s.startTime && isSameDay(new Date(s.startTime), navItem.date));
  }, [showtimes, selectedDate, dateNavItems]);

  // Apply search + status + cinema filters
  const filteredShowtimes = useMemo(() => {
    let result = dateFilteredShowtimes.filter(st => {
      const matchesSearch = !searchTerm ||
        st.movieTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cinemaRoomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cinemaName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || st.status === statusFilter;
      const matchesCinema = !cinemaFilter || st.cinemaName === cinemaFilter;
      return matchesSearch && matchesStatus && matchesCinema;
    });
    return sortShowtimes(result, sortKey);
  }, [dateFilteredShowtimes, searchTerm, statusFilter, cinemaFilter, sortKey]);

  // KPI stats for the selected date
  const stats = useMemo(() => {
    const data = dateFilteredShowtimes;
    const now = new Date();
    const selling = data.filter(s => s.status === 'OPEN_FOR_BOOKING').length;
    const scheduled = data.filter(s => s.status === 'SCHEDULED').length;
    const soldOut = data.filter(s => s.status === 'SOLD_OUT').length;
    const finished = data.filter(s => s.status === 'FINISHED').length;
    const cancelled = data.filter(s => s.status === 'CANCELLED').length;
    const playing = data.filter(s =>
      (s.status === 'OPEN_FOR_BOOKING' || s.status === 'SOLD_OUT') &&
      s.startTime && new Date(s.startTime) <= now &&
      s.endTime && new Date(s.endTime) >= now
    ).length;
    const revenue = data.reduce((sum, s) => sum + (s.basePrice || 0), 0);
    return { total: data.length, selling, scheduled, soldOut, playing, finished, cancelled, revenue };
  }, [dateFilteredShowtimes]);

  // Paginated for grid/list views
  const paginatedShowtimes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShowtimes.slice(start, start + itemsPerPage);
  }, [filteredShowtimes, currentPage, itemsPerPage]);

  // Group by status
  const statusGroups = useMemo(() => {
    const groups = {};
    STATUS_ORDER.forEach(s => { groups[s] = []; });
    paginatedShowtimes.forEach(st => {
      if (groups[st.status]) groups[st.status].push(st);
      else groups[st.status] = [st];
    });
    return STATUS_ORDER.map(s => ({ status: s, items: groups[s] || [] })).filter(g => g.items.length > 0);
  }, [paginatedShowtimes]);

  // Group by cinema → room → movie
  const cinemaGroups = useMemo(() => {
    const map = {};
    paginatedShowtimes.forEach(st => {
      const cinema = st.cinemaName || 'Không rõ rạp';
      const room = st.cinemaRoomName || 'Không rõ phòng';
      if (!map[cinema]) map[cinema] = {};
      if (!map[cinema][room]) map[cinema][room] = {};
      const movie = st.movieTitle || 'Không rõ phim';
      if (!map[cinema][room][movie]) map[cinema][room][movie] = [];
      map[cinema][room][movie].push(st);
    });
    return map;
  }, [paginatedShowtimes]);

  // Unique rooms for timeline/room views
  const uniqueRooms = useMemo(() => {
    const roomMap = {};
    filteredShowtimes.forEach(st => {
      const key = `${st.cinemaName}__${st.cinemaRoomName}`;
      if (!roomMap[key]) roomMap[key] = { cinema: st.cinemaName, room: st.cinemaRoomName, key };
    });
    return Object.values(roomMap).sort((a, b) => a.cinema.localeCompare(b.cinema) || a.room.localeCompare(b.room));
  }, [filteredShowtimes]);

  // Movie selection for modal
  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchMovieKeyword.toLowerCase()));
  const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);

  // ========== RENDER HELPERS ==========

  /** Single showtime card for Grid View */
  const renderCard = (row) => {
    const trans = getValidTransitions(row.status);
    const isSelected = selectedIds.has(row.uuid);
    
    // Resolve poster URL
    const movieObj = movies.find(m => m.uuid === row.movieUuid);
    const rawPoster = movieObj?.primaryMediaUrl || row.moviePosterUrl;

    return (
      <div
        key={row.uuid}
        className={`st-card status-${row.status} ${isSelected ? 'selected' : ''} flex gap-4`}
      >
        {/* Left: Movie Poster & Checkbox */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg overflow-hidden border border-[#1a2238] bg-[#0F1322] relative shadow-md">
            <img
              src={getPosterSrc(rawPoster, 160)}
              data-original-url={rawPoster || ''}
              alt={row.movieTitle}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={handlePosterError}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              type="checkbox"
              className="st-checkbox cursor-pointer"
              checked={isSelected}
              onChange={() => toggleSelection(row.uuid)}
            />
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider select-none">Chọn</span>
          </div>
        </div>

        {/* Right: Showtime details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {/* Top row: StatusBadge + Time */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <StatusBadge status={row.status} />
              <div className="flex items-center gap-1 text-white font-mono text-xs font-bold bg-[#0F1322]/80 px-2 py-0.5 rounded border border-[#1a2238]">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>{formatTimeOnly(row.startTime)}</span>
                <span className="text-gray-500">→</span>
                <span className="text-gray-400">{formatTimeOnly(row.endTime)}</span>
              </div>
            </div>

            {/* Movie Title */}
            <h3 className="text-xs sm:text-[13px] font-black text-white leading-snug line-clamp-2 mb-1.5" title={row.movieTitle}>
              {row.movieTitle}
            </h3>

            {/* Cinema & Room */}
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-2">
              <MapPin className="w-3 h-3 shrink-0 text-gray-500" />
              <span className="truncate max-w-[100px]">{row.cinemaName}</span>
              <span className="text-gray-600">•</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold">
                <Tv className="w-2.5 h-2.5" />{row.cinemaRoomName}
              </span>
            </div>

            {/* Price & Date */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Giá vé</p>
                <p className="text-amber-400 font-mono text-xs font-black" title={`Thường: ${row.basePrice?.toLocaleString('vi-VN')}đ\nVIP: ${row.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${row.couplePrice?.toLocaleString('vi-VN')}đ`}>
                  {row.basePrice?.toLocaleString('vi-VN')}đ
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Ngày chiếu</p>
                <p className="text-gray-400 font-mono text-[10px] font-bold">
                  {row.startTime ? formatDateShort(new Date(row.startTime)) : ''} ({row.startTime ? formatWeekday(new Date(row.startTime)) : ''})
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-1 pt-1.5 border-t border-[#1a2238]/60 flex justify-end">
            {trans.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {trans.map(t => (
                  <button
                    key={t.target}
                    onClick={() => handleStatusTransition(row.uuid, t.target)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition duration-150 cursor-pointer ${getTransitionBtnClass(t.target)}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-gray-600 italic">Trạng thái cuối</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  /** Grid View — Status Grouped */
  const renderGridView = () => {
    if (groupBy === 'cinema') return renderCinemaGroupedGrid();

    return (
      <div className="space-y-2 view-fade-enter">
        {statusGroups.map(({ status, items }) => {
          const isCollapsed = collapsedSections[status];
          return (
            <div key={status}>
              <SectionHeader
                status={status}
                count={items.length}
                isCollapsed={isCollapsed}
                onToggle={() => toggleSection(status)}
              />
              <div
                className={`section-collapsible ${isCollapsed ? 'collapsed' : 'expanded'}`}
                style={{ maxHeight: isCollapsed ? 0 : items.length * 400 + 'px' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                  {items.map(row => renderCard(row))}
                </div>
              </div>
            </div>
          );
        })}
        {statusGroups.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="Không có suất chiếu nào"
            subtitle="Thử thay đổi bộ lọc hoặc chọn ngày khác."
          />
        )}
      </div>
    );
  };

  /** Grid View — Cinema Grouped */
  const renderCinemaGroupedGrid = () => (
    <div className="space-y-6 view-fade-enter">
      {Object.entries(cinemaGroups).map(([cinemaName, rooms]) => (
        <div key={cinemaName}>
          <button
            onClick={() => toggleSection(`cinema_${cinemaName}`)}
            className="w-full flex items-center gap-3 py-2 px-1 group cursor-pointer text-left"
          >
            <ChevronDown className={`w-4 h-4 text-gray-500 section-header-chevron ${collapsedSections[`cinema_${cinemaName}`] ? 'rotated' : ''}`} />
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">{cinemaName}</span>
            <div className="flex-1 h-px bg-[#1a2238]" />
          </button>
          <div
            className={`section-collapsible ${collapsedSections[`cinema_${cinemaName}`] ? 'collapsed' : 'expanded'}`}
            style={{ maxHeight: collapsedSections[`cinema_${cinemaName}`] ? 0 : '10000px' }}
          >
            {Object.entries(rooms).map(([roomName, movieMap]) => (
              <div key={roomName} className="ml-6 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <DoorOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400 uppercase">{roomName}</span>
                </div>
                {Object.entries(movieMap).map(([movieTitle, sts]) => {
                  const firstSt = sts[0];
                  const movieObj = movies.find(m => m.uuid === firstSt?.movieUuid);
                  const rawPoster = movieObj?.primaryMediaUrl || firstSt?.moviePosterUrl;
                  return (
                    <div key={movieTitle} className="ml-5 mb-3">
                      <div className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2">
                        <img
                          src={getPosterSrc(rawPoster, 80)}
                          data-original-url={rawPoster || ''}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-6 h-8 object-cover rounded border border-[#1a2238] bg-[#0F1322] shrink-0"
                          onError={handlePosterError}
                        />
                        <span>{movieTitle}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-8">
                      {sts.map(st => (
                        <div
                          key={st.uuid}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a2238] bg-[#0B0F19]/70 hover:border-gray-600 transition-all text-xs cursor-default"
                          style={{ borderLeftColor: STATUS_CONFIG[st.status]?.accent, borderLeftWidth: '3px' }}
                        >
                          <input
                            type="checkbox"
                            className="st-checkbox"
                            checked={selectedIds.has(st.uuid)}
                            onChange={() => toggleSelection(st.uuid)}
                            style={{ width: 14, height: 14 }}
                          />
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="font-bold text-white">{formatTimeOnly(st.startTime)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-gray-400">{formatTimeOnly(st.endTime)}</span>
                          <StatusBadge status={st.status} />
                          <span className="text-amber-400 font-mono font-bold" title={`Thường: ${st.basePrice?.toLocaleString('vi-VN')}đ\nVIP: ${st.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${st.couplePrice?.toLocaleString('vi-VN')}đ`}>
                            {st.basePrice?.toLocaleString('vi-VN')}đ
                          </span>
                          {getValidTransitions(st.status).map(t => (
                            <button
                              key={t.target}
                              onClick={() => handleStatusTransition(st.uuid, t.target)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${getTransitionBtnClass(t.target)}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}`
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(cinemaGroups).length === 0 && (
        <EmptyState icon={Building2} title="Không có dữ liệu" subtitle="Thử thay đổi bộ lọc hoặc chọn ngày khác." />
      )}
    </div>
  );

  /** List View */
  const renderListView = () => (
    <div className="bg-[#0B0F19]/70 border border-[#1a2238] rounded-xl overflow-hidden view-fade-enter">
      {/* Header */}
      <div className="list-header">
        <div>
          <input
            type="checkbox"
            className="st-checkbox"
            checked={filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid))}
            onChange={() => {
              const allSelected = filteredShowtimes.every(s => selectedIds.has(s.uuid));
              const next = new Set(selectedIds);
              filteredShowtimes.forEach(s => allSelected ? next.delete(s.uuid) : next.add(s.uuid));
              setSelectedIds(next);
            }}
          />
        </div>
        <div>Phim</div>
        <div>Rạp / Phòng</div>
        <div>Thời gian</div>
        <div>Trạng thái</div>
        <div>Giá vé</div>
        <div>Thao tác</div>
      </div>
      {/* Rows */}
      {paginatedShowtimes.length === 0 ? (
        <EmptyState icon={AlignJustify} title="Không có suất chiếu" subtitle="Thử thay đổi bộ lọc." />
      ) : (
        paginatedShowtimes.map(row => {
          const trans = getValidTransitions(row.status);
          const isSelected = selectedIds.has(row.uuid);
          const movieObj = movies.find(m => m.uuid === row.movieUuid);
          const rawPoster = movieObj?.primaryMediaUrl || row.moviePosterUrl;
          return (
            <div key={row.uuid} className={`list-row ${isSelected ? 'selected' : ''}`}>
              <div>
                <input type="checkbox" className="st-checkbox" checked={isSelected} onChange={() => toggleSelection(row.uuid)} />
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={getPosterSrc(rawPoster, 80)}
                  data-original-url={rawPoster || ''}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-8 h-10 object-cover rounded border border-[#1a2238] bg-[#0F1322] shrink-0 shadow-sm"
                  onError={handlePosterError}
                />
                <span className="font-bold text-white text-xs truncate" title={row.movieTitle}>{row.movieTitle}</span>
              </div>
              <div className="text-xs text-gray-400 truncate">
                <span>{row.cinemaName}</span>
                <span className="block text-blue-400 text-[10px]">{row.cinemaRoomName}</span>
              </div>
              <div className="text-xs font-mono">
                <span className="text-white font-bold">{formatTimeOnly(row.startTime)}</span>
                <span className="text-gray-600"> → </span>
                <span className="text-gray-400">{formatTimeOnly(row.endTime)}</span>
              </div>
              <div><StatusBadge status={row.status} /></div>
              <div className="text-amber-400 font-mono font-bold text-xs" title={`Thường: ${row.basePrice?.toLocaleString('vi-VN')}đ\nVIP: ${row.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${row.couplePrice?.toLocaleString('vi-VN')}đ`}>
                {row.basePrice?.toLocaleString('vi-VN')}đ
              </div>
              <div className="flex flex-wrap gap-1">
                {trans.map(t => (
                  <button
                    key={t.target}
                    onClick={() => handleStatusTransition(row.uuid, t.target)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${getTransitionBtnClass(t.target)}`}
                  >
                    {t.label}
                  </button>
                ))}
                {trans.length === 0 && <span className="text-[10px] text-gray-600 italic">Cuối</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );



  /** Room View */
  const renderRoomView = () => {
    const hours = Array.from({ length: 17 }, (_, i) => i + 7);
    const now = new Date();
    const nowHour = now.getHours() + now.getMinutes() / 60;
    const nowPct = ((nowHour - 7) / 16) * 100;

    return (
      <div className="space-y-3 view-fade-enter">
        {uniqueRooms.length === 0 ? (
          <EmptyState icon={DoorOpen} title="Không có phòng chiếu" subtitle="Chọn ngày có suất chiếu." />
        ) : (
          uniqueRooms.map(({ cinema, room, key }) => {
            const roomShowtimes = filteredShowtimes.filter(
              s => s.cinemaName === cinema && s.cinemaRoomName === room
            );
            const totalSlots = roomShowtimes.length;
            const activeSlots = roomShowtimes.filter(s => s.status === 'OPEN_FOR_BOOKING' || s.status === 'SOLD_OUT').length;
            return (
              <div key={key} className="bg-[#0B0F19]/70 border border-[#1a2238] rounded-xl overflow-hidden">
                {/* Room header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2238]">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{room}</p>
                      <p className="text-[10px] text-gray-500">{cinema}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500 font-semibold">{totalSlots} suất</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{activeSlots} hoạt động</span>
                  </div>
                </div>
                {/* Timeline */}
                <div className="timeline-container st-scroll">
                  <div style={{ minWidth: '900px' }}>
                    {/* Hour labels */}
                    <div className="flex border-b border-[#1a2238]/50">
                      {hours.map(h => (
                        <div key={h} className="flex-1 text-center py-1.5 border-r border-[#1a2238]/30 text-[9px] font-bold text-gray-600 tabular-nums">
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                    {/* Blocks */}
                    <div className="relative" style={{ height: '48px' }}>
                      {selectedDate === 'today' && nowPct >= 0 && nowPct <= 100 && (
                        <div className="now-indicator" style={{ left: `${nowPct}%` }} />
                      )}
                      {roomShowtimes.map(st => {
                        if (!st.startTime || !st.endTime) return null;
                        const start = new Date(st.startTime);
                        const end = new Date(st.endTime);
                        const startH = start.getHours() + start.getMinutes() / 60;
                        const endH = end.getHours() + end.getMinutes() / 60;
                        const leftPct = ((startH - 7) / 16) * 100;
                        const widthPct = ((endH - startH) / 16) * 100;
                        const cfg = STATUS_CONFIG[st.status] || STATUS_CONFIG.DRAFT;
                        return (
                          <div
                            key={st.uuid}
                            className="room-block"
                            style={{
                              left: `${Math.max(0, leftPct)}%`,
                              width: `${Math.min(widthPct, 100 - leftPct)}%`,
                              background: cfg.accentBg,
                              borderLeft: `3px solid ${cfg.accent}`,
                              color: cfg.accent,
                            }}
                            title={`${st.movieTitle} • ${formatTimeOnly(st.startTime)}–${formatTimeOnly(st.endTime)}`}
                          >
                            <span className="truncate text-white text-[10px] font-bold">{st.movieTitle}</span>
                            <span className="text-[9px] opacity-70">{formatTimeOnly(st.startTime)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <div className="space-y-6 text-left">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Trung Tâm Vận Hành Rạp</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Lịch Chiếu Phim</h1>
          <p className="text-sm text-gray-400 mt-2">Điều phối trạng thái, khởi tạo và phân bổ khung giờ chiếu phim trên toàn hệ thống rạp.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs text-white font-bold transition shadow-lg shadow-amber-600/10 cursor-pointer shrink-0"
            onClick={handleAutoClick}
          >
            <CalendarDays className="w-4 h-4" /> Tạo Lịch Tự Động
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs text-white font-bold transition shadow-lg shadow-red-600/10 cursor-pointer shrink-0"
            onClick={handleAddClick}
          >
            <Plus className="w-4 h-4" /> Thêm Lịch Chiếu
          </button>
        </div>
      </div>

      {/* ==================== KPI CARDS ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Tổng', value: stats.total, icon: Film, color: 'text-indigo-400', kpiClass: 'kpi-total' },
          { label: 'Đang Mở Bán', value: stats.selling, icon: Ticket, color: 'text-emerald-400', kpiClass: 'kpi-selling' },
          { label: 'Sắp Chiếu', value: stats.scheduled, icon: CalendarClock, color: 'text-blue-400', kpiClass: 'kpi-upcoming' },
          { label: 'Đang Chiếu', value: stats.playing, icon: Play, color: 'text-purple-400', kpiClass: 'kpi-playing' },
          { label: 'Đã Kết Thúc', value: stats.finished, icon: Eye, color: 'text-gray-400', kpiClass: 'kpi-ended' },
          { label: 'Đã Hủy', value: stats.cancelled, icon: Ban, color: 'text-rose-400', kpiClass: 'kpi-cancelled' },
          { label: 'Doanh Thu', value: stats.revenue >= 1000000 ? `${(stats.revenue / 1000000).toFixed(1)}M` : stats.revenue.toLocaleString('vi-VN') + 'đ', icon: CreditCard, color: 'text-pink-400', kpiClass: 'kpi-revenue' },
        ].map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} tabular-nums leading-none`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ==================== DATE NAVIGATOR ==================== */}
      <div className="mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 st-scroll">
          {/* "All" button */}
          <button
            onClick={() => setSelectedDate('all')}
            className={`date-nav-item shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border border-[#1a2238] bg-[#0B0F19]/70 min-w-[80px] ${selectedDate === 'all' ? 'active' : 'hover:border-gray-600'}`}
          >
            <span className="text-[10px] font-bold text-gray-500 uppercase">Tất cả</span>
            <span className="text-sm font-black text-white mt-0.5">{showtimes.length}</span>
            <span className="text-[9px] text-gray-500 mt-0.5">suất chiếu</span>
          </button>

          <div className="w-px h-10 bg-[#1a2238] shrink-0" />

          {dateNavItems.map(item => (
            <button
              key={item.key}
              onClick={() => setSelectedDate(item.key)}
              className={`date-nav-item shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border border-[#1a2238] bg-[#0B0F19]/70 min-w-[90px] ${selectedDate === item.key ? 'active' : 'hover:border-gray-600'}`}
            >
              <span className={`text-[10px] font-bold uppercase ${selectedDate === item.key ? 'date-nav-day text-red-400' : 'text-gray-500'}`}>
                {item.label}
              </span>
              <span className="text-sm font-black text-white mt-0.5">{item.dateStr}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-gray-500">{item.count} suất</span>
                <span className="text-[9px] text-emerald-500/70">{item.movies} phim</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TOOLBAR ==================== */}
      <div className="bg-[#0B0F19]/70 border border-[#1a2238] rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            id="showtime-search"
            className="w-full rounded-lg bg-[#0F1322] border border-[#1a2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
            placeholder="Tìm phim, rạp, phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          id="showtime-status-filter"
          className="rounded-lg bg-[#0F1322] border border-[#1a2238] px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SCHEDULED">Sắp Chiếu</option>
          <option value="OPEN_FOR_BOOKING">Đang Mở Bán</option>
          <option value="SOLD_OUT">Hết Ghế</option>
          <option value="CANCELLED">Đã Hủy</option>
          <option value="FINISHED">Đã Kết Thúc</option>
        </select>

        {/* Cinema filter */}
        <select
          id="showtime-cinema-filter"
          className="rounded-lg bg-[#0F1322] border border-[#1a2238] px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer"
          value={cinemaFilter}
          onChange={(e) => setCinemaFilter(e.target.value)}
        >
          <option value="">Tất cả rạp</option>
          {uniqueCinemaNames.map(n => (<option key={n} value={n}>{n}</option>))}
        </select>

        {/* Sort */}
        <select
          id="showtime-sort"
          className="rounded-lg bg-[#0F1322] border border-[#1a2238] px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          {SORT_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>

        {/* Bulk select all toggle */}
        <button
          type="button"
          onClick={() => {
            const allSelected = filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid));
            const next = new Set(selectedIds);
            filteredShowtimes.forEach(s => {
              if (allSelected) {
                next.delete(s.uuid);
              } else {
                next.add(s.uuid);
              }
            });
            setSelectedIds(next);
          }}
          className="rounded-lg bg-[#0F1322] border border-[#1a2238] px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 transition-colors cursor-pointer"
        >
          {filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>

        {/* Group by toggle (grid view only) */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-1 bg-[#0F1322] border border-[#1a2238] rounded-lg p-1">
            <button
              onClick={() => setGroupBy('status')}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${groupBy === 'status' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Nhóm theo trạng thái"
            >
              <Layers className="w-3.5 h-3.5 inline mr-1" />Trạng thái
            </button>
            <button
              onClick={() => setGroupBy('cinema')}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${groupBy === 'cinema' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Nhóm theo Rạp → Phòng → Phim"
            >
              <Building2 className="w-3.5 h-3.5 inline mr-1" />Rạp
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-[#0F1322] border border-[#1a2238] rounded-lg p-1">
          {VIEW_MODES.map(vm => (
            <button
              key={vm.key}
              onClick={() => setViewMode(vm.key)}
              title={vm.label}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === vm.key ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <vm.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ==================== BULK ACTION BAR ==================== */}
      {selectedIds.size > 0 && (
        <div className="bulk-bar bg-[#0B0F19]/90 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-white">
            <span className="text-red-400">{selectedIds.size}</span> suất chiếu đã chọn
          </span>
          <div className="flex-1" />
          <button
            onClick={() => handleBulkAction('SCHEDULED')}
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold cursor-pointer hover:bg-blue-500/20 transition"
          >
            <CalendarClock className="w-3 h-3 inline mr-1" />Sắp Chiếu
          </button>
          <button
            onClick={() => handleBulkAction('OPEN_FOR_BOOKING')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold cursor-pointer hover:bg-emerald-500/20 transition"
          >
            <Ticket className="w-3 h-3 inline mr-1" />Mở Bán
          </button>
          <button
            onClick={() => handleBulkAction('FINISHED')}
            className="px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[11px] font-bold cursor-pointer hover:bg-zinc-500/20 transition"
          >
            <Eye className="w-3 h-3 inline mr-1" />Kết Thúc
          </button>
          <button
            onClick={() => handleBulkAction('CANCELLED')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold cursor-pointer hover:bg-rose-500/20 transition"
          >
            <XCircle className="w-3 h-3 inline mr-1" />Hủy Hàng Loạt
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[11px] font-bold cursor-pointer hover:bg-white/10 transition"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ==================== CONTENT AREA ==================== */}
      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <>
          {viewMode === 'grid' && renderGridView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'room' && renderRoomView()}

          {/* Centralized Pagination for grid and list views */}
          {(viewMode === 'grid' || viewMode === 'list') && filteredShowtimes.length > itemsPerPage && (
            <div className="mt-6 flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredShowtimes.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* ==================== CREATE SHOWTIME MODAL ==================== */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-[#090D1A] border border-[#1a2238] shadow-2xl p-6 text-left relative max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col">
            <button
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={() => {
                setIsAutoModalOpen(false);
                setIsAutoPreviewOpen(false);
              }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 shrink-0">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <CalendarDays className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tự Động Tạo Suất Chiếu Tối Ưu</h2>
                <p className="text-[10px] text-gray-500">Cấu hình thuật toán tối ưu hóa lịch chiếu theo 5 yếu tố</p>
              </div>
            </div>

            {!isAutoPreviewOpen ? (
              <form onSubmit={handleAutoSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Ngày Bắt Đầu *</label>
                    <input
                      type="date"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.startDate}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Ngày Kết Thúc *</label>
                    <input
                      type="date"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.endDate}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Rạp Chiếu *</label>
                      <select
                        className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                        value={autoFormData.cinemaUuid}
                        onChange={async (e) => {
                          const cinemaUuid = e.target.value;
                          setAutoFormData(prev => ({ ...prev, cinemaUuid, roomUuids: [] }));
                          if (cinemaUuid) {
                            try {
                              const data = await cinemaService.getRoomsByCinema(cinemaUuid);
                              setRooms(data.filter(r => r.status === 'ACTIVE'));
                            } catch (err) {
                              console.error(err);
                            }
                          } else {
                            setRooms([]);
                          }
                        }}
                        required
                      >
                        <option value="">-- Chọn Rạp --</option>
                        {cinemas.map(c => (
                          <option key={c.uuid} value={c.uuid}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1.5">Chọn Phòng Chiếu *</label>
                      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#0F1322] rounded-lg border border-[#1a2238] custom-scrollbar">
                        {rooms.map(room => (
                          <label key={room.uuid} className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={autoFormData.roomUuids.includes(room.uuid)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAutoFormData(prev => {
                                  const nextRooms = checked 
                                    ? [...prev.roomUuids, room.uuid]
                                    : prev.roomUuids.filter(id => id !== room.uuid);
                                  return { ...prev, roomUuids: nextRooms };
                                });
                              }}
                              className="st-checkbox"
                            />
                            <span>{room.name}</span>
                          </label>
                        ))}
                        {rooms.length === 0 && <span className="text-[10px] text-gray-500 col-span-2">Vui lòng chọn rạp chiếu trước</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1.5">Chọn Phim Chiếu *</label>
                      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-2 bg-[#0F1322] rounded-lg border border-[#1a2238] custom-scrollbar">
                        {movies.map(movie => (
                          <label key={movie.uuid} className="flex items-center justify-between cursor-pointer text-xs text-gray-300 hover:text-white p-1 hover:bg-white/5 rounded transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={autoFormData.movieUuids.includes(movie.uuid)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAutoFormData(prev => {
                                    const nextMovies = checked 
                                      ? [...prev.movieUuids, movie.uuid]
                                      : prev.movieUuids.filter(id => id !== movie.uuid);
                                    return { ...prev, movieUuids: nextMovies };
                                  });
                                }}
                                className="st-checkbox"
                              />
                              <span className="font-bold truncate max-w-[150px]">{movie.title}</span>
                            </div>
                            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-black shrink-0 font-mono">
                              ★ {movie.rating != null ? movie.rating.toFixed(1) : '—'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giờ mở cửa *</label>
                    <input
                      type="time"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.startTime}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giờ đóng cửa *</label>
                    <input
                      type="time"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.endTime}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Dọn dẹp (phút) *</label>
                    <input
                      type="number"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                      value={autoFormData.intervalMinutes}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, intervalMinutes: parseInt(e.target.value) || 15 }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Thường (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.basePrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé VIP (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.vipPrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, vipPrice: parseInt(e.target.value) || 120000 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Đôi (đ) *</label>
                    <input
                      type="number"
                      step="5000"
                      className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                      value={autoFormData.couplePrice}
                      onChange={(e) => setAutoFormData(prev => ({ ...prev, couplePrice: parseInt(e.target.value) || 160000 }))}
                      required
                    />
                  </div>
                </div>

                {/* Weights Sliders */}
                <div className="bg-[#0F1322]/50 border border-[#1a2238] rounded-xl p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase text-amber-400 font-black">Trọng số thuật toán (Weights)</span>
                    <span className="text-[10px] text-gray-500">Tùy biến mức độ ưu tiên giữa các yếu tố</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Weekend Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Cuối tuần (Weekend)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.weekendWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.weekendWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, weekendWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Golden Hour Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Giờ vàng (Golden Hour)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.goldenHourWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.goldenHourWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, goldenHourWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Rating Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Đánh giá phim (Rating)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.ratingWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.ratingWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, ratingWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                    {/* Genre Weight */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Thể loại phim (Genre)</span>
                        <span className="font-mono text-amber-400 font-bold">{autoFormData.genreWeight.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={autoFormData.genreWeight}
                        onChange={(e) => setAutoFormData(prev => ({ ...prev, genreWeight: parseFloat(e.target.value) }))}
                        className="w-full accent-amber-500 bg-[#1a2238] rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2238] shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAutoModalOpen(false)}
                    className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAutoLoading}
                    className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                  >
                    {isAutoLoading ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Đang phân tích...
                      </>
                    ) : (
                      <>Phân tích & Gợi ý</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-3 shrink-0 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">
                    Tìm thấy <span className="text-amber-400">{previewGenerated.length}</span> suất chiếu tối ưu.
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="st-checkbox"
                      checked={previewGenerated.length > 0 && selectedPreviewUuids.size === previewGenerated.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPreviewUuids(new Set(previewGenerated.map((_, idx) => idx)));
                        } else {
                          setSelectedPreviewUuids(new Set());
                        }
                      }}
                    />
                    <span>Chọn tất cả</span>
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] custom-scrollbar">
                  {previewGenerated.map((p, idx) => {
                    const isSelected = selectedPreviewUuids.has(idx);
                    const pillColor = p.priorityScore >= 25 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : p.priorityScore >= 15 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 p-3 rounded-lg border bg-[#0B0F19]/90 transition-all ${isSelected ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-[#1a2238] hover:border-gray-700'}`}
                      >
                        <div className="flex items-center shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => togglePreviewSelection(idx)}
                            className="st-checkbox cursor-pointer"
                          />
                        </div>

                        <div className="w-10 h-14 rounded overflow-hidden bg-[#0F1322] border border-[#1a2238] shrink-0">
                          <img
                            src={getPosterSrc(p.moviePosterUrl, 80)}
                            data-original-url={p.moviePosterUrl || ''}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={handlePosterError}
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="font-black text-white text-xs truncate" title={p.movieTitle}>{p.movieTitle}</h4>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-black font-mono shrink-0 ${pillColor}`}>
                                Điểm: {p.priorityScore.toFixed(1)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                              <span className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded text-[9px] uppercase">{p.cinemaRoomName}</span>
                              <span>•</span>
                              <span>{p.durationMinutes} phút</span>
                              <span>•</span>
                              <span className="font-mono font-bold text-amber-400" title={`Thường: ${p.basePrice.toLocaleString('vi-VN')}đ\nVIP: ${p.vipPrice?.toLocaleString('vi-VN')}đ\nĐôi: ${p.couplePrice?.toLocaleString('vi-VN')}đ`}>
                                {p.basePrice.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-[#1a2238]/50">
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-white font-bold">{formatTimeOnly(p.startTime)}</span>
                              <span>→</span>
                              <span className="text-gray-400">{formatTimeOnly(p.endTime)}</span>
                              <span className="ml-1 text-gray-600">({formatDateShort(new Date(p.startTime))} {formatWeekday(new Date(p.startTime))})</span>
                            </div>
                            <div className="flex gap-1.5 text-[8px] font-black uppercase text-gray-500">
                              {p.scoreBreakdown.weekendScore > 0 && <span className="text-emerald-500/80">Cuối tuần</span>}
                              {p.scoreBreakdown.goldenHourScore > 0 && <span className="text-purple-500/80">Giờ vàng</span>}
                              {p.scoreBreakdown.genreScore > 4.0 && <span className="text-blue-500/80">HOT Genre</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#1a2238] mt-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAutoPreviewOpen(false)}
                    className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleSaveAuto}
                    disabled={isSavingAuto || selectedPreviewUuids.size === 0}
                    className="rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                  >
                    {isSavingAuto ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                        Đang lưu...
                      </>
                    ) : (
                      <>Lưu {selectedPreviewUuids.size} Suất Chiếu</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1a2238] shadow-2xl p-6 text-left relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Plus className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thêm Suất Chiếu Mới</h2>
                <p className="text-[10px] text-gray-500">Tạo khung giờ chiếu phim mới cho hệ thống rạp</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Movie Selection */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-400">Chọn Phim *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isMovieDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#090D1A] border border-[#1a2238] rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      <div className="p-2 border-b border-[#1a2238] flex items-center gap-2 mb-1">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm nhanh tên phim..."
                          className="w-full text-xs outline-none border-none bg-transparent text-white"
                          value={searchMovieKeyword}
                          onChange={(e) => setSearchMovieKeyword(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {isLoadingMovies ? (
                        <div className="text-center py-4 text-xs text-gray-400">Đang tải danh sách phim...</div>
                      ) : filteredMovies.length > 0 ? (
                        filteredMovies.map(movie => (
                          <button
                            key={movie.uuid}
                            type="button"
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition text-left cursor-pointer ${formData.movieUuid === movie.uuid ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'border border-transparent'}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <Film className="w-4 h-4 shrink-0 text-gray-500" />
                            <div className="overflow-hidden leading-tight">
                              <div className="font-bold text-xs text-white truncate">{movie.title}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{movie.durationMinutes} phút · {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">Không tìm thấy bộ phim nào</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedMovie && (
                  <div className="flex items-center gap-3 p-3 bg-[#0F1322]/50 rounded-lg border border-[#1a2238] mt-2 text-left">
                    <Film className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="overflow-hidden leading-normal text-left">
                      <div className="font-bold text-white truncate text-xs">{selectedMovie.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Thời lượng: {selectedMovie.durationMinutes} phút (+10m trailer)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cinema Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Rạp Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaUuid}
                  onChange={(e) => handleCinemaChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn Rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.uuid} value={c.uuid}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Phòng Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaRoomUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, cinemaRoomUuid: e.target.value }))}
                  required
                  disabled={!formData.cinemaUuid}
                >
                  <option value="">-- Chọn Phòng Chiếu --</option>
                  {rooms.map(r => (
                    <option key={r.uuid} value={r.uuid}>{r.name} ({r.roomCode} · {r.roomType})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Datetime Picker */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Thời Gian Bắt Đầu *</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Base Ticket Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Thường (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                  />
                </div>
                {/* VIP Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé VIP (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.vipPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, vipPrice: parseInt(e.target.value) || 120000 }))}
                  />
                </div>
                {/* Couple Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Đôi (đ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1a2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.couplePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, couplePrice: parseInt(e.target.value) || 160000 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1a2238]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2 text-xs text-white font-bold cursor-pointer transition-colors shadow-md shadow-red-600/10"
                >
                  Tạo Suất Chiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowtimesPage;
