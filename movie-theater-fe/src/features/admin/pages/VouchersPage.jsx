import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Search, Edit2, Trash2, Loader2, X, Activity, Percent, DollarSign } from 'lucide-react';
import { adminPromotionService } from '../api/adminPromotionService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import './VouchersPage.css';

const VouchersPage = () => {
  const { addNotification } = useNotification();
  const [vouchersList, setVouchersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [oncePerUser, setOncePerUser] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Fetch Vouchers
  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminPromotionService.getPromotions();
      if (Array.isArray(data)) {
        setVouchersList(data);
      }
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải danh sách khuyến mãi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Date converters
  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const formatDateForBackend = (localString) => {
    if (!localString) return null;
    return new Date(localString).toISOString();
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '0';
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    setSelectedVoucher(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMaxUsage('');
    setOncePerUser(false);
    setStartDate('');
    setEndDate('');
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (voucher) => {
    setSelectedVoucher(voucher);
    setCode(voucher.code);
    setDiscountType(voucher.discountType);
    setDiscountValue(
      voucher.discountType === 'PERCENTAGE' 
        ? Math.round(voucher.discountValue * 100) 
        : voucher.discountValue
    );
    setMaxUsage(voucher.maxUsage !== null ? voucher.maxUsage.toString() : '');
    setOncePerUser(voucher.oncePerUser || false);
    setStartDate(formatDateForInput(voucher.startDate));
    setEndDate(formatDateForInput(voucher.endDate));
    setStatus(voucher.status);
    setIsModalOpen(true);
  };

  // Delete Voucher
  const handleDeleteVoucher = async (id, codeStr) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã khuyến mãi "${codeStr}" không?`)) {
      return;
    }
    try {
      await adminPromotionService.deletePromotion(id);
      addNotification('Xóa thành công', `Đã xóa mã khuyến mãi ${codeStr}`, 'success');
      fetchVouchers();
    } catch (error) {
      addNotification('Xóa thất bại', error.message || 'Lỗi khi xóa khuyến mãi', 'error');
    }
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      addNotification('Lỗi', 'Mã khuyến mãi không được bỏ trống', 'error');
      return;
    }

    const valueNum = parseFloat(discountValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      addNotification('Lỗi', 'Giá trị giảm giá phải lớn hơn 0', 'error');
      return;
    }

    if (discountType === 'PERCENTAGE' && valueNum > 100) {
      addNotification('Lỗi', 'Phần trăm giảm giá tối đa là 100%', 'error');
      return;
    }

    const finalDiscountValue = discountType === 'PERCENTAGE' ? valueNum / 100 : valueNum;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      addNotification('Lỗi', 'Ngày bắt đầu phải trước ngày kết thúc', 'error');
      return;
    }

    const promoData = {
      code: trimmedCode,
      discountType,
      discountValue: finalDiscountValue,
      maxUsage: maxUsage ? parseInt(maxUsage, 10) : null,
      oncePerUser,
      startDate: formatDateForBackend(startDate),
      endDate: formatDateForBackend(endDate),
      status,
    };

    setIsSubmitting(true);
    try {
      if (selectedVoucher) {
        await adminPromotionService.updatePromotion(selectedVoucher.id, promoData);
        addNotification('Cập nhật thành công', `Mã ${trimmedCode} đã được cập nhật`, 'success');
      } else {
        await adminPromotionService.createPromotion(promoData);
        addNotification('Thêm thành công', `Mã ${trimmedCode} đã được thêm mới`, 'success');
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (error) {
      addNotification(
        'Lỗi',
        error.message || 'Đã xảy ra lỗi khi lưu mã khuyến mãi.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Vouchers
  const filteredVouchers = vouchersList.filter((v) => {
    const matchesSearch =
      !searchQuery || v.code.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalVouchers = vouchersList.length;
  const activeVouchers = vouchersList.filter((v) => v.status === 'ACTIVE').length;
  const percentageCount = vouchersList.filter((v) => v.discountType === 'PERCENTAGE').length;
  const fixedCount = vouchersList.filter((v) => v.discountType === 'FIXED_AMOUNT').length;

  const stats = [
    { label: 'TỔNG SỐ MÃ', value: totalVouchers, icon: Ticket, color: 'text-indigo-500' },
    { label: 'ĐANG HOẠT ĐỘNG', value: activeVouchers, icon: Activity, color: 'text-emerald-500' },
    { label: 'GIẢM THEO %', value: percentageCount, icon: Percent, color: 'text-amber-500' },
    { label: 'GIẢM THEO TIỀN', value: fixedCount, icon: DollarSign, color: 'text-sky-500' },
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Promotions</p>
          <h1 className="admin-title">Quản lý Khuyến mãi</h1>
          <p className="admin-description">
            Tạo mã giảm giá mới, cấu hình giới hạn số lần dùng, thiết lập điều kiện áp dụng cho từng khách hàng và theo dõi hiệu suất voucher.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors duration-300 cursor-pointer shadow-lg shadow-red-600/25"
          >
            <Plus size={16} />
            Tạo Voucher Mới
          </button>
        </div>
      </div>

      {/* Stats Insight Panel */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">{stat.label}</span>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mt-1">{isLoading ? '...' : stat.value}</h3>
            </div>
            <div className={`p-3.5 rounded-xl bg-white/5 border border-white/5 ${stat.color} shrink-0`}>
              <stat.icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Tìm kiếm theo mã voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="admin-action-group relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="admin-action-btn flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#121826] border border-[#1A2238] text-gray-300 text-sm font-semibold hover:text-white hover:bg-white/5 focus:outline-none transition-all duration-200 cursor-pointer min-w-[175px]"
            >
              <span>
                {statusFilter === 'all' && 'Tất cả Trạng thái'}
                {statusFilter === 'ACTIVE' && 'Hoạt động'}
                {statusFilter === 'INACTIVE' && 'Vô hiệu hóa'}
              </span>
              <span className={`material-symbols-outlined text-gray-400 text-base transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {isFilterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsFilterDropdownOpen(false)} />
                <div className="absolute right-0 mt-12 w-52 bg-[#121826] border border-[#1A2238] rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 animate-dropdown-fade-in">
                  {[
                    { value: 'all', label: 'Tất cả Trạng thái', color: 'bg-gray-400' },
                    { value: 'ACTIVE', label: 'Hoạt động', color: 'bg-emerald-500' },
                    { value: 'INACTIVE', label: 'Vô hiệu hóa', color: 'bg-rose-500' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-sm font-bold transition-all duration-200 cursor-pointer ${
                        statusFilter === option.value
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${option.color}`} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="admin-table-container">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-[#8a8d9f] text-sm font-medium">Đang tải danh sách khuyến mãi...</p>
            </div>
          ) : filteredVouchers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr className="admin-table-thead-tr">
                  <th className="pb-3 text-left">MÃ VOUCHER</th>
                  <th className="pb-3 text-center">LOẠI GIẢM GIÁ</th>
                  <th className="pb-3 text-center">GIÁ TRỊ</th>
                  <th className="pb-3 text-center">LƯỢT DÙNG</th>
                  <th className="pb-3 text-center">1 LẦN/KHÁCH HÀNG</th>
                  <th className="pb-3 text-center">HẠN SỬ DỤNG</th>
                  <th className="pb-3 text-center">TRẠNG THÁI</th>
                  <th className="pb-3 text-center">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2238]/30">
                {filteredVouchers.map((row) => {
                  const isExpired = row.endDate && new Date(row.endDate) < new Date();
                  return (
                    <tr key={row.id} className="admin-table-tr group">
                      <td className="py-4 text-left font-bold text-red-400 tracking-wider">
                        <span className="bg-red-500/5 border border-red-500/20 px-3 py-1 rounded-lg shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                          {row.code}
                        </span>
                      </td>
                      <td className="text-center py-4 text-gray-300 text-xs font-semibold">
                        {row.discountType === 'PERCENTAGE' ? 'Giảm phần trăm (%)' : 'Giảm tiền cố định'}
                      </td>
                      <td className="text-center py-4 font-mono font-bold text-white">
                        {row.discountType === 'PERCENTAGE' 
                          ? `${Math.round(row.discountValue * 100)} %` 
                          : formatPrice(row.discountValue)
                        }
                      </td>
                      <td className="text-center py-4 text-sm font-mono text-gray-300">
                        <span className="text-white font-bold">{row.usedCount || 0}</span>
                        <span className="text-gray-500"> / </span>
                        <span>{row.maxUsage || '∞'}</span>
                      </td>
                      <td className="text-center py-4">
                        {row.oncePerUser ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            Có
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-center py-4 text-xs text-gray-400 font-medium space-y-0.5">
                        {row.startDate && (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] text-gray-600 font-bold uppercase">BĐ:</span>
                            <span>{new Date(row.startDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}
                        {row.endDate && (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] text-gray-600 font-bold uppercase">KT:</span>
                            <span className={isExpired ? 'text-red-400 line-through' : ''}>
                              {new Date(row.endDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="text-center py-4">
                        {isExpired ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 border-rose-500/20 text-rose-400">
                            Hết hạn
                          </span>
                        ) : row.status === 'ACTIVE' ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
                            Vô hiệu
                          </span>
                        )}
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer focus:outline-none"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(row.id, row.code)}
                            className="p-2 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer focus:outline-none"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20">
              <Ticket className="mx-auto text-gray-500 mb-3" size={40} />
              <p className="text-sm text-gray-400">Không tìm thấy mã khuyến mãi nào phù hợp với bộ lọc tìm kiếm.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm/Sửa Voucher */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg animate-dropdown-fade-in">
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedVoucher ? 'Cập nhật Voucher' : 'Tạo Voucher Khuyến Mãi'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voucher Code */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Mã Voucher *
                  </label>
                  <input
                    type="text"
                    placeholder="MÃ VOUCHER"
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder-gray-600 font-bold uppercase"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                {/* Discount Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Loại Giảm Giá *
                  </label>
                  <select
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                  >
                    <option value="PERCENTAGE">Giảm phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Giảm tiền cố định (đ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Discount Value */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Giá trị giảm * ({discountType === 'PERCENTAGE' ? '%' : 'VND'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={discountType === 'PERCENTAGE' ? 'Ví dụ: 20' : 'Ví dụ: 50000'}
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder-gray-600 font-mono"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                </div>

                {/* Max Usage */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Lượt dùng tối đa (Để trống nếu không giới hạn)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Không giới hạn"
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder-gray-600 font-mono"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Ngày kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Once per user check */}
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="oncePerUser"
                    className="w-5 h-5 rounded border-[#1A2238] bg-[#0B1020] text-red-600 focus:ring-red-500/50 focus:ring-offset-[#0B1020] cursor-pointer"
                    checked={oncePerUser}
                    onChange={(e) => setOncePerUser(e.target.checked)}
                  />
                  <label
                    htmlFor="oncePerUser"
                    className="text-xs font-bold uppercase tracking-wider text-gray-400 cursor-pointer select-none"
                  >
                    Giới hạn 1 lần dùng / khách hàng
                  </label>
                </div>

                {/* Status selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Trạng thái *
                  </label>
                  <select
                    className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Vô hiệu hóa (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-[#1A2238] mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#1A2238] text-gray-300 text-sm font-semibold hover:text-white hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedVoucher ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default VouchersPage;
