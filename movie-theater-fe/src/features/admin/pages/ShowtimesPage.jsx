import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Film, Search, Plus, Calendar, Tv, Play,
  Ban, CheckCircle, MapPin, CreditCard,
  Clock, ChevronDown, ChevronsDown, ChevronsUp,
  Layers, Building2, Eye, EyeOff, XCircle, Ticket,
  DoorOpen, CalendarDays, CalendarClock, AlignJustify,
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import { AdminPage, PageHeader } from '../components';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../shared/utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import {
  STATUS_ORDER,
  STATUS_CONFIG,
  SORT_OPTIONS,
  VIEW_MODES,
  DEFAULT_COLLAPSED_SECTIONS,
  KPI_STATUS_MAP,
  formatTimeOnly,
  formatDateShort,
  formatWeekday,
  isSameDay,
  getValidTransitions,
  getTransitionBtnClass,
  sortShowtimes,
  normalizeActiveRooms,
} from './showtimes/showtimesConstants';
import {
  StatusBadge,
  SkeletonGrid,
  EmptyState,
  SectionHeader,
} from './showtimes/showtimesUi';
import ShowtimeCard from './showtimes/ShowtimeCard';
import ShowtimesKpiGrid from './showtimes/ShowtimesKpiGrid';
import './ShowtimesPage.css';

const ShowtimesAutoModal = lazy(() => import('./showtimes/ShowtimesAutoModal'));
const ShowtimesCreateModal = lazy(() => import('./showtimes/ShowtimesCreateModal'));

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

// ========== MAIN COMPONENT ==========

const ShowtimesPage = () => {
  useMediaUrlRouting();

  // ---------- STATE ----------
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [createRooms, setCreateRooms] = useState([]);
  const [autoRooms, setAutoRooms] = useState([]);
  const [isLoadingCreateRooms, setIsLoadingCreateRooms] = useState(false);
  const [isLoadingAutoRooms, setIsLoadingAutoRooms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideCancelled, setHideCancelled] = useState(true);
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
  const [collapsedSections, setCollapsedSections] = useState({ ...DEFAULT_COLLAPSED_SECTIONS });

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
  }, [searchTerm, statusFilter, hideCancelled, cinemaFilter, selectedDate, sortKey]);

  const loadCreateRooms = useCallback(async (cinemaUuid) => {
    if (!cinemaUuid) {
      setCreateRooms([]);
      return;
    }
    setIsLoadingCreateRooms(true);
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setCreateRooms(normalizeActiveRooms(data));
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setCreateRooms([]);
      notificationService.error('Không tải được danh sách phòng chiếu');
    } finally {
      setIsLoadingCreateRooms(false);
    }
  }, []);

  const loadAutoRooms = useCallback(async (cinemaUuid) => {
    if (!cinemaUuid) {
      setAutoRooms([]);
      return;
    }
    setIsLoadingAutoRooms(true);
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setAutoRooms(normalizeActiveRooms(data));
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setAutoRooms([]);
      notificationService.error('Không tải được danh sách phòng chiếu');
    } finally {
      setIsLoadingAutoRooms(false);
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    loadCreateRooms(formData.cinemaUuid);
  }, [isModalOpen, formData.cinemaUuid, loadCreateRooms]);

  useEffect(() => {
    if (!isAutoModalOpen) return;
    loadAutoRooms(autoFormData.cinemaUuid);
  }, [isAutoModalOpen, autoFormData.cinemaUuid, loadAutoRooms]);

  const scrollAdminMainToTop = useCallback(() => {
    const main = document.querySelector('[data-scroll-container="admin-main"]');
    if (main) main.scrollTop = 0;
  }, []);

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
    setAutoRooms([]);
    setPreviewGenerated([]);
    setSelectedPreviewUuids(new Set());
    setIsAutoPreviewOpen(false);
    setIsAutoModalOpen(true);
    scrollAdminMainToTop();
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
  const handleCinemaChange = (cinemaUuid) => {
    setFormData(prev => ({ ...prev, cinemaUuid, cinemaRoomUuid: '' }));
  };

  const handleAutoCinemaChange = (cinemaUuid) => {
    setAutoFormData(prev => ({ ...prev, cinemaUuid, roomUuids: [] }));
  };

  const handleAddClick = () => {
    setFormData({
      movieUuid: movies[0]?.uuid || '', cinemaUuid: cinemas[0]?.uuid || '',
      cinemaRoomUuid: '', startTime: '', basePrice: 85000, vipPrice: 120000, couplePrice: 160000,
    });
    setIsMovieDropdownOpen(false);
    setSearchMovieKeyword('');
    setIsModalOpen(true);
    scrollAdminMainToTop();
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

  const toggleSelectAllInGroup = useCallback((items) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const uuids = items.map((s) => s.uuid).filter(Boolean);
      const allSelected = uuids.length > 0 && uuids.every((id) => next.has(id));
      uuids.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }, []);

  const toggleSection = useCallback((key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const expandAllStatusSections = useCallback(() => {
    setCollapsedSections({});
  }, []);

  const collapseInactiveSections = useCallback(() => {
    setCollapsedSections({ ...DEFAULT_COLLAPSED_SECTIONS });
  }, []);

  const handleKpiClick = useCallback((label) => {
    const mapped = KPI_STATUS_MAP[label];
    if (mapped === undefined) return;
    setStatusFilter(mapped);
    if (mapped === 'CANCELLED') setHideCancelled(false);
    if (mapped === 'FINISHED' || mapped === 'CANCELLED') {
      setCollapsedSections((prev) => ({ ...prev, [mapped]: false }));
    }
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setCinemaFilter('');
    setHideCancelled(true);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter || cinemaFilter || !hideCancelled,
  );

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
      const matchesCancelledHide =
        !hideCancelled || statusFilter === 'CANCELLED' || st.status !== 'CANCELLED';
      return matchesSearch && matchesStatus && matchesCinema && matchesCancelledHide;
    });
    return sortShowtimes(result, sortKey);
  }, [dateFilteredShowtimes, searchTerm, statusFilter, hideCancelled, cinemaFilter, sortKey]);

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

  // Group by status (full filtered set — not paginated slice)
  const statusGroups = useMemo(() => {
    const groups = {};
    STATUS_ORDER.forEach(s => { groups[s] = []; });
    filteredShowtimes.forEach(st => {
      if (groups[st.status]) groups[st.status].push(st);
      else groups[st.status] = [st];
    });
    const ordered = STATUS_ORDER
      .map(s => ({ status: s, items: groups[s] || [] }))
      .filter(g => g.items.length > 0);
    const extras = Object.keys(groups)
      .filter((s) => !STATUS_ORDER.includes(s) && groups[s]?.length > 0)
      .map((s) => ({ status: s, items: groups[s] }));
    return [...ordered, ...extras];
  }, [filteredShowtimes]);

  // Group by cinema → room → movie (full filtered set)
  const cinemaGroups = useMemo(() => {
    const map = {};
    filteredShowtimes.forEach(st => {
      const cinema = st.cinemaName || 'Không rõ rạp';
      const room = st.cinemaRoomName || 'Không rõ phòng';
      if (!map[cinema]) map[cinema] = {};
      if (!map[cinema][room]) map[cinema][room] = {};
      const movie = st.movieTitle || 'Không rõ phim';
      if (!map[cinema][room][movie]) map[cinema][room][movie] = [];
      map[cinema][room][movie].push(st);
    });
    return map;
  }, [filteredShowtimes]);

  // Movie selection for modal
  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchMovieKeyword.toLowerCase()));
  const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);

  // ========== RENDER HELPERS ==========

  /** Grid View — Status Grouped */
  const renderGridView = () => {
    if (groupBy === 'cinema') return renderCinemaGroupedGrid();

    return (
      <div className="space-y-2 view-fade-enter">
        {statusGroups.map(({ status, items }) => {
          const isCollapsed = collapsedSections[status];
          return (
            <div key={status} className="st-status-group">
              <SectionHeader
                status={status}
                count={items.length}
                isCollapsed={isCollapsed}
                onToggle={() => toggleSection(status)}
                onSelectAll={() => toggleSelectAllInGroup(items)}
                allSelected={items.length > 0 && items.every((s) => selectedIds.has(s.uuid))}
              />
              <div
                className={`section-collapsible ${isCollapsed ? 'collapsed' : 'expanded'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                  {items.map((row) => (
                    <ShowtimeCard
                      key={row.uuid}
                      row={row}
                      movies={movies}
                      isSelected={selectedIds.has(row.uuid)}
                      onToggleSelect={toggleSelection}
                      onStatusTransition={handleStatusTransition}
                      getPosterSrc={getPosterSrc}
                    />
                  ))}
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

  // ========== MAIN RENDER ==========
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trung tâm vận hành rạp"
        title="Quản lý lịch chiếu phim"
        description="Điều phối trạng thái, khởi tạo và phân bổ khung giờ chiếu phim trên toàn hệ thống rạp."
        variant="display"
        secondaryActions={[
          {
            label: 'Tạo lịch tự động',
            onClick: handleAutoClick,
            icon: <CalendarDays className="w-4 h-4" />,
          },
        ]}
        primaryAction={{
          label: 'Thêm lịch chiếu',
          onClick: handleAddClick,
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <ShowtimesKpiGrid stats={stats} statusFilter={statusFilter} onKpiClick={handleKpiClick} />

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
      <div className="st-toolbar">
        <div className="st-toolbar__row">
          <div className="st-toolbar__search">
            <Search className="st-toolbar__search-icon" />
            <input
              id="showtime-search"
              className="st-control st-control--search"
              placeholder="Tìm phim, rạp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            id="showtime-status-filter"
            className="st-control st-control--select"
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

          <select
            id="showtime-cinema-filter"
            className="st-control st-control--select"
            value={cinemaFilter}
            onChange={(e) => setCinemaFilter(e.target.value)}
          >
            <option value="">Tất cả rạp</option>
            {uniqueCinemaNames.map(n => (<option key={n} value={n}>{n}</option>))}
          </select>

          <select
            id="showtime-sort"
            className="st-control st-control--select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            {SORT_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>

          <button
            type="button"
            onClick={() => setHideCancelled((prev) => !prev)}
            title={hideCancelled ? 'Hiện suất chiếu đã hủy' : 'Ẩn suất chiếu đã hủy'}
            className={`st-chip ${hideCancelled ? 'st-chip--active st-chip--danger' : ''}`}
          >
            {hideCancelled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideCancelled ? 'Ẩn đã hủy' : 'Hiện đã hủy'}
          </button>
        </div>

        <div className="st-toolbar__row st-toolbar__row--actions">
          <div className="st-toolbar__summary">
            <span>
              Hiển thị <strong>{filteredShowtimes.length}</strong>
              {filteredShowtimes.length !== dateFilteredShowtimes.length && (
                <> / {dateFilteredShowtimes.length}</>
              )}{' '}
              suất
            </span>
            {statusGroups.length > 0 && viewMode === 'grid' && groupBy === 'status' && (
              <span className="st-toolbar__meta">{statusGroups.length} nhóm trạng thái</span>
            )}
            {hasActiveFilters && (
              <button type="button" className="st-toolbar__clear" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>

          {viewMode === 'grid' && groupBy === 'status' && statusGroups.length > 0 && (
            <div className="st-toolbar__group-actions">
              <button type="button" className="st-btn-ghost" onClick={expandAllStatusSections}>
                <ChevronsDown className="w-3.5 h-3.5" /> Mở tất cả
              </button>
              <button type="button" className="st-btn-ghost" onClick={collapseInactiveSections}>
                <ChevronsUp className="w-3.5 h-3.5" /> Thu gọn cũ
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const allSelected = filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid));
              const next = new Set(selectedIds);
              filteredShowtimes.forEach(s => {
                if (allSelected) next.delete(s.uuid);
                else next.add(s.uuid);
              });
              setSelectedIds(next);
            }}
            className="st-btn-ghost"
          >
            {filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>

          {viewMode === 'grid' && (
            <div className="st-segment">
              <button
                type="button"
                onClick={() => setGroupBy('status')}
                className={`st-segment__btn ${groupBy === 'status' ? 'is-active' : ''}`}
                title="Nhóm theo trạng thái"
              >
                <Layers className="w-3.5 h-3.5" /> Trạng thái
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('cinema')}
                className={`st-segment__btn ${groupBy === 'cinema' ? 'is-active' : ''}`}
                title="Nhóm theo Rạp → Phòng → Phim"
              >
                <Building2 className="w-3.5 h-3.5" /> Rạp
              </button>
            </div>
          )}

          <div className="st-segment">
            {VIEW_MODES.map(vm => (
              <button
                key={vm.key}
                type="button"
                onClick={() => setViewMode(vm.key)}
                title={vm.label}
                className={`st-segment__btn st-segment__btn--icon ${viewMode === vm.key ? 'is-active' : ''}`}
              >
                <vm.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
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

          {/* Pagination — list view only; grid groups show full filtered set */}
          {viewMode === 'list' && filteredShowtimes.length > itemsPerPage && (
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

      {isAutoModalOpen && (
        <Suspense fallback={null}>
          <ShowtimesAutoModal
            onClose={() => { setIsAutoModalOpen(false); setIsAutoPreviewOpen(false); }}
            isAutoPreviewOpen={isAutoPreviewOpen}
            autoFormData={autoFormData}
            setAutoFormData={setAutoFormData}
            cinemas={cinemas}
            rooms={autoRooms}
            isLoadingRooms={isLoadingAutoRooms}
            onCinemaChange={handleAutoCinemaChange}
            movies={movies}
            handleAutoSubmit={handleAutoSubmit}
            previewGenerated={previewGenerated}
            selectedPreviewUuids={selectedPreviewUuids}
            setSelectedPreviewUuids={setSelectedPreviewUuids}
            togglePreviewSelection={togglePreviewSelection}
            handleSaveAuto={handleSaveAuto}
            isAutoLoading={isAutoLoading}
            isSavingAuto={isSavingAuto}
            setIsAutoPreviewOpen={setIsAutoPreviewOpen}
          />
        </Suspense>
      )}
      {isModalOpen && (
        <Suspense fallback={null}>
          <ShowtimesCreateModal
            onClose={() => setIsModalOpen(false)}
            formData={formData}
            setFormData={setFormData}
            cinemas={cinemas}
            rooms={createRooms}
            isLoadingRooms={isLoadingCreateRooms}
            movies={movies}
            filteredMovies={filteredMovies}
            selectedMovie={selectedMovie}
            isLoadingMovies={isLoadingMovies}
            isMovieDropdownOpen={isMovieDropdownOpen}
            setIsMovieDropdownOpen={setIsMovieDropdownOpen}
            searchMovieKeyword={searchMovieKeyword}
            setSearchMovieKeyword={setSearchMovieKeyword}
            handleCinemaChange={handleCinemaChange}
            handleSubmit={handleSubmit}
          />
        </Suspense>
      )}
    </AdminPage>
  );
};

export default ShowtimesPage;
