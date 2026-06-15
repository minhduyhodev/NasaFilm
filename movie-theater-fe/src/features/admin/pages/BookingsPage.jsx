import React, { useState, useEffect } from 'react';
import {
  Search, DollarSign, CheckCircle2, XCircle, Ticket, Calendar, User, Film,
  Download, MapPin, Clock, Loader2, AlertCircle, QrCode, Sparkles,
  Filter, X
} from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import Pagination from '../../../shared/components/Pagination';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [moviesMap, setMoviesMap] = useState({});
  const [cinemasList, setCinemasList] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCinema, setSelectedCinema] = useState('');
  const [selectedShowtime, setSelectedShowtime] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchAuxiliaryData = async () => {
    try {
      const moviesData = await movieService.getMovies({ size: 100 });
      const moviesList = moviesData?.content || [];
      const moviesMapping = {};
      moviesList.forEach(m => {
        if (m.title) moviesMapping[m.title.toLowerCase().trim()] = m.primaryMediaUrl;
      });
      setMoviesMap(moviesMapping);
      const cinemasData = await movieService.getCinemas();
      setCinemasList(cinemasData || []);
      const showtimesData = await showtimeService.getAdminShowtimes();
      setShowtimes(showtimesData || []);
    } catch (err) {
      console.error('Failed to fetch auxiliary data:', err);
    }
  };

  const fetchBookings = async (keyword = '') => {
    setIsLoading(true);
    try {
      const data = await bookingService.getAdminBookings(keyword);
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      notificationService.error('Không thể tải danh sách đơn đặt vé từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAuxiliaryData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchBookings(searchTerm); }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, selectedCinema, selectedShowtime]);

  const handleExport = () => notificationService.info('Tính năng xuất báo cáo đang được chuẩn bị.');

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCinema('');
    setSelectedShowtime('');
    setStatusFilter('ALL');
    setSearchTerm('');
  };

  const handleCancelBookingDirect = async (row) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy đơn đặt vé "${row.bookingUuid.substring(0, 8).toUpperCase()}" của khách hàng "${row.customerName}" không?`)) {
      try {
        await bookingService.cancelBooking(row.bookingUuid);
        notificationService.success(`Đã hủy thành công đơn hàng ${row.bookingUuid.substring(0, 8).toUpperCase()}`);
        fetchBookings(searchTerm);
      } catch (err) {
        console.error('Failed to cancel booking:', err);
        notificationService.error(err.message || 'Hủy đơn hàng thất bại');
      }
    }
  };

  const handleCheckInDirect = async (row) => {
    const code = window.prompt(`Nhập mã vé cần check-in cho đơn hàng ${row.bookingUuid.substring(0, 8).toUpperCase()}:`);
    if (code && code.trim()) {
      try {
        await bookingService.checkInTicket(code.trim());
        notificationService.success(`Check-in thành công vé: ${code.trim()}`);
        fetchBookings(searchTerm);
      } catch (err) {
        console.error('Failed to check-in ticket:', err);
        notificationService.error(err.message || 'Check-in vé thất bại');
      }
    }
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
    if (price === undefined || price === null) return '0 d';
    return `${price.toLocaleString('vi-VN')} d`;
  };

  const getBookingShowtime = (booking) => {
    if (!booking.createdAt) return null;
    const bookingDate = new Date(booking.createdAt).toDateString();
    return showtimes.find(st => {
      const matchMovie = st.movieTitle?.toLowerCase().trim() === booking.movieTitle?.toLowerCase().trim();
      const matchRoom = st.cinemaRoomName?.toLowerCase().trim() === booking.cinemaRoomName?.toLowerCase().trim();
      if (!matchMovie || !matchRoom) return false;
      return new Date(st.startTime).toDateString() === bookingDate;
    });
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

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status?.toUpperCase() !== statusFilter) return false;
    if (selectedCinema && !b.cinemaRoomName?.toLowerCase().includes(selectedCinema.toLowerCase())) return false;
    if (startDate) {
      const bDate = new Date(b.createdAt); bDate.setHours(0, 0, 0, 0);
      const sDate = new Date(startDate); sDate.setHours(0, 0, 0, 0);
      if (bDate < sDate) return false;
    }
    if (endDate) {
      const bDate = new Date(b.createdAt); bDate.setHours(0, 0, 0, 0);
      const eDate = new Date(endDate); eDate.setHours(0, 0, 0, 0);
      if (bDate > eDate) return false;
    }
    if (selectedShowtime) {
      const stTime = getBookingShowtimeTime(b);
      if (stTime !== selectedShowtime) return false;
    }
    return true;
  });

  const stats = React.useMemo(() => {
    const baseListForStats = bookings.filter((b) => {
      if (selectedCinema && !b.cinemaRoomName?.toLowerCase().includes(selectedCinema.toLowerCase())) return false;
      if (startDate) {
        const bDate = new Date(b.createdAt); bDate.setHours(0, 0, 0, 0);
        const sDate = new Date(startDate); sDate.setHours(0, 0, 0, 0);
        if (bDate < sDate) return false;
      }
      if (endDate) {
        const bDate = new Date(b.createdAt); bDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate); eDate.setHours(0, 0, 0, 0);
        if (bDate > eDate) return false;
      }
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
  }, [bookings, selectedCinema, startDate, endDate, selectedShowtime, showtimes]);

  const paginatedBookings = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const hasActiveFilters = startDate || endDate || selectedCinema || selectedShowtime || statusFilter !== 'ALL' || searchTerm;

  const getStatusConfig = (status) => {
    const s = status?.toUpperCase();
    if (s === 'CONFIRMED') return {
      label: 'Thành công',
      accentBg: 'bg-emerald-500',
      badgeCls: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400 animate-pulse',
    };
    if (s === 'CANCELLED') return {
      label: 'Đã hủy',
      accentBg: 'bg-rose-500',
      badgeCls: 'bg-rose-500/15 border border-rose-500/30 text-rose-400',
      dot: 'bg-rose-400',
    };
    return {
      label: 'Chờ xử lý',
      accentBg: 'bg-amber-500',
      badgeCls: 'bg-amber-500/15 border border-amber-500/30 text-amber-400',
      dot: 'bg-amber-400',
    };
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Trung Tâm Vận Hành Đơn Hàng</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Đơn Hàng &amp; Doanh Thu</h1>
          <p className="text-sm text-gray-400 mt-2">Theo dõi, tra cứu và đối soát trạng thái giao dịch đặt vé của khách hàng trên toàn bộ chi nhánh.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white border border-[#1A2238] rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer">
              <X className="w-3.5 h-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-black text-black transition-all duration-200 shadow-lg shadow-yellow-500/20 cursor-pointer shrink-0">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-amber-500/15 to-yellow-600/10 border border-amber-500/25 rounded-2xl p-5 flex items-center justify-between hover:border-amber-500/50 transition-all duration-200 group shadow-lg shadow-amber-500/5">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/80 block">Doanh Thu</span>
            <h3 className="text-3xl font-black text-amber-400 font-mono leading-none tracking-tight">{formatPrice(stats.totalRevenue)}</h3>
            <span className="text-[10px] text-amber-400/50">Đơn thành công</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform duration-200">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between hover:border-emerald-500/30 transition-all duration-200 group">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Thành Công</span>
            <h3 className="text-3xl font-black text-emerald-400 leading-none">{stats.confirmedCount}</h3>
            <span className="text-[10px] text-gray-600">đơn đặt vé</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between hover:border-rose-500/30 transition-all duration-200 group">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Đã Hủy</span>
            <h3 className="text-3xl font-black text-rose-400 leading-none">{stats.cancelledCount}</h3>
            <span className="text-[10px] text-gray-600">đơn đã hủy</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 group-hover:scale-110 transition-transform duration-200">
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between hover:border-gray-600 transition-all duration-200 group">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Tổng Đơn Hàng</span>
            <h3 className="text-3xl font-black text-white leading-none">{stats.totalCount}</h3>
            <span className="text-[10px] text-gray-600">tổng giao dịch</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-200">
            <Ticket className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between hover:border-blue-500/30 transition-all duration-200 group">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">Giá Trị AOV</span>
            <h3 className="text-3xl font-black text-blue-400 font-mono leading-none">{formatPrice(stats.avgOrderValue)}</h3>
            <span className="text-[10px] text-gray-600">trung bình/đơn</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-200">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 space-y-3 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 pointer-events-none" />
            <input className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm theo tên khách, email, phim..." />
          </div>
          <div className="flex items-center gap-1.5">
            {[{ key: 'ALL', label: 'Tất cả' }, { key: 'CONFIRMED', label: 'Thành công' }, { key: 'CANCELLED', label: 'Đã hủy' }].map(({ key, label }) => (
              <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer border ${statusFilter === key ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-[#0F1322] border-[#1A2238] text-gray-400 hover:text-white hover:border-gray-600'}`}>{label}</button>
            ))}
          </div>
          <div className="sm:ml-auto">
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-xs font-bold text-gray-400 hover:text-yellow-400 hover:border-yellow-500/30 transition-all duration-200 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Xuất dữ liệu
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Từ ngày mua</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Đến ngày mua</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Rạp chiếu / Chi nhánh</label>
            <select value={selectedCinema} onChange={(e) => setSelectedCinema(e.target.value)} className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer">
              <option value="">Tất cả rạp</option>
              {cinemasList.map(c => (<option key={c.uuid} value={c.name}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Khung giờ suất chiếu</label>
            <select value={selectedShowtime} onChange={(e) => setSelectedShowtime(e.target.value)} className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer">
              <option value="">Tất cả khung giờ</option>
              {uniqueShowtimeOptions.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-0.5">
            <Filter className="w-3 h-3 text-red-400" />
            <span className="text-[11px] text-gray-500">Bộ lọc đang hoạt động — <button onClick={handleClearFilters} className="text-red-400 hover:text-red-300 font-bold cursor-pointer transition-colors">Xóa bộ lọc</button></span>
          </div>
        )}
      </div>

      {/* BOOKING CARDS LIST */}
      <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1A2238] bg-white/[0.015]">
          <span className="text-sm font-bold text-white">Danh sách đơn hàng <span className="ml-2 text-xs font-normal text-gray-500">({filteredBookings.length} đơn)</span></span>
          {!isLoading && filteredBookings.length > 0 && (<span className="text-[10px] text-gray-600 font-mono">Trang {currentPage} / {Math.ceil(filteredBookings.length / itemsPerPage)}</span>)}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[320px]">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-[#1A2238]" />
              <Loader2 className="w-14 h-14 text-red-500 animate-spin absolute inset-0" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu đơn đặt vé...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[320px]">
            <Ticket className="w-16 h-16 text-zinc-700" />
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">Không tìm thấy đơn đặt vé nào</p>
              <p className="text-xs text-gray-500">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
            </div>
            {hasActiveFilters && (<button onClick={handleClearFilters} className="px-4 py-2 rounded-lg bg-red-600/10 border border-red-600/20 text-red-400 text-xs font-bold cursor-pointer hover:bg-red-600/20 transition-all">Xóa bộ lọc</button>)}
          </div>
        ) : (
          <div className="divide-y divide-[#1A2238]/50">
            {paginatedBookings.map((row) => {
              const statusCfg = getStatusConfig(row.status);
              const posterUrl = moviesMap[row.movieTitle?.toLowerCase().trim()];
              const seatList = row.seats ? row.seats.split(',').map(s => s.trim()).filter(Boolean) : [];
              const st = getBookingShowtime(row);
              const showtimeStr = st && st.startTime
                ? `${new Date(st.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} | ${new Date(st.startTime).toLocaleDateString('vi-VN')}`
                : null;
              const isConfirmed = row.status?.toUpperCase() === 'CONFIRMED';

              return (
                <div key={row.bookingUuid} className="flex items-stretch min-h-[120px] hover:bg-white/[0.012] transition-colors duration-150">
                  {/* LEFT ACCENT BAR */}
                  <div className={`w-1 self-stretch shrink-0 ${statusCfg.accentBg} opacity-80`} />

                  {/* SECTION 1: CUSTOMER */}
                  <div className="w-52 shrink-0 px-5 py-4 border-r border-[#1A2238]/50 flex flex-col justify-center gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800 shrink-0 flex items-center justify-center">
                        {row.customerAvatarUrl ? (
                          <img src={normalizeAvatarUrl(row.customerAvatarUrl)} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white leading-snug break-words">{row.customerName || 'N/A'}</div>
                        <div className="text-xs text-gray-400 break-words mt-0.5">{row.customerEmail || 'N/A'}</div>
                        <div className="text-[10px] text-gray-600 font-mono uppercase mt-1 tracking-wider">#{row.bookingUuid ? row.bookingUuid.substring(0, 8).toUpperCase() : 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: MOVIE + SHOWTIME */}
                  <div className="flex-1 px-5 py-4 border-r border-[#1A2238]/50 flex items-center gap-4 min-w-0">
                    <div className="w-12 h-16 rounded-lg overflow-hidden border border-[#1A2238] shadow-md shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      {posterUrl ? (<img src={posterUrl} alt="Poster" className="w-full h-full object-cover" />) : (<Film className="w-5 h-5 text-gray-600" />)}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="text-sm font-black text-white leading-snug break-words uppercase tracking-wide">{row.movieTitle || 'N/A'}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3 shrink-0 text-gray-500" />
                        <span className="break-words">{row.cinemaRoomName || 'N/A'}</span>
                      </div>
                      {showtimeStr ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3 shrink-0 text-blue-400" />
                          <span className="font-mono text-blue-400/80">{showtimeStr}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>Chưa ghép suất chiếu</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="font-mono text-[11px]">{formatDateTime(row.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: SEATS */}
                  <div className="w-44 shrink-0 px-5 py-4 border-r border-[#1A2238]/50 flex flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Ghế đã đặt</p>
                    {seatList.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {seatList.map((seat) => (
                            <span key={seat} className="px-1.5 py-0.5 rounded bg-[#1A2238] border border-[#252E44] text-[10px] font-mono text-gray-300">{seat}</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">{seatList.length} ghế</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                    {row.combos && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate" title={row.combos}>Combo: {row.combos}</span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: PAYMENT */}
                  <div className="w-36 shrink-0 px-5 py-4 border-r border-[#1A2238]/50 flex flex-col justify-center gap-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Tổng thanh toán</p>
                    <p className="text-xl font-black text-amber-400 font-mono leading-tight">{formatPrice(row.totalPrice)}</p>
                    {row.paymentMethod && (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-[#1A2238] border border-[#252E44] text-[10px] font-bold text-gray-400 uppercase tracking-wider">{row.paymentMethod}</span>
                    )}
                  </div>

                  {/* SECTION 5: STATUS + ACTIONS */}
                  <div className="w-40 shrink-0 px-5 py-4 flex flex-col justify-center items-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusCfg.badgeCls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        onClick={() => handleCheckInDirect(row)}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-all duration-150 cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" />
                        Check-in
                      </button>
                      {isConfirmed && (
                        <button
                          onClick={() => handleCancelBookingDirect(row)}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-all duration-150 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          Hủy đơn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Section */}
      {filteredBookings.length > 0 && (
        <div className="rounded-xl bg-[#0B0F19]/70 border border-[#1A2238] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredBookings.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
