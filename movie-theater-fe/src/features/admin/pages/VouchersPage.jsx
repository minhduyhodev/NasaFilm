import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Plus, Search, Edit2, Trash2, Loader2, X, Activity,
  Percent, DollarSign, Play, Pause, Calendar, ChevronDown,
  CheckCircle, Ban, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminPromotionService } from '../api/adminPromotionService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import Pagination from '../../../shared/components/Pagination';
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [oncePerUser, setOncePerUser] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Custom Dropdown & DatePicker states
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [activeDatePickerField, setActiveDatePickerField] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [tempTime, setTempTime] = useState('00:00');

  const statusOptions = [
    { value: 'ACTIVE', label: 'Hoat dong (ACTIVE)', icon: <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> },
    { value: 'INACTIVE', label: 'Vo hieu hoa (INACTIVE)', icon: <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> }
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === status) || statusOptions[0];

  const handleOpenDatePicker = (field) => {
    const currentValue = field === 'startDate' ? startDate : endDate;
    if (currentValue) {
      const parsedDate = new Date(currentValue);
      if (!isNaN(parsedDate.getTime())) {
        setCalendarMonth(parsedDate.getMonth());
        setCalendarYear(parsedDate.getFullYear());
        const hours = String(parsedDate.getHours()).padStart(2, '0');
        const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
        setTempTime(`${hours}:${minutes}`);
      }
    } else {
      const today = new Date();
      setCalendarMonth(today.getMonth());
      setCalendarYear(today.getFullYear());
      setTempTime('00:00');
    }
    setActiveDatePickerField(field);
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
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}T${tempTime}`;
    if (activeDatePickerField === 'startDate') {
      setStartDate(dateStr);
    } else if (activeDatePickerField === 'endDate') {
      setEndDate(dateStr);
    }
  };

  const handleTimeChange = (newTime) => {
    setTempTime(newTime);
    const currentValue = activeDatePickerField === 'startDate' ? startDate : endDate;
    if (currentValue) {
      const parts = currentValue.split('T');
      const datePart = parts[0];
      const newDateStr = `${datePart}T${newTime}`;
      if (activeDatePickerField === 'startDate') {
        setStartDate(newDateStr);
      } else if (activeDatePickerField === 'endDate') {
        setEndDate(newDateStr);
      }
    } else {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T${newTime}`;
      if (activeDatePickerField === 'startDate') {
        setStartDate(dateStr);
      } else if (activeDatePickerField === 'endDate') {
        setEndDate(dateStr);
      }
    }
  };

  const handleConfirmDateTime = () => {
    setActiveDatePickerField(null);
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

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
      days.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const renderCalendarContent = () => {
    const currentValue = activeDatePickerField === 'startDate' ? startDate : endDate;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">
            {`Thang ${calendarMonth + 1}, ${calendarYear}`}
          </span>
          <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer">
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
            const isSelected = currentValue && currentValue.startsWith(dateStr);
            const today = new Date();
            const isToday = today.getDate() === dayObj.day && today.getMonth() === dayObj.month && today.getFullYear() === dayObj.year;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDay(dayObj)}
                className={`py-1 text-[11px] rounded-md font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white font-bold'
                    : isToday
                    ? 'border border-red-500/30 text-red-600 font-semibold'
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

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gio:</span>
          <input
            type="time"
            className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 w-24 text-center cursor-pointer font-mono"
            value={tempTime}
            onChange={(e) => handleTimeChange(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              if (activeDatePickerField === 'startDate') setStartDate('');
              else if (activeDatePickerField === 'endDate') setEndDate('');
              setActiveDatePickerField(null);
            }}
            className="text-[10px] text-gray-500 hover:text-gray-800 font-bold uppercase transition cursor-pointer"
          >
            Xoa
          </button>
          <button
            type="button"
            onClick={handleConfirmDateTime}
            className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase transition cursor-pointer"
          >
            Xac nhan
          </button>
        </div>
      </div>
    );
  };

  const formatDateTimeDisplay = (localString) => {
    if (!localString) return 'Chon ngay gio...';
    const parts = localString.split('T');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
      }
    }
    return localString;
  };

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminPromotionService.getPromotions();
      if (Array.isArray(data)) {
        setVouchersList(data);
      }
    } catch (error) {
      notificationService.error(error.message || 'Khong the tai danh sach khuyen mai.');
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
    return new Intl.NumberFormat('vi-VN').format(price) + ' d';
  };

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

  const handleDeleteVoucher = async (id, codeStr) => {
    if (!window.confirm(`Ban co chac chan muon xoa ma khuyen mai "${codeStr}" khong?`)) {
      return;
    }
    try {
      await adminPromotionService.deletePromotion(id);
      addNotification('Xoa thanh cong', `Da xoa ma khuyen mai ${codeStr}`, 'success');
      fetchVouchers();
    } catch (error) {
      addNotification('Xoa that bai', error.message || 'Loi khi xoa khuyen mai', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      addNotification('Loi', 'Ma khuyen mai khong duoc bo trong', 'error');
      return;
    }

    const valueNum = parseFloat(discountValue);
    if (isNaN(valueNum) || valueNum <= 0) {
      addNotification('Loi', 'Gia tri giam gia phai lon hon 0', 'error');
      return;
    }

    if (discountType === 'PERCENTAGE' && valueNum > 100) {
      addNotification('Loi', 'Phan tram giam gia toi da la 100%', 'error');
      return;
    }

    const finalDiscountValue = discountType === 'PERCENTAGE' ? valueNum / 100 : valueNum;

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      addNotification('Loi', 'Ngay bat dau phai truoc ngay ket thuc', 'error');
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
        addNotification('Cap nhat thanh cong', `Ma ${trimmedCode} da duoc cap nhat`, 'success');
      } else {
        await adminPromotionService.createPromotion(promoData);
        addNotification('Them thanh cong', `Ma ${trimmedCode} da duoc them moi`, 'success');
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (error) {
      addNotification('Loi', error.message || 'Da xay ra loi khi luu ma khuyen mai.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 text-left">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 block mb-1">
            Trung Tâm Khuyến Mãi
          </span>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">
            Quản Lý Voucher &amp; Khuyến Mãi
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Tạo chiến dịch chiết khấu, quản lý lượt sử dụng mã và thời hạn kích hoạt voucher toàn hệ thống.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white font-bold transition shadow-md cursor-pointer shrink-0"
        >
          <Plus size={16} /> Tao Voucher Moi
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Tong Voucher</span>
            <span className="text-3xl font-black text-white">{totalVouchers}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Đang Hoạt Động</span>
            <span className="text-3xl font-black text-emerald-400">{activeVouchers}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Vô Hiệu Hóa</span>
            <span className="text-3xl font-black text-amber-400">{inactiveVouchers}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Pause className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between shadow-md hover:border-gray-600 transition-all duration-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Tổng Lượt Sử Dụng</span>
            <span className="text-3xl font-black text-blue-400">{totalUsedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tìm kiếm theo mã voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Hoạt động' },
              { value: 'INACTIVE', label: 'Đã vô hiệu' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  statusFilter === opt.value
                    ? 'bg-red-600 text-white'
                    : 'bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white font-bold transition shadow-md cursor-pointer shrink-0"
          >
            <Plus size={14} /> Tạo Voucher Mới
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      {isLoading ? (
        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Đang tải danh sách voucher...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <Ticket className="w-14 h-14 text-zinc-700" />
          <p className="font-bold text-white uppercase tracking-wider text-sm">Không tìm thấy voucher nào</p>
          <p className="text-xs text-gray-500">Hãy tạo voucher mới hoặc điều chỉnh bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl overflow-hidden mb-4">
            <div className="p-4 border-b border-[#1A2238] flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Danh sách voucher ({filteredVouchers.length} mã)
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Trang {currentPage} / {Math.ceil(filteredVouchers.length / itemsPerPage)}
              </span>
            </div>

            {paginatedVouchers.map((v) => {
              const now = new Date();
              const endDateObj = v.endDate ? new Date(v.endDate) : null;
              const isExpired = endDateObj && endDateObj < now;
              const isSoonExpiring = endDateObj && !isExpired && (endDateObj - now) < 7 * 24 * 3600 * 1000;
              const usedCount = v.usedCount ?? 0;
              const pct = v.maxUsage > 0 ? Math.min(100, Math.round((usedCount / v.maxUsage) * 100)) : 0;
              const progressColor = pct >= 85 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';

              return (
                <div
                  key={v.id}
                  className="flex items-stretch border-b border-[#1A2238]/50 hover:bg-white/[0.012] transition-colors group last:border-b-0"
                >
                  {/* Left accent bar */}
                  <div className={`w-1 self-stretch shrink-0 ${v.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                  {/* Section 1: Voucher Code */}
                  <div className="w-52 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center gap-2">
                    <span className="text-xl font-black text-white font-mono tracking-widest uppercase">
                      {v.code}
                    </span>
                    {v.status === 'ACTIVE' ? (
                      <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Hoạt động
                      </span>
                    ) : (
                      <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Vô hiệu
                      </span>
                    )}
                    {v.oncePerUser && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
                        Chỉ 1 lần/người
                      </span>
                    )}
                  </div>

                  {/* Section 2: Discount Type + Value */}
                  <div className="w-48 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center gap-1">
                    {v.discountType === 'PERCENTAGE' ? (
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 w-fit">
                        <Percent className="w-3 h-3" /> % Phần trăm
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 w-fit">
                        <DollarSign className="w-3 h-3" /> Cố định
                      </span>
                    )}
                    <span className="text-2xl font-black font-mono text-amber-400 mt-1">
                      {v.discountType === 'PERCENTAGE'
                        ? `${Math.round(v.discountValue * 100)}%`
                        : `${Number(v.discountValue).toLocaleString('vi-VN')} d`}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Chiết khấu</span>
                  </div>

                  {/* Section 3: Usage Progress */}
                  <div className="flex-1 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Lượt Sử Dụng</span>
                      <span className="text-sm font-bold text-white">
                        {usedCount} / {v.maxUsage ?? '∞'}
                      </span>
                    </div>
                    {v.maxUsage > 0 ? (
                      <>
                        <div className="h-2 rounded-full bg-[#1A2238] w-full">
                          <div
                            className={`h-full rounded-full transition-all ${progressColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5">{pct}% đã sử dụng</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Được sử dụng {usedCount} lần (không giới hạn)
                      </span>
                    )}
                  </div>

                  {/* Section 4: Validity */}
                  <div className="w-52 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hiệu Lực</span>
                    {v.startDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-300">
                          Từ: {formatDateTimeDisplay(formatDateForInput(v.startDate))}
                        </span>
                      </div>
                    )}
                    {v.endDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-300">
                          Đến: {formatDateTimeDisplay(formatDateForInput(v.endDate))}
                        </span>
                      </div>
                    )}
                    {isExpired && (
                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full w-fit">
                        Đã hết hạn
                      </span>
                    )}
                    {isSoonExpiring && (
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full w-fit">
                        Sắp hết hạn
                      </span>
                    )}
                  </div>

                  {/* Section 5: Actions */}
                  <div className="w-40 shrink-0 px-6 py-5 flex flex-col justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(v)}
                      className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500/15 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3 h-3" /> Chỉnh Sửa
                    </button>

                    {v.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-500/15 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Pause className="w-3 h-3" /> Vô hiệu hóa
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(v)}
                        className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/15 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3" /> Kích hoạt
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteVoucher(v.id, v.code)}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-500/15 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAGINATION */}
          {filteredVouchers.length > 0 && (
            <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredVouchers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </>
      )}

      {/* MODAL - PRESERVED COMPLETELY */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg animate-dropdown-fade-in text-left">
            <div className="modal-header">
              <h2 className="modal-title font-bold uppercase tracking-wider text-sm">
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
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Mã Voucher *
                  </label>
                  <input
                    type="text"
                    placeholder="MA VOUCHER"
                    className="form-input w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none font-mono font-bold uppercase"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                {/* Discount Type */}
                <div>
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Loại Giảm Giá *
                  </label>
                  <select
                    className="form-select w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none cursor-pointer"
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
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Giá trị giảm * ({discountType === 'PERCENTAGE' ? '%' : 'VND'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={discountType === 'PERCENTAGE' ? 'Ví dụ: 20' : 'Ví dụ: 50000'}
                    className="form-input w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none font-mono"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                </div>

                {/* Max Usage */}
                <div>
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Lượt dùng tối đa (Bỏ trống nếu không giới hạn)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Không giới hạn"
                    className="form-input w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none font-mono"
                    value={maxUsage}
                    onChange={(e) => setMaxUsage(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="relative">
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Ngày bắt đầu
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenDatePicker('startDate')}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors h-[38px]"
                  >
                    <span className={`truncate whitespace-nowrap ${startDate ? 'text-gray-900 font-mono' : 'text-gray-400'}`}>
                      {startDate ? formatDateTimeDisplay(startDate) : 'Chọn ngày...'}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  </button>

                  {activeDatePickerField === 'startDate' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveDatePickerField(null)}></div>
                      <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-dropdown-fade-in w-72">
                        {renderCalendarContent()}
                      </div>
                    </>
                  )}
                </div>

                {/* End Date */}
                <div className="relative">
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Ngày kết thúc
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenDatePicker('endDate')}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors h-[38px]"
                  >
                    <span className={`truncate whitespace-nowrap ${endDate ? 'text-gray-900 font-mono' : 'text-gray-400'}`}>
                      {endDate ? formatDateTimeDisplay(endDate) : 'Chọn ngày...'}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  </button>

                  {activeDatePickerField === 'endDate' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActiveDatePickerField(null)}></div>
                      <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-dropdown-fade-in w-72">
                        {renderCalendarContent()}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Once per user */}
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="oncePerUser"
                    className="w-5 h-5 rounded border-gray-300 bg-white text-red-600 focus:ring-red-500/50 focus:ring-offset-0 cursor-pointer"
                    checked={oncePerUser}
                    onChange={(e) => setOncePerUser(e.target.checked)}
                  />
                  <label
                    htmlFor="oncePerUser"
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none"
                  >
                    Giới hạn 1 lần dùng / khách hàng
                  </label>
                </div>

                {/* Status selection */}
                <div className="relative">
                  <label className="form-label block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Trạng thái *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors h-[38px]"
                  >
                    <span className="flex items-center gap-2">
                      {currentStatusOption.icon}
                      <span>{currentStatusOption.label}</span>
                    </span>
                    <ChevronDown
                      className="w-4 h-4 text-gray-500 transition-transform duration-200"
                      style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </button>

                  {isStatusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                      <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 space-y-0.5 animate-dropdown-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                        {statusOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setStatus(option.value);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-gray-50 transition text-left text-xs ${status === option.value ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'}`}
                          >
                            {option.icon}
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions mt-6 flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedVoucher ? 'Cap nhat' : 'Tao moi'}
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
