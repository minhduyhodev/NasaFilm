import React, { useState, useEffect, useMemo } from 'react';
import {
  Film, Search, Plus, Calendar, Tv, X, Play,
  Ban, CheckCircle, MapPin, CreditCard, LayoutGrid,
  AlignJustify, Clock
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';

const getOccupancy = (uuid) => {
  if (!uuid) return 50;
  let sum = 0;
  for (let i = 0; i < uuid.length; i++) {
    sum += uuid.charCodeAt(i);
  }
  return (sum % 88) + 10;
};

const STATUS_CONFIG = {
  DRAFT: { label: 'Nháp', dotClass: 'bg-zinc-400', pillClass: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400', borderColor: 'border-l-zinc-500' },
  SCHEDULED: { label: 'Đã Lên Lịch', dotClass: 'bg-blue-400', pillClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400', borderColor: 'border-l-blue-500' },
  OPEN_FOR_BOOKING: { label: 'Đang Mở Bán', dotClass: 'bg-emerald-400 animate-pulse', pillClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', borderColor: 'border-l-emerald-500' },
  SOLD_OUT: { label: 'Hết Ghế', dotClass: 'bg-amber-400', pillClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400', borderColor: 'border-l-amber-500' },
  CANCELLED: { label: 'Đã Hủy', dotClass: 'bg-rose-400', pillClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400', borderColor: 'border-l-rose-500' },
  FINISHED: { label: 'Kết Thúc', dotClass: 'bg-gray-500', pillClass: 'bg-zinc-700/20 border-zinc-700/30 text-gray-500', borderColor: 'border-l-gray-600' },
};

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cinemaFilter, setCinemaFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [searchMovieKeyword, setSearchMovieKeyword] = useState('');
  const [formData, setFormData] = useState({
    movieUuid: '', cinemaUuid: '', cinemaRoomUuid: '', startTime: '', basePrice: 85000,
  });

  useEffect(() => {
    fetchShowtimes();
    fetchMovies();
    fetchCinemas();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, cinemaFilter]);

  const fetchShowtimes = async () => {
    setIsLoading(true);
    try {
      const data = await showtimeService.getAdminShowtimes();
      setShowtimes(data || []);
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

  const handleCinemaChange = async (cinemaUuid) => {
    setFormData(prev => ({ ...prev, cinemaUuid, cinemaRoomUuid: '' }));
    if (!cinemaUuid) {
      setRooms([]);
      return;
    }
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data.filter(r => r.status === 'ACTIVE')); // Only active rooms can host showtimes
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleAddClick = () => {
    setFormData({
      movieUuid: movies[0]?.uuid || '',
      cinemaUuid: cinemas[0]?.uuid || '',
      cinemaRoomUuid: '',
      startTime: '',
      basePrice: 85000,
    });
    if (cinemas[0]?.uuid) {
      handleCinemaChange(cinemas[0].uuid);
    }
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
      // Convert startTime string from local timezone format to ISO String (OffsetDateTime compliant)
      const isoStartTime = new Date(formData.startTime).toISOString();
      await showtimeService.createShowtime({
        movieUuid: formData.movieUuid,
        cinemaRoomUuid: formData.cinemaRoomUuid,
        startTime: isoStartTime,
        basePrice: parseFloat(formData.basePrice),
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
      notificationService.success('Cập nhật trạng thái suất chiếu thành công!');
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    return new Date(dateTimeStr).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeOnly = (s) => {
    if (!s) return '';
    return new Date(s).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateOnly = (s) => {
    if (!s) return '';
    return new Date(s).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Nháp
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Đã Lên Lịch
          </span>
        );
      case 'OPEN_FOR_BOOKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Đang Mở Bán
          </span>
        );
      case 'SOLD_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Hết Ghế
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Đã Hủy
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-700/20 border border-zinc-700/30 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Kết Thúc
          </span>
        );
      default:
        return null;
    }
  };

  const getValidTransitions = (status) => {
    switch (status) {
      case 'DRAFT':
        return [{ target: 'SCHEDULED', label: 'Xuất Bản' }];
      case 'SCHEDULED':
        return [
          { target: 'OPEN_FOR_BOOKING', label: 'Mở Bán Vé' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      case 'OPEN_FOR_BOOKING':
        return [
          { target: 'SOLD_OUT', label: 'Hết Vé' },
          { target: 'FINISHED', label: 'Kết Thúc' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      case 'SOLD_OUT':
        return [
          { target: 'OPEN_FOR_BOOKING', label: 'Mở Lại' },
          { target: 'FINISHED', label: 'Kết Thúc' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      default:
        return []; // Cancelled and Finished are final states
    }
  };

  const getOccColor = (p) => p >= 86 ? 'bg-rose-500' : p >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
  const getOccTextColor = (p) => p >= 86 ? 'text-rose-400' : p >= 60 ? 'text-amber-400' : 'text-emerald-400';
  const topAccent = (status) => {
    if (status === 'OPEN_FOR_BOOKING') return 'bg-emerald-500';
    if (status === 'SOLD_OUT') return 'bg-amber-500';
    if (status === 'CANCELLED') return 'bg-rose-500';
    if (status === 'SCHEDULED') return 'bg-blue-500';
    return 'bg-zinc-600';
  };

  const today = new Date().toDateString();

  const stats = useMemo(() => {
    const active = showtimes.filter(s => s.status === 'OPEN_FOR_BOOKING' || s.status === 'SCHEDULED').length;
    const soldOut = showtimes.filter(s => s.status === 'SOLD_OUT').length;
    const cancelled = showtimes.filter(s => s.status === 'CANCELLED').length;
    const todayRevenue = showtimes
      .filter(s => s.startTime && new Date(s.startTime).toDateString() === today)
      .reduce((sum, s) => sum + (s.basePrice || 0), 0);
    return { total: showtimes.length, active, soldOut, cancelled, todayRevenue };
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => showtimes.filter(st => {
    const ms = (st.movieTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.cinemaRoomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.cinemaName?.toLowerCase().includes(searchTerm.toLowerCase()));
    return ms && (!statusFilter || st.status === statusFilter) && (!cinemaFilter || st.cinemaName === cinemaFilter);
  }), [showtimes, searchTerm, statusFilter, cinemaFilter]);

  const paginatedShowtimes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShowtimes.slice(start, start + itemsPerPage);
  }, [filteredShowtimes, currentPage, itemsPerPage]);

  const timelineGroups = useMemo(() => {
    const groups = {};
    filteredShowtimes.forEach(st => {
      const dk = st.startTime ? new Date(st.startTime).toDateString() : 'Unknown';
      if (!groups[dk]) groups[dk] = [];
      groups[dk].push(st);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
    return Object.keys(groups).sort((a, b) => new Date(a) - new Date(b)).map(k => ({ dateKey: k, items: groups[k] }));
  }, [filteredShowtimes]);

  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchMovieKeyword.toLowerCase()));
  const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);
  const uniqueCinemaNames = useMemo(() => Array.from(new Set(showtimes.map(s => s.cinemaName).filter(Boolean))).sort(), [showtimes]);

  const getTransitionBtnClass = (t) => {
    if (t === 'CANCELLED') return 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20';
    if (t === 'OPEN_FOR_BOOKING') return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
    return 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20';
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 text-left">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Trung Tâm Vận Hành Rạp</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Quản Lý Lịch Chiếu Phim</h1>
          <p className="text-xs text-gray-400 mt-1">Điều phối trạng thái, khởi tạo và phân bổ khung giờ chiếu phim trên toàn hệ thống rạp.</p>
        </div>
      </div>

      {/* KPI Row - 5 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Suất Chiếu</span>
            <h3 className="text-2xl font-black text-white">{stats.total}</h3>
          </div>
          <div className="p-2.5 rounded-lg border bg-white/5 border-white/10"><Film className="w-5 h-5 text-white/60" /></div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Đang Hoạt Động</span>
            <h3 className="text-2xl font-black text-emerald-400">{stats.active}</h3>
          </div>
          <div className="p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20"><Play className="w-5 h-5 text-emerald-400" /></div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Hết Ghế</span>
            <h3 className="text-2xl font-black text-amber-400">{stats.soldOut}</h3>
          </div>
          <div className="p-2.5 rounded-lg border bg-amber-500/10 border-amber-500/20"><CheckCircle className="w-5 h-5 text-amber-400" /></div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Đã Hủy</span>
            <h3 className="text-2xl font-black text-rose-400">{stats.cancelled}</h3>
          </div>
          <div className="p-2.5 rounded-lg border bg-rose-500/10 border-rose-500/20"><Ban className="w-5 h-5 text-rose-400" /></div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Doanh Thu Hôm Nay</span>
            <h3 className="text-base font-black text-purple-400 font-mono">{stats.todayRevenue.toLocaleString('vi-VN')} đ</h3>
          </div>
          <div className="p-2.5 rounded-lg border bg-purple-500/10 border-purple-500/20"><CreditCard className="w-5 h-5 text-purple-400" /></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
            placeholder="Tìm phim, rạp, phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SCHEDULED">Đã Lên Lịch</option>
          <option value="OPEN_FOR_BOOKING">Đang Mở Bán</option>
          <option value="SOLD_OUT">Hết Ghế</option>
          <option value="CANCELLED">Đã Hủy</option>
          <option value="FINISHED">Kết Thúc</option>
        </select>
        <select className="rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer" value={cinemaFilter} onChange={(e) => setCinemaFilter(e.target.value)}>
          <option value="">Tất cả rạp</option>
          {uniqueCinemaNames.map(n => (<option key={n} value={n}>{n}</option>))}
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-[#0F1322] border border-[#1A2238] rounded-lg p-1">
          <button onClick={() => setViewMode('cards')} title="Thẻ bài" className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('timeline')} title="Dòng thời gian" className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'timeline' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}><AlignJustify className="w-4 h-4" /></button>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold transition shadow-md cursor-pointer shrink-0" onClick={handleAddClick}>
          <Plus className="w-4 h-4" /> Thêm Lịch Chiếu
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Đang tải lịch chiếu...</p>
        </div>
      ) : filteredShowtimes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl">
          <Tv className="w-12 h-12 text-zinc-600" />
          <p className="font-bold text-white uppercase tracking-wider text-xs">Không tìm thấy suất chiếu nào</p>
          <p className="text-xs text-gray-500">Hãy thử điều chỉnh từ khóa hoặc bộ lọc.</p>
        </div>
      ) : viewMode === 'cards' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
            {paginatedShowtimes.map((row) => {
              const mm = movies.find(m => m.uuid === row.movieUuid);
              const poster = mm?.primaryMediaUrl || FALLBACK_POSTER;
              const occ = getOccupancy(row.uuid);
              const trans = getValidTransitions(row.status);
              return (
                <div key={row.uuid} className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 hover:border-gray-600 transition-all duration-200 relative overflow-hidden group flex items-start gap-3">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${topAccent(row.status)}`} />
                  <div className="shrink-0 w-20">
                    <div className="w-20 h-28 rounded-lg overflow-hidden shadow-lg bg-gradient-to-b from-[#1A2238] to-[#0B0F19] border border-[#1A2238]">
                      <img src={poster} alt={row.movieTitle} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div>{getStatusBadge(row.status)}</div>
                    <p className="text-sm font-black text-white uppercase leading-snug line-clamp-2">{row.movieTitle}</p>
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="text-xs truncate">{row.cinemaName}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold w-fit">
                      <Tv className="w-3 h-3" />{row.cinemaRoomName}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#0F1322]/80 rounded-lg p-2 border border-[#1A2238]">
                        <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-0.5">Bắt Đầu</p>
                        <p className="text-xs font-black text-white">{formatTimeOnly(row.startTime)}</p>
                        <p className="text-[10px] text-gray-500">{row.startTime ? new Date(row.startTime).toLocaleDateString('vi-VN') : ''}</p>
                      </div>
                      <div className="bg-[#0F1322]/80 rounded-lg p-2 border border-[#1A2238]">
                        <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-0.5">Kết Thúc</p>
                        <p className="text-xs font-black text-white">{formatTimeOnly(row.endTime)}</p>
                        <p className="text-[10px] text-gray-500">{row.endTime ? new Date(row.endTime).toLocaleDateString('vi-VN') : ''}</p>
                      </div>
                    </div>
                    <p className="text-amber-400 font-mono text-base font-black">{row.basePrice?.toLocaleString('vi-VN')} đ</p>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Lấp đầy</span>
                        <span className={`text-[10px] font-black ${getOccTextColor(occ)}`}>{occ}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#1A2238] overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${getOccColor(occ)}`} style={{ width: `${occ}%` }} />
                      </div>
                    </div>
                    {trans.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {trans.map(t => (
                          <button key={t.target} onClick={() => handleStatusTransition(row.uuid, t.target)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${getTransitionBtnClass(t.target)}`}>{t.label}</button>
                        ))}
                      </div>
                    )}
                    {trans.length === 0 && <p className="text-xs text-gray-600 italic pt-1">Trạng thái cuối</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {filteredShowtimes.length > 0 && (
            <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl overflow-hidden">
              <Pagination currentPage={currentPage} totalItems={filteredShowtimes.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {timelineGroups.map(({ dateKey, items }) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  {dateKey === today ? '📅 Hôm Nay — ' : ''}{formatDateOnly(items[0]?.startTime)}
                </h3>
                <div className="flex-1 h-px bg-[#1A2238]" />
                <span className="text-xs text-gray-500 font-semibold">{items.length} suất</span>
              </div>
              <div className="space-y-2 ml-3">
                {items.map(row => {
                  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG['DRAFT'];
                  const occ = getOccupancy(row.uuid);
                  const trans = getValidTransitions(row.status);
                  return (
                    <div key={row.uuid} className={`bg-[#0B0F19]/70 border border-[#1A2238] border-l-2 ${cfg.borderColor} rounded-lg px-4 py-3 hover:border-gray-600 transition-all duration-200 flex flex-wrap items-center gap-4`}>
                      <div className="flex items-center gap-1.5 text-white font-black text-sm min-w-[90px]">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {formatTimeOnly(row.startTime)}
                        <span className="text-gray-500 text-xs">→</span>
                        <span className="text-gray-400 font-semibold text-xs">{formatTimeOnly(row.endTime)}</span>
                      </div>
                      <div className="shrink-0">{getStatusBadge(row.status)}</div>
                      <p className="flex-1 text-white font-bold text-sm min-w-[120px] uppercase">{row.movieTitle}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" /><span>{row.cinemaName}</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold">
                          <Tv className="w-2.5 h-2.5" />{row.cinemaRoomName}
                        </span>
                      </div>
                      <span className="text-amber-400 font-mono font-black text-sm">{row.basePrice?.toLocaleString('vi-VN')} đ</span>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 rounded-full bg-[#1A2238] overflow-hidden min-w-[60px]">
                          <div className={`h-full rounded-full ${getOccColor(occ)}`} style={{ width: `${occ}%` }} />
                        </div>
                        <span className={`text-[10px] font-black ${getOccTextColor(occ)}`}>{occ}%</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {trans.map(t => (
                          <button key={t.target} onClick={() => handleStatusTransition(row.uuid, t.target)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${getTransitionBtnClass(t.target)}`}>{t.label}</button>
                        ))}
                        {trans.length === 0 && <span className="text-xs text-gray-600 italic">Trạng thái cuối</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Showtime */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1A2238] shadow-2xl p-6 text-left relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-white rounded bg-white/5 cursor-pointer transition-colors" 
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Thêm Suất Chiếu Mới</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Custom Movie Selection with Poster Preview */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-400">Chọn Phim *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}</span>
                    <span className="text-[10px] text-gray-400">▼</span>
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#090D1A] border border-[#1A2238] rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      <div className="p-2 border-b border-[#1A2238] flex items-center gap-2 mb-1">
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
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition text-left ${formData.movieUuid === movie.uuid ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'border border-transparent'}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <img
                              src={movie.primaryMediaUrl || FALLBACK_POSTER}
                              alt={movie.title}
                              className="w-8 h-10 object-cover rounded shadow-sm shrink-0 border border-[#1A2238]"
                              onError={(e) => { e.target.src = FALLBACK_POSTER; }}
                            />
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
                  <div className="flex items-center gap-3.5 p-3 bg-[#0F1322]/50 rounded-lg border border-[#1A2238] mt-2 text-left">
                    <img
                      src={selectedMovie.primaryMediaUrl || FALLBACK_POSTER}
                      alt={selectedMovie.title}
                      className="w-10 h-14 object-cover rounded border border-[#1A2238] shrink-0"
                      onError={(e) => { e.target.src = FALLBACK_POSTER; }}
                    />
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
                  className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
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
                  className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
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
                {/* Datetime local Picker */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Thời Gian Bắt Đầu *</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>

                {/* Base Ticket Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Cơ Bản (VNĐ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold cursor-pointer transition-colors"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowtimesPage;

