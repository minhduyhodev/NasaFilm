import React, { useState, useEffect } from 'react';
import { Search, DollarSign, CheckCircle2, XCircle, Ticket, Calendar, User, Film, Layers, SlidersHorizontal, Download } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="text-left">
          <h1 className="text-2xl font-black text-white tracking-tight">Quản lý Đơn Hàng</h1>
          <p className="text-xs text-gray-400 mt-1">
            Doanh thu: <span className="text-amber-500 font-bold">{formatPrice(stats.totalRevenue)}</span> · 
            Thành công: <span className="text-emerald-400 font-bold">{stats.confirmedCount}</span> · 
            Đã hủy: <span className="text-rose-400 font-bold">{stats.cancelledCount}</span> · 
            Tổng đơn: <span className="text-sky-400 font-bold">{stats.totalCount}</span>
          </p>
        </div>
        <button 
          className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer" 
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5 text-white" />
          Xuất File Excel
        </button>
      </div>

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-[#1A2238]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo khách, email, phim..."
            />
          </div>
          <div className="flex bg-[#070A13] border border-[#1A2238] rounded-lg p-0.5">
            <button
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setStatusFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                statusFilter === 'CONFIRMED' ? 'bg-emerald-600/80 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setStatusFilter('CONFIRMED')}
            >
              Thành công
            </button>
            <button
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                statusFilter === 'CANCELLED' ? 'bg-rose-600/80 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setStatusFilter('CANCELLED')}
            >
              Đã hủy
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-t-red-600 border-slate-800 rounded-full animate-spin" />
              <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-widest">Đang tải dữ liệu...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Ticket className="w-10 h-10 mx-auto mb-3 opacity-25 text-red-500" />
              <p className="text-xs font-semibold uppercase tracking-wider">Không tìm thấy đơn đặt vé nào</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                  <th className="py-2.5 px-4 text-left">Mã vé</th>
                  <th className="py-2.5 px-4 text-left">Khách hàng</th>
                  <th className="py-2.5 px-4 text-left">Phim / Phòng</th>
                  <th className="py-2.5 px-4 text-center">Ghế ngồi</th>
                  <th className="py-2.5 px-4 text-left">Combo đi kèm</th>
                  <th className="py-2.5 px-4 text-right">Tổng tiền</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                  <th className="py-2.5 px-4 text-center">Ngày mua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2238]/40">
                {filteredBookings.map((row) => (
                  <tr key={row.bookingUuid} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                    {/* Booking UUID Short */}
                    <td className="py-2.5 px-4 text-left font-mono text-xs text-red-400 font-bold">
                      {row.bookingUuid ? row.bookingUuid.substring(0, 8).toUpperCase() : 'N/A'}
                    </td>
                    
                    {/* Customer Info with Avatar */}
                    <td className="py-2.5 px-4 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A2238] border border-white/5 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                          {row.customerAvatarUrl ? (
                            <img
                              src={normalizeAvatarUrl(row.customerAvatarUrl)}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<span class="text-xs text-gray-300">👤</span>';
                              }}
                            />
                          ) : (
                            <User className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs leading-tight">{row.customerName || 'N/A'}</div>
                          <div className="text-[10px] text-gray-500 font-semibold leading-tight mt-0.5">{row.customerEmail || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Movie / Room Info */}
                    <td className="py-2.5 px-4 text-left">
                      <div className="max-w-[180px]">
                        <div className="text-white font-bold text-xs truncate leading-tight uppercase" title={row.movieTitle}>
                          {row.movieTitle || 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-500 font-semibold leading-tight mt-0.5">
                          {row.cinemaRoomName || 'N/A'}
                        </div>
                      </div>
                    </td>

                    {/* Seats */}
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono font-bold text-[10px] uppercase">
                        {row.seats || 'None'}
                      </span>
                    </td>

                    {/* Combos */}
                    <td className="py-2.5 px-4 text-left text-xs font-semibold text-gray-300">
                      <div className="max-w-[150px] truncate" title={row.combos || 'Không kèm bắp nước'}>
                        {row.combos || 'Không kèm bắp nước'}
                      </div>
                    </td>

                    {/* Total Price */}
                    <td className="py-2.5 px-4 text-right text-xs font-mono font-black text-amber-500">
                      {formatPrice(row.totalPrice)}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
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
                    <td className="py-2.5 px-4 text-center text-[10px] text-gray-400 font-semibold font-mono">
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
