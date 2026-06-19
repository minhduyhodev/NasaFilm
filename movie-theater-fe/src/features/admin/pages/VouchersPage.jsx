import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket, Plus, Search, Activity, CheckCircle, Pause, ChevronDown,
} from 'lucide-react';
import { adminPromotionService } from '../api/adminPromotionService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import { formatDateForInput, formatDateTimeDisplay } from '../utils/voucherFormUtils';
import './VouchersPage.css';

const VouchersPage = () => {
  const navigate = useNavigate();
  const [vouchersList, setVouchersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminPromotionService.getPromotions();
      if (Array.isArray(data)) setVouchersList(data);
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải danh sách khuyến mãi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredVouchers = vouchersList.filter((v) => {
    const matchesSearch =
      !searchQuery || v.code.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalVouchers = vouchersList.length;
  const activeVouchers = vouchersList.filter((v) => v.status === 'ACTIVE').length;
  const inactiveVouchers = vouchersList.filter((v) => v.status === 'INACTIVE').length;
  const totalUsedCount = vouchersList.reduce((acc, curr) => acc + (curr.usedCount || 0), 0);

  const paginatedVouchers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVouchers, currentPage, itemsPerPage]);

  const filterOptions = [
    { value: 'all', label: 'Tất cả trạng thái', icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 shrink-0" /> },
    { value: 'ACTIVE', label: 'Hoạt động', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" /> },
    { value: 'INACTIVE', label: 'Đã vô hiệu', icon: <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 shrink-0" /> },
  ];
  const currentFilter = filterOptions.find((opt) => opt.value === statusFilter) || filterOptions[0];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Trung Tâm Khuyến Mãi</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Voucher &amp; Khuyến Mãi</h1>
          <p className="text-sm text-gray-400 mt-2">
            Tạo chiến dịch chiết khấu, quản lý lượt sử dụng mã và thời hạn kích hoạt voucher toàn hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/vouchers/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm text-white font-bold transition shadow-md cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus size={16} /> Tạo Voucher Mới
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-left">
        {[
          { label: 'TỔNG VOUCHER', value: totalVouchers, icon: Ticket, color: 'text-indigo-400', kpiClass: 'kpi-total' },
          { label: 'ĐANG HOẠT ĐỘNG', value: activeVouchers, icon: CheckCircle, color: 'text-emerald-400', kpiClass: 'kpi-active' },
          { label: 'VÔ HIỆU HÓA', value: inactiveVouchers, icon: Pause, color: 'text-amber-400', kpiClass: 'kpi-inactive' },
          { label: 'TỔNG LƯỢT SỬ DỤNG', value: totalUsedCount, icon: Activity, color: 'text-blue-400', kpiClass: 'kpi-used' },
        ].map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-1">
        <div className="relative w-full sm:w-72 text-left">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF3366]/50 transition-colors font-sans"
            placeholder="Tìm kiếm theo mã voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative text-left z-20">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#242d42] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#475569] focus:outline-none transition-colors cursor-pointer min-w-[170px] h-[38px] justify-between"
          >
            <span className="flex items-center">
              {currentFilter.icon}
              <span>{currentFilter.label}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isFilterDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsFilterDropdownOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 space-y-0.5 z-20">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-gray-100 transition text-left text-xs font-semibold cursor-pointer ${statusFilter === opt.value ? 'bg-red-50 text-red-600 font-bold border border-red-200' : 'text-gray-700 border border-transparent'}`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 bg-[#1c2333]/50 border border-[#242d42] rounded-xl shadow-2xl">
          <div className="w-10 h-10 border-2 border-[#FF3366] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-sans">Đang tải danh sách voucher...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#1c2333]/50 border border-[#242d42] rounded-xl shadow-2xl">
          <Ticket className="w-14 h-14 text-zinc-700" />
          <p className="font-bold text-white uppercase tracking-wider text-sm font-sans">Không tìm thấy voucher nào</p>
          <p className="text-xs text-gray-500 font-sans">Hãy tạo voucher mới hoặc điều chỉnh bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242d42]">
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Mã Voucher</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Chiết Khấu</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Lượt Sử Dụng</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Hiệu Lực</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVouchers.map((v) => {
                  const now = new Date();
                  const endDateObj = v.endDate ? new Date(v.endDate) : null;
                  const isExpired = endDateObj && endDateObj < now;
                  const isSoonExpiring = endDateObj && !isExpired && endDateObj - now < 7 * 24 * 3600 * 1000;
                  const usedCount = v.usedCount ?? 0;
                  const pct = v.maxUsage > 0 ? Math.min(100, Math.round((usedCount / v.maxUsage) * 100)) : 0;
                  const progressColor = pct >= 85 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <tr
                      key={v.id}
                      onClick={() => navigate(`/admin/vouchers/${v.id}`)}
                      className="border-b border-[#242d42]/30 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-base font-extrabold text-white tracking-widest uppercase font-sans">{v.code}</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.status === 'ACTIVE' ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 font-sans">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                Hoạt động
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 font-sans">
                                <span className="w-1 h-1 rounded-full bg-amber-400" />
                                Vô hiệu
                              </span>
                            )}
                            {v.oncePerUser && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold font-sans">
                                1 lần/người
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-gray-400 font-sans">
                            {v.discountType === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Cố định (đ)'}
                          </span>
                          <span className="text-lg font-black text-amber-400 font-sans">
                            {v.discountType === 'PERCENTAGE'
                              ? `${Math.round(v.discountValue * 100)}%`
                              : `${Number(v.discountValue).toLocaleString('vi-VN')} đ`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[150px] text-left">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 font-sans">
                            <span>{usedCount} / {v.maxUsage ?? '∞'}</span>
                            {v.maxUsage > 0 && <span>{pct}%</span>}
                          </div>
                          {v.maxUsage > 0 ? (
                            <div className="h-1 rounded-full bg-[#1A2238] overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${pct}%` }} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-sans">Không giới hạn</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 font-sans text-left">
                          {v.startDate && (
                            <span className="text-[11px] text-gray-400">
                              Từ: {formatDateTimeDisplay(formatDateForInput(v.startDate))}
                            </span>
                          )}
                          {v.endDate && (
                            <span className="text-[11px] text-gray-400">
                              Đến: {formatDateTimeDisplay(formatDateForInput(v.endDate))}
                            </span>
                          )}
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {isExpired && (
                              <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] px-1.5 py-0.5 rounded-full font-bold">Hết hạn</span>
                            )}
                            {isSoonExpiring && (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] px-1.5 py-0.5 rounded-full font-bold">Sắp hết hạn</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredVouchers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  );
};

export default VouchersPage;
