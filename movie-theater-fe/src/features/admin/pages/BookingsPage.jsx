import React, { useState, useEffect } from 'react';
import { Search, DollarSign, CheckCircle2, XCircle, Ticket, Calendar, User, Film, Layers, SlidersHorizontal, Download } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import './BookingsPage.css';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, CONFIRMED, CANCELLED

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(searchTerm);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleExport = () => {
    // Fake export action
    notificationService.info('Tính năng xuất báo cáo đang được chuẩn bị.');
  };

  // Format date/time
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

  // Format price
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0 đ';
    return `${price.toLocaleString('vi-VN')} đ`;
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status?.toUpperCase() === statusFilter;
  });

  // Calculate stats based on ALL bookings loaded
  const stats = React.useMemo(() => {
    let revenue = 0;
    let confirmed = 0;
    let cancelled = 0;

    bookings.forEach((b) => {
      if (b.status?.toUpperCase() === 'CONFIRMED') {
        revenue += b.totalPrice || 0;
        confirmed += 1;
      } else if (b.status?.toUpperCase() === 'CANCELLED') {
        cancelled += 1;
      }
    });

    return {
      totalRevenue: revenue,
      confirmedCount: confirmed,
      cancelledCount: cancelled,
      totalCount: bookings.length
    };
  }, [bookings]);

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Operations Control</p>
          <h1 className="admin-title">Quản Lý Đơn Hàng</h1>
          <p className="admin-description">
            Tra cứu và giám sát toàn bộ các đơn đặt vé xem phim, suất chiếu, ghế ngồi và gói combo bắp nước đi kèm trên toàn hệ thống.
          </p>
        </div>
        <button className="admin-add-btn bg-yellow-600 hover:bg-yellow-700 shadow-yellow-600/10 cursor-pointer" onClick={handleExport}>
          <Download className="w-4 h-4 text-white" />
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Báo cáo</div>
            <div className="admin-add-btn-main">Xuất File Excel</div>
          </div>
        </button>
      </div>

      {/* Unified Stats Insight Panel */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md mb-8">
        <div className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">TỔNG DOANH THU</span>
            <h3 className="text-2xl font-black text-amber-500 tracking-tight leading-none mt-1">{formatPrice(stats.totalRevenue)}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Giao dịch thành công</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-amber-500 shrink-0">
            <DollarSign className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>

        <div className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">ĐƠN THÀNH CÔNG</span>
            <h3 className="text-3xl font-black text-emerald-500 tracking-tight leading-none mt-1">{stats.confirmedCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Đã xuất vé thành công</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-emerald-500 shrink-0">
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>

        <div className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">ĐƠN ĐÃ HỦY</span>
            <h3 className="text-3xl font-black text-rose-500 tracking-tight leading-none mt-1">{stats.cancelledCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Hoàn tiền hoặc thất bại</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-rose-500 shrink-0">
            <XCircle className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>

        <div className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">TỔNG GIAO DỊCH</span>
            <h3 className="text-3xl font-black text-sky-400 tracking-tight leading-none mt-1">{stats.totalCount}</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Lượt đặt vé hệ thống</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-sky-500 shrink-0">
            <Ticket className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        {/* Controls Section */}
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input
              className="admin-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, email, phim..."
            />
          </div>
          <div className="admin-action-group">
            <div className="flex bg-[#0B1020] border border-[#1A2238] rounded-xl p-1">
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setStatusFilter('ALL')}
              >
                Tất cả
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'CONFIRMED' ? 'bg-emerald-600/80 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Thành công
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'CANCELLED' ? 'bg-rose-600/80 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setStatusFilter('CANCELLED')}
              >
                Đã hủy
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-t-red-600 border-slate-800 rounded-full animate-spin" />
              <p className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Đang tải dữ liệu đơn hàng...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Ticket className="w-12 h-12 mx-auto mb-4 opacity-25 text-red-500" />
              <p className="text-sm font-semibold uppercase tracking-wider">Không tìm thấy đơn đặt vé nào</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr className="admin-table-thead-tr">
                  <th className="pb-3 text-left">Mã vé</th>
                  <th className="pb-3 text-left">Khách hàng</th>
                  <th className="pb-3 text-left">Phim / Phòng</th>
                  <th className="pb-3 text-center">Ghế ngồi</th>
                  <th className="pb-3 text-left">Combo đi kèm</th>
                  <th className="pb-3 text-right">Tổng tiền</th>
                  <th className="pb-3 text-center">Trạng thái</th>
                  <th className="pb-3 text-center">Ngày mua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((row) => (
                  <tr key={row.bookingUuid} className="admin-table-tr">
                    {/* Booking UUID Short */}
                    <td className="py-4 text-left font-mono text-xs text-red-400 font-bold">
                      {row.bookingUuid ? row.bookingUuid.substring(0, 8).toUpperCase() : 'N/A'}
                    </td>
                    
                    {/* Customer Info */}
                    <td className="py-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1A2238] border border-white/5 flex items-center justify-center text-gray-400 shrink-0">
                          <User className="w-4 h-4 text-gray-300" />
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm leading-tight">{row.customerName || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500 font-semibold leading-tight mt-1">{row.customerEmail || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Movie / Room Info */}
                    <td className="py-4 text-left">
                      <div className="max-w-[180px]">
                        <div className="text-white font-bold text-sm truncate leading-tight uppercase" title={row.movieTitle}>
                          {row.movieTitle || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-semibold leading-tight mt-1">
                          {row.cinemaRoomName || 'N/A'}
                        </div>
                      </div>
                    </td>

                    {/* Seats */}
                    <td className="py-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 font-mono font-black text-xs uppercase tracking-wide">
                        {row.seats || 'None'}
                      </span>
                    </td>

                    {/* Combos */}
                    <td className="py-4 text-left text-xs font-semibold text-gray-300">
                      <div className="max-w-[150px] truncate" title={row.combos || 'Không kèm bắp nước'}>
                        {row.combos || 'Không kèm bắp nước'}
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="py-4 text-right text-sm font-mono font-black text-amber-500">
                      {formatPrice(row.totalPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        row.status?.toUpperCase() === 'CONFIRMED'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : row.status?.toUpperCase() === 'CANCELLED'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}>
                        {row.status?.toUpperCase() === 'CONFIRMED' ? '🟢 THÀNH CÔNG' : row.status?.toUpperCase() === 'CANCELLED' ? '🔴 ĐÃ HỦY' : '🟡 CHỜ THANH TOÁN'}
                      </span>
                    </td>

                    {/* Purchase Date */}
                    <td className="py-4 text-center text-xs text-gray-400 font-semibold font-mono">
                      {formatDateTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default BookingsPage;
