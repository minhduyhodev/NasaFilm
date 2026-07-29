import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Search, Plus, Calendar, Clock, ChevronsDown, ChevronsUp, ChevronRight,
  Eye, EyeOff, XCircle, Ticket, CalendarDays, CalendarClock,
  AlignJustify, Trash2, AlertTriangle,
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_SYSTEM_CONFIG } from '../../../shared/constants/systemConfig';
import { buildAutoFormFromConfig } from './showtimes/showtimesAutoUtils';
import { notificationService } from '../../../shared/services/notificationService';
import { logger } from '../../../shared/utils/logger';
import Pagination from '../../../shared/components/Pagination';
import { AdminPage, PageHeader, FilterPills } from '../components';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../shared/utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import {
  STATUS_ORDER,
  SORT_OPTIONS,
  VIEW_MODES,
  DEFAULT_COLLAPSED_SECTIONS,
  formatTimeOnly,
  formatDateShort,
  formatPrice,
  vnDayKey,
  formatDayKeyLabel,
  isShowtimePlayingNow,
  getValidTransitions,
  getTransitionBtnClass,
  sortShowtimes,
  normalizeActiveRooms,
  findRoomConflicts,
} from './showtimes/showtimesConstants';
import {
  StatusBadge,
  SkeletonGrid,
  EmptyState,
  SectionHeader,
} from './showtimes/showtimesUi';
import ShowtimeCard from './showtimes/ShowtimeCard';
import ShowtimesDraftBanner from './showtimes/ShowtimesDraftBanner';
import ShowtimesTimeline from './showtimes/ShowtimesTimeline';
import ShowtimeDetailDrawer from './showtimes/ShowtimeDetailDrawer';
import ShowtimesCalendar from './showtimes/ShowtimesCalendar';
import ShowtimesRoomPicker from './showtimes/ShowtimesRoomPicker';
import './ShowtimesPage.css';

const ShowtimesAutoModal = lazy(() => import('./showtimes/ShowtimesAutoModal'));
const ShowtimesCreateModal = lazy(() => import('./showtimes/ShowtimesCreateModal'));

const getPosterSrc = (rawUrl, width = 120) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const STEP_TRANSITION_MS = 220;

// ========== MAIN COMPONENT ==========

const ShowtimesPage = () => {
  useMediaUrlRouting();
  const confirm = useConfirm();

  // ---------- STATE ----------
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [roomsByCinema, setRoomsByCinema] = useState({});
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [createRooms, setCreateRooms] = useState([]);
  const [autoRooms, setAutoRooms] = useState([]);
  const [isLoadingCreateRooms, setIsLoadingCreateRooms] = useState(false);
  const [isLoadingAutoRooms, setIsLoadingAutoRooms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);

  // Quy trình 3 bước: 1 = chọn ngày, 2 = chọn rạp/phòng, 3 = điều phối suất
  const todayKey = useMemo(() => vnDayKey(new Date()), []);
  const [step, setStep] = useState(1);
  const [stepAnim, setStepAnim] = useState('enter');
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [y, m] = vnDayKey(new Date()).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1, 5, 0, 0));
  });
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null); // null = cả rạp

  // Filters & search (bước 3)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideCancelled, setHideCancelled] = useState(true);
  const [sortKey, setSortKey] = useState('startTime_asc');
  const [viewMode, setViewMode] = useState('timeline');

  // Pagination (grid/list)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Sections collapse state (grid)
  const [collapsedSections, setCollapsedSections] = useState({ ...DEFAULT_COLLAPSED_SECTIONS });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Detail drawer — lưu uuid để dữ liệu tự cập nhật sau mỗi lần refetch
  const [detailUuid, setDetailUuid] = useState(null);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [searchMovieKeyword, setSearchMovieKeyword] = useState('');
  const [formData, setFormData] = useState({
    movieUuid: '', cinemaUuid: '', cinemaRoomUuid: '', startTime: '',
    basePrice: DEFAULT_SYSTEM_CONFIG.basePrice,
    vipPrice: DEFAULT_SYSTEM_CONFIG.vipPrice,
    couplePrice: DEFAULT_SYSTEM_CONFIG.couplePrice,
  });

  // Auto-scheduling modal
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoStep, setAutoStep] = useState(0);
  const [systemConfig, setSystemConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [previewGenerated, setPreviewGenerated] = useState([]);
  const [selectedPreviewUuids, setSelectedPreviewUuids] = useState(new Set());
  const [autoFormData, setAutoFormData] = useState(() => buildAutoFormFromConfig(DEFAULT_SYSTEM_CONFIG));
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [isSavingAuto, setIsSavingAuto] = useState(false);

  // ---------- DATA FETCHING ----------
  const fetchShowtimes = async () => {
    setIsLoading(true);
    try {
      const data = await showtimeService.getAdminShowtimes();
      const items = data || [];
      setShowtimes(items);

      // Tự động kết thúc các suất đã qua giờ chiếu
      const now = new Date();
      const expiredItems = items.filter(s =>
        s.endTime && new Date(s.endTime) < now &&
        ['OPEN_FOR_BOOKING', 'SOLD_OUT', 'SCHEDULED'].includes(s.status)
      );
      if (expiredItems.length > 0) {
        await Promise.all(expiredItems.map(s =>
          showtimeService.updateShowtimeStatus(s.uuid, 'FINISHED').catch(() => {})
        ));
        const refreshed = await showtimeService.getAdminShowtimes();
        setShowtimes(refreshed || []);
      }
    } catch (error) {
      logger.error('Failed to fetch showtimes:', error);
      notificationService.error('Không tải được danh sách suất chiếu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovies = async () => {
    setIsLoadingMovies(true);
    try {
      const data = await movieService.getAdminMovies({ size: 500 });
      if (data && data.content) {
        setMovies(data.content);
      }
    } catch (error) {
      logger.error('Failed to fetch movies:', error);
    } finally {
      setIsLoadingMovies(false);
    }
  };

  // Rạp + phòng trong 1 lần gọi — dùng cho Bước 2 và các modal
  const fetchCinemas = async () => {
    setIsLoadingCinemas(true);
    try {
      const data = await cinemaService.getCinemasWithRooms('', 0, 100);
      const list = data.content || data || [];
      setCinemas(list);
      const map = {};
      list.forEach((c) => {
        map[c.uuid] = normalizeActiveRooms(c.rooms || []);
      });
      setRoomsByCinema(map);
    } catch (error) {
      logger.error('Failed to fetch cinemas:', error);
      // Fallback: endpoint cũ không kèm phòng
      try {
        const data = await cinemaService.getCinemas('', 0, 100);
        setCinemas(data.content || data || []);
      } catch {
        notificationService.error('Không tải được danh sách rạp');
      }
    } finally {
      setIsLoadingCinemas(false);
    }
  };

  useEffect(() => {
    fetchShowtimes();
    fetchMovies();
    fetchCinemas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, hideCancelled, sortKey, selectedDayKey, selectedCinema, selectedRoom]);

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
      logger.error('Failed to fetch rooms:', error);
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
      logger.error('Failed to fetch rooms:', error);
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

  // ---------- STEP NAVIGATION (Fade & Slide) ----------
  const goToStep = useCallback((nextStep, updater) => {
    setStepAnim('exit');
    window.setTimeout(() => {
      updater?.();
      setStep(nextStep);
      setStepAnim('enter');
      scrollAdminMainToTop();
    }, STEP_TRANSITION_MS);
  }, [scrollAdminMainToTop]);

  const handleSelectDay = useCallback((dayKey) => {
    goToStep(2, () => {
      setSelectedDayKey(dayKey);
      setSelectedIds(new Set());
    });
  }, [goToStep]);

  const handleSelectRoom = useCallback((cinema, room) => {
    goToStep(3, () => {
      setSelectedCinema(cinema);
      setSelectedRoom(room);
      setStatusFilter('');
      setSearchTerm('');
      setCurrentPage(1);
      setSelectedIds(new Set());
      setCollapsedSections({ ...DEFAULT_COLLAPSED_SECTIONS });
    });
  }, [goToStep]);

  const backToStep = useCallback((target) => {
    if (target >= step) return;
    goToStep(target, () => {
      if (target <= 2) {
        setSelectedCinema(null);
        setSelectedRoom(null);
        setSelectedIds(new Set());
      }
      if (target === 1) {
        setSelectedDayKey(null);
      }
    });
  }, [goToStep, step]);

  // ---------- HANDLERS ----------
  const handleCleanupDrafts = async () => {
    const ok = await confirm({
      title: 'Hủy suất chiếu nháp (DRAFT)',
      message:
        'Sẽ hủy toàn bộ suất DRAFT (thường do tạo lịch tự động). Suất đang mở bán / đã lên lịch vẫn giữ. Tiếp tục?',
      confirmLabel: 'Hủy DRAFT',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      const cancelled = await showtimeService.cleanupDraftShowtimes();
      fetchShowtimes();
      notificationService.success(`Đã hủy ${cancelled ?? 0} suất nháp. Bạn có thể tạo lịch mới.`);
    } catch (error) {
      notificationService.error(error.message || 'Không hủy được suất nháp');
    }
  };

  const handleAutoClick = async () => {
    let config = DEFAULT_SYSTEM_CONFIG;
    try {
      config = await systemConfigService.getConfig();
    } catch {
      // fallback
    }
    setSystemConfig(config);
    setAutoFormData(buildAutoFormFromConfig(config, cinemas));
    setAutoRooms([]);
    setPreviewGenerated([]);
    setSelectedPreviewUuids(new Set());
    setAutoStep(0);
    setIsAutoModalOpen(true);
    scrollAdminMainToTop();
  };

  const handleAutoAnalyze = async () => {
    if (autoFormData.roomUuids.length === 0) {
      notificationService.warning('Vui lòng chọn ít nhất một phòng chiếu');
      return;
    }
    if (autoFormData.movieUuids.length === 0) {
      notificationService.warning('Vui lòng chọn ít nhất một bộ phim');
      return;
    }
    if (autoFormData.startDate > autoFormData.endDate) {
      notificationService.warning('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setIsAutoLoading(true);
    try {
      const data = await showtimeService.getAutoShowtimesPreview(autoFormData);
      setPreviewGenerated(data || []);
      setSelectedPreviewUuids(new Set((data || []).map((_, idx) => idx)));
      setAutoStep(2);
      notificationService.success(`Đã gợi ý ${(data || []).length} suất chiếu tối ưu`);
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

    const now = Date.now();
    const selectedPreviews = previewGenerated.filter((_, idx) => selectedPreviewUuids.has(idx));
    const pastCount = selectedPreviews.filter(p => !p.startTime || new Date(p.startTime).getTime() <= now).length;
    const futurePreviews = selectedPreviews.filter(p => p.startTime && new Date(p.startTime).getTime() > now);

    if (futurePreviews.length === 0) {
      notificationService.warning('Tất cả suất chiếu đã chọn đều ở thời điểm đã qua. Vui lòng chọn lại.');
      return;
    }
    if (pastCount > 0) {
      notificationService.warning(`Đã bỏ qua ${pastCount} suất chiếu có giờ bắt đầu đã qua.`);
    }

    setIsSavingAuto(true);
    try {
      const selectedRequests = futurePreviews
        .map(p => ({
          movieUuid: p.movieUuid,
          cinemaRoomUuid: p.cinemaRoomUuid,
          startTime: p.startTime,
          basePrice: p.basePrice,
          vipPrice: p.vipPrice,
          couplePrice: p.couplePrice,
        }));

      await showtimeService.saveAutoShowtimes(selectedRequests, autoFormData.publishStatus || 'DRAFT');
      setIsAutoModalOpen(false);
      setAutoStep(0);
      fetchShowtimes();
      const publishLabel = {
        DRAFT: 'nháp',
        SCHEDULED: 'sắp chiếu',
        OPEN_FOR_BOOKING: 'mở bán',
      }[autoFormData.publishStatus || 'DRAFT'];
      notificationService.success(`Đã lưu ${selectedRequests.length} suất chiếu (${publishLabel})!`);
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

  const handleCinemaChange = (cinemaUuid) => {
    setFormData(prev => ({ ...prev, cinemaUuid, cinemaRoomUuid: '' }));
  };

  const handleAutoCinemaChange = (cinemaUuid) => {
    setAutoFormData(prev => ({ ...prev, cinemaUuid, roomUuids: [] }));
  };

  const handleAddClick = async () => {
    let config = DEFAULT_SYSTEM_CONFIG;
    try {
      config = await systemConfigService.getConfig();
    } catch {
      // fallback
    }
    // Prefill theo ngữ cảnh đang điều phối (ngày / rạp / phòng đã chọn)
    const prefillStartTime = selectedDayKey && selectedDayKey >= todayKey
      ? `${selectedDayKey}T19:00`
      : '';
    setFormData({
      movieUuid: movies[0]?.uuid || '',
      cinemaUuid: selectedCinema?.uuid || cinemas[0]?.uuid || '',
      cinemaRoomUuid: selectedRoom?.uuid || '',
      startTime: prefillStartTime,
      basePrice: config.basePrice ?? DEFAULT_SYSTEM_CONFIG.basePrice,
      vipPrice: config.vipPrice ?? DEFAULT_SYSTEM_CONFIG.vipPrice,
      couplePrice: config.couplePrice ?? DEFAULT_SYSTEM_CONFIG.couplePrice,
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
    const startAt = new Date(formData.startTime);
    if (!formData.startTime || Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now()) {
      notificationService.warning('Chỉ được tạo suất chiếu cho thời gian sắp tới');
      return;
    }
    try {
      const isoStartTime = startAt.toISOString();
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
      const detail = error?.response?.data?.message || error?.message || 'Lỗi khi tạo suất chiếu';
      notificationService.error(detail);
    }
  };

  const handleStatusTransition = async (showtimeUuid, newStatus) => {
    if (newStatus === 'CANCELLED') {
      const ok = await confirm({
        title: 'Hủy suất chiếu',
        message: 'Bạn có chắc chắn muốn hủy suất chiếu này? Hành động này sẽ tự động hủy và hoàn tiền toàn bộ vé đã đặt.',
        confirmLabel: 'Hủy suất chiếu',
        variant: 'warning',
      });
      if (!ok) return;
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
    if (action === 'CANCELLED') {
      const ok = await confirm({
        title: 'Hủy nhiều suất chiếu',
        message: `Bạn có chắc chắn muốn hủy ${ids.length} suất chiếu đã chọn?`,
        confirmLabel: 'Hủy suất chiếu',
        variant: 'warning',
      });
      if (!ok) return;
    }
    if (action === 'FINISHED') {
      const ok = await confirm({
        title: 'Kết thúc nhiều suất chiếu',
        message: `Đánh dấu ${ids.length} suất đã chọn là kết thúc?\n\nLưu ý: suất còn vé đã bán và chưa chiếu xong sẽ bị bỏ qua — hãy dùng Hủy suất (hoàn tiền) hoặc đợi hết giờ chiếu.`,
        confirmLabel: 'Kết thúc suất',
        variant: 'warning',
      });
      if (!ok) return;
    }
    let success = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        try {
          await showtimeService.updateShowtimeStatus(id, action);
          success += 1;
        } catch {
          failed += 1;
        }
      }
      setSelectedIds(new Set());
      fetchShowtimes();
      if (failed === 0) {
        notificationService.success(`Đã cập nhật ${success} suất chiếu thành công!`);
      } else {
        notificationService.warning(`Cập nhật xong: ${success} thành công, ${failed} thất bại (sai bước trạng thái hoặc lỗi server).`);
      }
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

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setHideCancelled(true);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = Boolean(searchTerm || statusFilter || !hideCancelled);

  // ---------- DERIVED DATA ----------
  // Suất trùng khung giờ trong cùng phòng (cảnh báo vận hành, tính trên toàn bộ dữ liệu)
  const conflicts = useMemo(() => findRoomConflicts(showtimes), [showtimes]);

  // Bước 1 — tóm tắt theo từng ngày cho ô lịch
  const dayInfoMap = useMemo(() => {
    const map = new Map();
    showtimes.forEach((st) => {
      if (!st.startTime) return;
      const key = vnDayKey(st.startTime);
      let info = map.get(key);
      if (!info) {
        info = { count: 0, movieSet: new Set(), selling: 0, scheduled: 0, draft: 0, conflict: 0 };
        map.set(key, info);
      }
      info.count += 1;
      if (st.movieUuid) info.movieSet.add(st.movieUuid);
      if (st.status === 'OPEN_FOR_BOOKING') info.selling += 1;
      if (st.status === 'SCHEDULED') info.scheduled += 1;
      if (st.status === 'DRAFT') info.draft += 1;
      if (conflicts.has(st.uuid)) info.conflict += 1;
    });
    map.forEach((info) => {
      info.movies = info.movieSet.size;
      delete info.movieSet;
    });
    return map;
  }, [showtimes, conflicts]);

  // Bước 2 — toàn bộ suất của ngày đã chọn (mọi rạp)
  const dayShowtimes = useMemo(() => {
    if (!selectedDayKey) return [];
    return showtimes.filter(s => s.startTime && vnDayKey(s.startTime) === selectedDayKey);
  }, [showtimes, selectedDayKey]);

  // Bước 3 — phạm vi điều phối: ngày + rạp (+ phòng nếu chọn)
  const scopedShowtimes = useMemo(() => {
    if (!selectedCinema) return dayShowtimes;
    return dayShowtimes.filter(s => {
      if (s.cinemaUuid ? s.cinemaUuid !== selectedCinema.uuid : s.cinemaName !== selectedCinema.name) {
        return false;
      }
      if (selectedRoom && s.cinemaRoomUuid !== selectedRoom.uuid) return false;
      return true;
    });
  }, [dayShowtimes, selectedCinema, selectedRoom]);

  // Lọc search + ẩn đã hủy (chưa áp trạng thái — để đếm số lượng cho pills)
  const baseFilteredShowtimes = useMemo(() => {
    return scopedShowtimes.filter(st => {
      const matchesSearch = !searchTerm ||
        st.movieTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cinemaRoomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.cinemaName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCancelledHide =
        !hideCancelled || statusFilter === 'CANCELLED' || st.status !== 'CANCELLED';
      return matchesSearch && matchesCancelledHide;
    });
  }, [scopedShowtimes, searchTerm, hideCancelled, statusFilter]);

  // Áp thêm bộ lọc trạng thái + sắp xếp
  const filteredShowtimes = useMemo(() => {
    const now = new Date();
    const result = baseFilteredShowtimes.filter(st =>
      !statusFilter
      || (statusFilter === 'PLAYING_NOW' ? isShowtimePlayingNow(st, now) : st.status === statusFilter)
    );
    return sortShowtimes(result, sortKey);
  }, [baseFilteredShowtimes, statusFilter, sortKey]);

  // Số lượng theo trạng thái cho filter pills
  const pillCounts = useMemo(() => {
    const now = new Date();
    const counts = { '': baseFilteredShowtimes.length };
    baseFilteredShowtimes.forEach(st => {
      counts[st.status] = (counts[st.status] || 0) + 1;
      if (isShowtimePlayingNow(st, now)) counts.PLAYING_NOW = (counts.PLAYING_NOW || 0) + 1;
    });
    return counts;
  }, [baseFilteredShowtimes]);

  // Số suất nháp trong phạm vi điều phối (cho banner cảnh báo)
  const draftCount = useMemo(
    () => scopedShowtimes.filter(s => s.status === 'DRAFT').length,
    [scopedShowtimes],
  );

  // Phân trang trên danh sách phẳng đã lọc + sắp xếp (nhất quán cho grid & list)
  const paginatedShowtimes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShowtimes.slice(start, start + itemsPerPage);
  }, [filteredShowtimes, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredShowtimes.length / itemsPerPage) || 1);
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredShowtimes.length, itemsPerPage, currentPage]);

  const handleShowtimesPageChange = useCallback((page) => {
    setCurrentPage(page);
    scrollAdminMainToTop();
  }, [scrollAdminMainToTop]);

  // Grid: nhóm trang hiện tại theo trạng thái (thứ tự cố định)
  const pageStatusGroups = useMemo(() => {
    const groups = {};
    paginatedShowtimes.forEach(st => {
      (groups[st.status] ||= []).push(st);
    });
    const knownOrder = STATUS_ORDER.filter(s => groups[s]?.length > 0);
    const extras = Object.keys(groups).filter(s => !STATUS_ORDER.includes(s));
    return [...knownOrder, ...extras].map(status => ({ status, items: groups[status] }));
  }, [paginatedShowtimes]);

  // Toàn bộ items đã lọc theo trạng thái (mọi trang) — dùng cho chọn tất cả & tổng nhóm
  const statusFullGroups = useMemo(() => {
    const map = {};
    filteredShowtimes.forEach((st) => {
      (map[st.status] ||= []).push(st);
    });
    return map;
  }, [filteredShowtimes]);

  // Drawer: luôn đọc bản mới nhất từ danh sách để phản ánh trạng thái sau refetch
  const detailShowtime = useMemo(
    () => (detailUuid ? showtimes.find(s => s.uuid === detailUuid) || null : null),
    [detailUuid, showtimes],
  );
  const detailMovie = useMemo(
    () => (detailShowtime ? movies.find(m => m.uuid === detailShowtime.movieUuid) : null),
    [detailShowtime, movies],
  );

  const openDetail = useCallback((st) => setDetailUuid(st?.uuid || null), []);
  const closeDetail = useCallback(() => setDetailUuid(null), []);

  // Movie selection cho modal tạo suất
  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchMovieKeyword.toLowerCase()));
  const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);

  const conflictCount = useMemo(
    () => scopedShowtimes.reduce((acc, s) => (conflicts.has(s.uuid) ? acc + 1 : acc), 0),
    [scopedShowtimes, conflicts],
  );

  const selectedDayLabel = selectedDayKey ? formatDayKeyLabel(selectedDayKey, todayKey) : null;
  const scopeLabel = selectedRoom
    ? `${selectedCinema?.name} · ${selectedRoom.name}`
    : selectedCinema
      ? `${selectedCinema.name} · tất cả phòng`
      : null;

  // ========== RENDER HELPERS ==========

  const emptySubtitle = 'Không có suất chiếu nào khớp bộ lọc trong phạm vi này. Thử xóa bộ lọc hoặc thêm lịch chiếu mới.';

  /** Stepper điều hướng 3 bước */
  const renderStepper = () => (
    <nav className="st-stepper" aria-label="Quy trình quản lý lịch chiếu">
      <button
        type="button"
        className={`st-stepper__item ${step === 1 ? 'is-current' : 'is-done'}`}
        onClick={() => backToStep(1)}
        disabled={step === 1}
      >
        <span className="st-stepper__num">1</span>
        <span className="st-stepper__text">
          <span className="st-stepper__label">Chọn ngày</span>
          <span className="st-stepper__value">{selectedDayLabel || 'Lịch tháng'}</span>
        </span>
      </button>
      <ChevronRight className="st-stepper__sep" />
      <button
        type="button"
        className={`st-stepper__item ${step === 2 ? 'is-current' : step > 2 ? 'is-done' : 'is-pending'}`}
        onClick={() => backToStep(2)}
        disabled={step <= 2}
      >
        <span className="st-stepper__num">2</span>
        <span className="st-stepper__text">
          <span className="st-stepper__label">Rạp & phòng chiếu</span>
          <span className="st-stepper__value">{scopeLabel || 'Chưa chọn'}</span>
        </span>
      </button>
      <ChevronRight className="st-stepper__sep" />
      <div className={`st-stepper__item st-stepper__item--static ${step === 3 ? 'is-current' : 'is-pending'}`}>
        <span className="st-stepper__num">3</span>
        <span className="st-stepper__text">
          <span className="st-stepper__label">Điều phối suất chiếu</span>
          <span className="st-stepper__value">
            {step === 3 ? `${scopedShowtimes.length} suất trong phạm vi` : 'Theo trạng thái'}
          </span>
        </span>
      </div>
    </nav>
  );

  /** Bước 1 — Lịch tháng */
  const renderStep1 = () => (
    <ShowtimesCalendar
      monthAnchor={calendarMonth}
      onMonthChange={setCalendarMonth}
      dayInfoMap={dayInfoMap}
      todayKey={todayKey}
      selectedDayKey={selectedDayKey}
      onSelectDay={handleSelectDay}
    />
  );

  /** Bước 2 — Chọn rạp & phòng */
  const renderStep2 = () => (
    <>
      <div className="st-stephead">
        <div>
          <h2 className="st-stephead__title">Bước 2 · Chọn rạp & phòng chiếu</h2>
          <p className="st-stephead__desc">
            Đang xếp lịch cho <strong>{selectedDayLabel}</strong> — {dayShowtimes.length} suất trên toàn hệ thống.
            Chọn một phòng để tập trung điều phối, hoặc «Cả rạp» để xem tổng thể.
          </p>
        </div>
        <button type="button" className="st-btn-ghost" onClick={() => backToStep(1)}>
          <Calendar className="w-3.5 h-3.5" /> Đổi ngày
        </button>
      </div>
      <ShowtimesRoomPicker
        cinemas={cinemas}
        roomsByCinema={roomsByCinema}
        isLoadingRooms={isLoadingCinemas}
        dayShowtimes={dayShowtimes}
        conflicts={conflicts}
        onSelectRoom={handleSelectRoom}
      />
    </>
  );

  /** Grid View — nhóm theo trạng thái */
  const renderGridView = () => (
    <div className="st-groups view-fade-enter">
      {pageStatusGroups.map(({ status, items }) => {
        const isCollapsed = collapsedSections[status];
        const fullItems = statusFullGroups[status] || items;
        const totalInStatus = fullItems.length;
        const selectedInStatus = fullItems.reduce(
          (acc, s) => (selectedIds.has(s.uuid) ? acc + 1 : acc),
          0,
        );
        return (
          <div key={status} className="st-status-group">
            <SectionHeader
              status={status}
              count={totalInStatus}
              pageCount={items.length}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSection(status)}
              onSelectAll={() => toggleSelectAllInGroup(fullItems)}
              allSelected={fullItems.length > 0 && selectedInStatus === fullItems.length}
              selectedCount={selectedInStatus}
            />
            <div className={`section-collapsible ${isCollapsed ? 'collapsed' : 'expanded'}`}>
              <div className="st-card-grid st-stagger">
                {items.map((row, i) => (
                  <div key={row.uuid} className="st-rise" style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}>
                    <ShowtimeCard
                      row={row}
                      movies={movies}
                      isSelected={selectedIds.has(row.uuid)}
                      isConflict={conflicts.has(row.uuid)}
                      onToggleSelect={toggleSelection}
                      onStatusTransition={handleStatusTransition}
                      onOpenDetail={openDetail}
                      getPosterSrc={getPosterSrc}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      {pageStatusGroups.length === 0 && (
        <EmptyState icon={Calendar} title="Không có suất chiếu nào" subtitle={emptySubtitle} />
      )}
    </div>
  );

  /** List View — bảng phẳng */
  const renderListView = () => (
    <div className="st-list-panel view-fade-enter">
      <div className="list-header">
        <div>
          <input
            type="checkbox"
            className="st-checkbox"
            checked={filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid))}
            onChange={() => toggleSelectAllInGroup(filteredShowtimes)}
            aria-label="Chọn tất cả"
          />
        </div>
        <div>Phim</div>
        <div>Rạp / Phòng</div>
        <div>Thời gian</div>
        <div>Trạng thái</div>
        <div>Giá vé</div>
        <div>Thao tác</div>
      </div>
      {paginatedShowtimes.length === 0 ? (
        <EmptyState icon={AlignJustify} title="Không có suất chiếu" subtitle={emptySubtitle} />
      ) : (
        paginatedShowtimes.map((row, i) => {
          const trans = getValidTransitions(row.status);
          const isSelected = selectedIds.has(row.uuid);
          const movieObj = movies.find(m => m.uuid === row.movieUuid);
          const rawPoster = movieObj?.primaryMediaUrl || row.moviePosterUrl;
          const isConflict = conflicts.has(row.uuid);
          return (
            <div
              key={row.uuid}
              className={`list-row st-rise ${isSelected ? 'selected' : ''}`}
              style={{ animationDelay: `${Math.min(i * 30, 350)}ms` }}
            >
              <div>
                <input
                  type="checkbox"
                  className="st-checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(row.uuid)}
                  aria-label="Chọn suất chiếu"
                />
              </div>
              <button
                type="button"
                className="list-row__movie"
                onClick={() => openDetail(row)}
                title="Xem chi tiết suất chiếu"
              >
                <img
                  src={getPosterSrc(rawPoster, 80)}
                  data-original-url={rawPoster || ''}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="list-row__poster"
                  onError={handlePosterError}
                />
                <span className="list-row__title" title={row.movieTitle}>{row.movieTitle}</span>
                {isConflict && (
                  <span title="Trùng khung giờ trong phòng" className="inline-flex shrink-0">
                    <AlertTriangle className="list-row__warn" />
                  </span>
                )}
              </button>
              <div className="list-row__place">
                <span>{row.cinemaName}</span>
                <span className="list-row__room">{row.cinemaRoomName}</span>
              </div>
              <div className="list-row__time adm-tabular">
                <span className="list-row__date">
                  {row.startTime ? formatDateShort(new Date(row.startTime)) : '—'}
                </span>
                <span>
                  <Clock className="w-3 h-3" />
                  {formatTimeOnly(row.startTime)} → {formatTimeOnly(row.endTime)}
                </span>
              </div>
              <div><StatusBadge status={row.status} /></div>
              <div
                className="list-row__price adm-tabular"
                title={`Thường: ${formatPrice(row.basePrice)}\nVIP: ${formatPrice(row.vipPrice)}\nĐôi: ${formatPrice(row.couplePrice)}`}
              >
                {formatPrice(row.basePrice)}
              </div>
              <div className="list-row__actions">
                {trans.map(t => (
                  <button
                    key={t.target}
                    onClick={() => handleStatusTransition(row.uuid, t.target)}
                    className={`list-row__action ${getTransitionBtnClass(t.target)}`}
                  >
                    {t.label}
                  </button>
                ))}
                {trans.length === 0 && <span className="list-row__final">Cuối</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /** Bước 3 — Điều phối suất chiếu */
  const renderStep3 = () => (
    <>
      <ShowtimesDraftBanner
        draftCount={draftCount}
        onViewDrafts={() => {
          setStatusFilter('DRAFT');
          setCollapsedSections((prev) => ({ ...prev, DRAFT: false }));
          setCurrentPage(1);
        }}
      />

      {conflictCount > 0 && (
        <div className="st-conflict-banner">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Phát hiện <strong>{conflictCount}</strong> suất chiếu trùng khung giờ trong phạm vi này.
            Chuyển sang «Dòng thời gian» để xem vị trí xung đột.
          </span>
          {viewMode !== 'timeline' && (
            <button type="button" onClick={() => setViewMode('timeline')}>
              Xem dòng thời gian
            </button>
          )}
        </div>
      )}

      {/* ==================== TOOLBAR ==================== */}
      <div className="st-toolbar adm-toolbar">
        <div className="st-toolbar__row adm-toolbar__row">
          <div className="st-toolbar__search adm-toolbar__search">
            <Search className="st-toolbar__search-icon adm-toolbar__search-icon" />
            <input
              id="showtime-search"
              className="st-control st-control--search adm-input"
              placeholder="Tìm phim, phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

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

          <div className="st-segment st-toolbar__views">
            {VIEW_MODES.map(vm => (
              <button
                key={vm.key}
                type="button"
                onClick={() => setViewMode(vm.key)}
                title={vm.label}
                className={`st-segment__btn ${viewMode === vm.key ? 'is-active' : ''}`}
              >
                <vm.icon className="w-3.5 h-3.5" />
                <span className="st-segment__label">{vm.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="st-toolbar__row st-toolbar__row--filters">
          <FilterPills
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { id: '', label: 'Tất cả', count: pillCounts[''] || 0 },
              { id: 'OPEN_FOR_BOOKING', label: 'Đang mở bán', count: pillCounts.OPEN_FOR_BOOKING || 0 },
              { id: 'SCHEDULED', label: 'Sắp chiếu', count: pillCounts.SCHEDULED || 0 },
              { id: 'PLAYING_NOW', label: 'Đang chiếu', count: pillCounts.PLAYING_NOW || 0 },
              { id: 'SOLD_OUT', label: 'Hết ghế', count: pillCounts.SOLD_OUT || 0 },
              { id: 'DRAFT', label: 'Nháp', count: pillCounts.DRAFT || 0 },
              { id: 'FINISHED', label: 'Kết thúc', count: pillCounts.FINISHED || 0 },
              { id: 'CANCELLED', label: 'Đã hủy', count: pillCounts.CANCELLED || 0 },
            ]}
            ariaLabel="Lọc trạng thái suất chiếu"
          />
        </div>

        <div className="st-toolbar__row st-toolbar__row--actions">
          <div className="st-toolbar__summary">
            <span>
              Hiển thị <strong>{filteredShowtimes.length}</strong>
              {filteredShowtimes.length !== scopedShowtimes.length && (
                <> / {scopedShowtimes.length}</>
              )}{' '}
              suất
            </span>
            {hasActiveFilters && (
              <button type="button" className="st-toolbar__clear" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            )}
          </div>

          {viewMode === 'grid' && pageStatusGroups.length > 0 && (
            <div className="st-toolbar__group-actions">
              <button type="button" className="st-btn-ghost" onClick={expandAllStatusSections}>
                <ChevronsDown className="w-3.5 h-3.5" /> Mở tất cả
              </button>
              <button type="button" className="st-btn-ghost" onClick={collapseInactiveSections}>
                <ChevronsUp className="w-3.5 h-3.5" /> Thu gọn cũ
              </button>
            </div>
          )}

          {viewMode !== 'timeline' && (
            <button
              type="button"
              onClick={() => toggleSelectAllInGroup(filteredShowtimes)}
              className="st-btn-ghost"
            >
              {filteredShowtimes.length > 0 && filteredShowtimes.every(s => selectedIds.has(s.uuid))
                ? 'Bỏ chọn tất cả'
                : 'Chọn tất cả'}
            </button>
          )}
        </div>
      </div>

      {/* ==================== CONTENT AREA ==================== */}
      {viewMode === 'timeline' && (
        <ShowtimesTimeline
          showtimes={filteredShowtimes}
          isToday={selectedDayKey === todayKey}
          conflicts={conflicts}
          onSelect={openDetail}
          selectedUuid={detailUuid}
        />
      )}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'list' && renderListView()}

      {viewMode !== 'timeline' && filteredShowtimes.length > 0 && (
        <div className="mt-2">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredShowtimes.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handleShowtimesPageChange}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[12, 24, 48, 96]}
          />
        </div>
      )}
    </>
  );

  // ========== MAIN RENDER ==========
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trung tâm vận hành rạp"
        title="Quản lý lịch chiếu phim"
        description="Quy trình 3 bước: chọn ngày trên lịch → chọn rạp & phòng → điều phối suất chiếu theo trạng thái."
        variant="display"
        secondaryActions={[
          {
            label: 'Hủy suất nháp (DRAFT)',
            onClick: handleCleanupDrafts,
            icon: <Trash2 className="w-4 h-4" />,
          },
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

      {renderStepper()}

      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <div className={`st-step ${stepAnim === 'exit' ? 'st-step--exit' : 'st-step--enter'}`}>
          {step === 1 && renderStep1()}
          {step === 2 && (selectedDayKey ? renderStep2() : renderStep1())}
          {step === 3 && (selectedDayKey ? renderStep3() : renderStep1())}
        </div>
      )}

      {/* ==================== BULK ACTION BAR (floating) ==================== */}
      {step === 3 && selectedIds.size > 0 && (
        <div className="st-bulkbar">
          <span className="st-bulkbar__count">
            <strong>{selectedIds.size}</strong> suất đã chọn
          </span>
          <div className="st-bulkbar__actions">
            <button
              type="button"
              onClick={() => handleBulkAction('SCHEDULED')}
              className={`st-bulkbar__btn ${getTransitionBtnClass('SCHEDULED')}`}
            >
              <CalendarClock className="w-3.5 h-3.5" /> Sắp chiếu
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('OPEN_FOR_BOOKING')}
              className={`st-bulkbar__btn ${getTransitionBtnClass('OPEN_FOR_BOOKING')}`}
            >
              <Ticket className="w-3.5 h-3.5" /> Mở bán
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('FINISHED')}
              className={`st-bulkbar__btn ${getTransitionBtnClass('FINISHED')}`}
            >
              <Eye className="w-3.5 h-3.5" /> Kết thúc
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('CANCELLED')}
              className={`st-bulkbar__btn ${getTransitionBtnClass('CANCELLED')}`}
            >
              <XCircle className="w-3.5 h-3.5" /> Hủy hàng loạt
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="st-bulkbar__dismiss"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ==================== DETAIL DRAWER ==================== */}
      {detailShowtime && (
        <ShowtimeDetailDrawer
          showtime={detailShowtime}
          movie={detailMovie}
          isConflict={conflicts.has(detailShowtime.uuid)}
          onClose={closeDetail}
          onStatusTransition={handleStatusTransition}
          getPosterSrc={getPosterSrc}
        />
      )}

      {/* ==================== MODALS ==================== */}
      {isAutoModalOpen && (
        <Suspense fallback={null}>
          <ShowtimesAutoModal
            onClose={() => { setIsAutoModalOpen(false); setAutoStep(0); }}
            autoStep={autoStep}
            setAutoStep={setAutoStep}
            autoFormData={autoFormData}
            setAutoFormData={setAutoFormData}
            systemConfig={systemConfig}
            cinemas={cinemas}
            rooms={autoRooms}
            isLoadingRooms={isLoadingAutoRooms}
            onCinemaChange={handleAutoCinemaChange}
            movies={movies}
            isLoadingMovies={isLoadingMovies}
            handleAutoAnalyze={handleAutoAnalyze}
            previewGenerated={previewGenerated}
            selectedPreviewUuids={selectedPreviewUuids}
            setSelectedPreviewUuids={setSelectedPreviewUuids}
            togglePreviewSelection={togglePreviewSelection}
            handleSaveAuto={handleSaveAuto}
            isAutoLoading={isAutoLoading}
            isSavingAuto={isSavingAuto}
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
            showtimes={showtimes}
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
