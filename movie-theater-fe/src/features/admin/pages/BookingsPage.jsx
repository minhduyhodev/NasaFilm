import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, DollarSign, CheckCircle2, XCircle, Ticket, Calendar, User, Film,
  MapPin, Clock, Loader2, AlertCircle, QrCode, Sparkles,
  Filter, X, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { notificationService } from '../../../shared/services/notificationService';
import UserAvatar from '../../../shared/components/UserAvatar';
import Pagination from '../../../shared/components/Pagination';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import PosterImage from '../../../shared/components/PosterImage';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import './BookingsPage.css';

const BookingsPage = () => {
  useMediaUrlRouting();
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

  const [activeDatePickerField, setActiveDatePickerField] = useState(null); // 'startDate', 'endDate', or null
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const openDatePicker = (field) => {
    const currentValue = field === 'startDate' ? startDate : endDate;
    if (currentValue) {
      const parts = currentValue.split('-');
      if (parts.length === 3) {
        setCalendarYear(parseInt(parts[0], 10));
        setCalendarMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      const today = new Date();
      setCalendarMonth(today.getMonth());
      setCalendarYear(today.getFullYear());
    }
    setActiveDatePickerField(field);
    setActiveDropdown(null);
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDay = (dayObj) => {
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    if (activeDatePickerField === 'startDate') {
      setStartDate(dateStr);
    } else {
      setEndDate(dateStr);
    }
    setActiveDatePickerField(null);
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // start from Monday

    const prevMonthDate = new Date(year, month, 0);
    const prevMonthDaysCount = prevMonthDate.getDate();
    for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDaysCount - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }

    const remainingSlots = 42 - days.length; // 6 rows * 7 columns = 42
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const renderCalendarContent = (field) => {
    const currentValue = field === 'startDate' ? startDate : endDate;
    return (
      <div className="space-y-3 font-sans text-left">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition cursor-pointer border-0 bg-transparent flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            {`Tháng ${calendarMonth + 1}, ${calendarYear}`}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition cursor-pointer border-0 bg-transparent flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {getDaysInMonth(calendarYear, calendarMonth).map((dayObj, idx) => {
            const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
            const isSelected = currentValue === dateStr;
            const today = new Date();
            const isToday = today.getDate() === dayObj.day && today.getMonth() === dayObj.month && today.getFullYear() === dayObj.year;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDay(dayObj)}
                className={`py-1 text-xs rounded-lg font-medium transition-all duration-200 cursor-pointer border-0 ${
                  isSelected
                    ? 'bg-red-600 text-white font-bold shadow-lg shadow-red-600/20'
                    : isToday
                    ? 'border border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    : dayObj.isCurrentMonth
                    ? 'text-gray-800 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-gray-50'
                }`}
              >
                {dayObj.day}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              if (field === 'startDate') setStartDate('');
              else setEndDate('');
              setActiveDatePickerField(null);
            }}
            className="text-[10px] text-gray-400 hover:text-gray-700 font-bold uppercase transition cursor-pointer border-0 bg-transparent p-0"
          >
            Xóa
          </button>
          <button
            type="button"
            onClick={() => setActiveDatePickerField(null)}
            className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase transition cursor-pointer border-0 bg-transparent p-0"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  };

  const [currentPage, setCurrentPage] = useState(1);
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
      const data = await bookingService.getAdminBookings(keyword);
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      notificationService.error('Không thể tải danh sách đơn đặt vé từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAuxiliaryData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchBookings(searchTerm); }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchBookings]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_BOOKINGS, () => fetchBookings(searchTerm));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, selectedCinema, selectedShowtime]);

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
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6 text-left">
        {[
          { label: 'DOANH THU', value: formatPrice(stats.totalRevenue), badge: 'Đơn thành công', icon: DollarSign, color: 'text-amber-400', kpiClass: 'kpi-revenue' },
          { label: 'THÀNH CÔNG', value: stats.confirmedCount, badge: 'đơn đặt vé', icon: CheckCircle2, color: 'text-emerald-400', kpiClass: 'kpi-success' },
          { label: 'ĐÃ HỦY', value: stats.cancelledCount, badge: 'đơn đã hủy', icon: XCircle, color: 'text-rose-400', kpiClass: 'kpi-cancelled' },
          { label: 'TỔNG ĐƠN HÀNG', value: stats.totalCount, badge: 'tổng giao dịch', icon: Ticket, color: 'text-indigo-400', kpiClass: 'kpi-total' },
          { label: 'GIÁ TRỊ AOV', value: formatPrice(stats.avgOrderValue), badge: 'trung bình/đơn', icon: Sparkles, color: 'text-blue-400', kpiClass: 'kpi-aov' }
        ].map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none truncate`} title={kpi.value.toString()}>{kpi.value}</p>
            <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{kpi.badge}</p>
          </div>
        ))}
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-[#1c2333]/50 border border-[#242d42] rounded-2xl p-5 space-y-4 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            <input
              className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-605 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, email, phim..."
            />
          </div>
          <div className="flex items-center bg-[#0b0f19] border border-[#242d42] p-1 rounded-xl self-start sm:self-auto shrink-0 shadow-inner">
            {[{ key: 'ALL', label: 'Tất cả' }, { key: 'CONFIRMED', label: 'Thành công' }, { key: 'CANCELLED', label: 'Đã hủy' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer border-0 ${
                  statusFilter === key
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 bg-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">Từ ngày mua</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => openDatePicker('startDate')}
                className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 cursor-pointer font-sans text-left flex items-center h-[38px] relative"
              >
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <span className={startDate ? 'text-white' : 'text-gray-600'}>
                  {startDate ? startDate : 'yyyy-mm-dd'}
                </span>
              </button>
            </div>
            {activeDatePickerField === 'startDate' && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDatePickerField(null)}></div>
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 text-left animate-dropdown-fade-in">
                  {renderCalendarContent('startDate')}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">Đến ngày mua</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => openDatePicker('endDate')}
                className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 cursor-pointer font-sans text-left flex items-center h-[38px] relative"
              >
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <span className={endDate ? 'text-white' : 'text-gray-600'}>
                  {endDate ? endDate : 'yyyy-mm-dd'}
                </span>
              </button>
            </div>
            {activeDatePickerField === 'endDate' && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveDatePickerField(null)}></div>
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 text-left animate-dropdown-fade-in">
                  {renderCalendarContent('endDate')}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">Rạp chiếu / Chi nhánh</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'cinema' ? null : 'cinema');
                  setActiveDatePickerField(null);
                }}
                className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 cursor-pointer font-sans text-left flex items-center h-[38px] relative"
              >
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <span className="truncate">{selectedCinema ? selectedCinema : 'Tất cả rạp'}</span>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
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

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">Khung giờ suất chiếu</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(activeDropdown === 'showtime' ? null : 'showtime');
                  setActiveDatePickerField(null);
                }}
                className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 cursor-pointer font-sans text-left flex items-center h-[38px] relative"
              >
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <span className="truncate">{selectedShowtime ? selectedShowtime : 'Tất cả khung giờ'}</span>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
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

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-1 border-t border-[#242d42]/30">
            <Filter className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] text-gray-400">
              Bộ lọc đang hoạt động —{' '}
              <button
                onClick={handleClearFilters}
                className="text-red-500 hover:text-red-400 font-bold cursor-pointer transition-colors border-0 bg-transparent p-0"
              >
                Xóa bộ lọc
              </button>
            </span>
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
              const rawPoster = moviesMap[row.movieTitle?.toLowerCase().trim()];
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
                      <UserAvatar
                        src={row.customerAvatarUrl}
                        name={row.customerName}
                        fallbackClassName="bg-slate-800"
                        borderClassName="border border-white/10"
                      />
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
                      {rawPoster ? (
                        <PosterImage
                          src={rawPoster}
                          alt="Poster"
                          width={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (<Film className="w-5 h-5 text-gray-600" />)}
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
        <Pagination
          currentPage={currentPage}
          totalItems={filteredBookings.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
};

export default BookingsPage;
