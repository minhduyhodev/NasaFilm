import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Search, Edit2, Users, X, Loader2, Eye, EyeOff,
  ShieldAlert, CheckCircle, Ban, Shield, Star, Calendar,
  ChevronDown, UserX
} from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import Pagination from '../../../shared/components/Pagination';

const UsersPage = () => {
  const { addNotification } = useNotification();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [showPhone, setShowPhone] = useState(false);
  const [selectedUserForScore, setSelectedUserForScore] = useState(null);
  const [newScore, setNewScore] = useState(0);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUserService.getUsers();
      if (Array.isArray(data)) setUsersList(data);
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, roleFilter]);

  const handleStatusChange = async (userId, userEmail, newStatus) => {
    setUpdatingUserId(userId);
    try {
      await adminUserService.updateUserStatus(userId, newStatus);
      addNotification('Cập nhật người dùng thành công', `Cập nhật thành công trạng thái cho tài khoản: ${userEmail}`, 'success');
      fetchUsers();
    } catch (error) {
      addNotification('Cập nhật thất bại', error.message || 'Đã xảy ra lỗi khi cập nhật thông tin người dùng.', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleScoreChange = async (e) => {
    e.preventDefault();
    if (!selectedUserForScore) return;
    const scoreVal = parseInt(newScore, 10);
    if (isNaN(scoreVal) || scoreVal < 0) {
      addNotification('Lỗi', 'Điểm tích lũy phải là số nguyên lớn hơn hoặc bằng 0', 'error');
      return;
    }
    setIsUpdatingScore(true);
    try {
      await adminUserService.updateUserScore(selectedUserForScore.id, scoreVal);
      addNotification('Cập nhật thành công', `Cập nhật điểm thành công cho khách hàng: ${selectedUserForScore.fullName}`, 'success');
      setIsScoreModalOpen(false);
      setSelectedUserForScore(null);
      fetchUsers();
    } catch (error) {
      addNotification('Cập nhật thất bại', error.message || 'Đã xảy ra lỗi khi cập nhật điểm người dùng.', 'error');
    } finally {
      setIsUpdatingScore(false);
    }
  };

  const filteredUsers = usersList.filter((user) => {
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !normalizedSearch ||
      (user.fullName && user.fullName.toLowerCase().includes(normalizedSearch)) ||
      (user.email && user.email.toLowerCase().includes(normalizedSearch)) ||
      (user.phoneNumber && user.phoneNumber.includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || (user.roles && user.roles.includes(roleFilter));
    return matchesSearch && matchesStatus && matchesRole;
  });

  const stats = React.useMemo(() => ({
    total: usersList.length,
    customers: usersList.filter(u => u.roles?.includes('CUSTOMER')).length,
    staffAdmin: usersList.filter(u => u.roles?.includes('ADMIN') || u.roles?.includes('STAFF')).length,
    active: usersList.filter(u => u.status === 'ACTIVE').length,
    banned: usersList.filter(u => u.status === 'SUSPENDED').length,
  }), [usersList]);

  const paginatedUsers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const getStatusAccentColor = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-500';
    if (status === 'SUSPENDED') return 'bg-rose-500';
    if (status === 'PENDING_VERIFICATION') return 'bg-amber-400';
    return 'bg-zinc-500';
  };

  const getStatusLabel = (status) => {
    if (status === 'ACTIVE') return 'Hoạt động';
    if (status === 'SUSPENDED') return 'Bị khóa';
    if (status === 'INACTIVE') return 'Chưa kích hoạt';
    if (status === 'PENDING_VERIFICATION') return 'Chờ xác minh';
    return status;
  };

  const getStatusCls = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
    if (status === 'SUSPENDED') return 'bg-rose-500/10 border-rose-500/25 text-rose-400';
    if (status === 'PENDING_VERIFICATION') return 'bg-amber-500/10 border-amber-500/25 text-amber-400';
    return 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400';
  };

  const getStatusDot = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-400';
    if (status === 'SUSPENDED') return 'bg-rose-400';
    if (status === 'PENDING_VERIFICATION') return 'bg-amber-400';
    return 'bg-zinc-400';
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return '--';
    const date = new Date(createdAt);
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
  };

  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '--';
    if (showPhone) return phoneNumber;
    return phoneNumber.length >= 6 ? `${phoneNumber.slice(0,3)}....${phoneNumber.slice(-3)}` : '....';
  };

  const getRoleBadge = (user) => {
    if (user.roles?.includes('ADMIN')) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 border-rose-500/25 text-rose-400"><Shield className="w-2.5 h-2.5" />Quản trị viên</span>;
    } else if (user.roles?.includes('CUSTOMER')) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/25 text-blue-400"><User className="w-2.5 h-2.5" />Khách hàng</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/25 text-amber-400"><Shield className="w-2.5 h-2.5" />Nhân viên</span>;
  };

  const getMemberTierBadge = (user) => {
    if (!user.roles?.includes('CUSTOMER')) return null;
    const points = user.score || 0;
    if (points >= 10000) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]"><Star className="w-2.5 h-2.5 fill-amber-400" />NASA VIP</span>;
    if (points >= 5000) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 border-blue-500/30 text-blue-400"><Star className="w-2.5 h-2.5 fill-blue-400" />NASA FRIEND</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-800/60 border-gray-700 text-gray-400"><Star className="w-2.5 h-2.5" />NASA MEMBER</span>;
  };

  return (
    <>
      {/* PAGE HEADER */}
      <div className="mb-8 text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1.5">Quản Trị Hệ Thống Người Dùng</p>
        <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Khách Hàng</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-lg">Phân quyền tài khoản, giám sát điểm thưởng tích lũy và cập nhật trạng thái người dùng trên hệ thống.</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng Người Dùng', value: stats.total, Icon: Users, valueColor: 'text-white', iconColor: 'text-white' },
          { label: 'Đang Hoạt Động', value: stats.active, Icon: CheckCircle, valueColor: 'text-emerald-400', iconColor: 'text-emerald-400', glow: 'rgba(52,211,153,0.12)' },
          { label: 'Bị Khóa / Tạm Ngưng', value: stats.banned, Icon: Ban, valueColor: 'text-rose-400', iconColor: 'text-rose-400', glow: 'rgba(244,63,94,0.12)' },
          { label: 'Nhân Viên / Quản Trị', value: stats.staffAdmin, Icon: Shield, valueColor: 'text-purple-400', iconColor: 'text-purple-400', glow: 'rgba(167,139,250,0.12)' },
        ].map(({ label, value, Icon, valueColor, iconColor, glow }) => (
          <div key={label} className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between shadow-lg hover:border-[#243050] transition-colors duration-300 group">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">{label}</span>
              <span className={`text-3xl font-black ${valueColor} block leading-none`}>{value}</span>
            </div>
            <div className={`p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] ${iconColor} group-hover:scale-110 transition-transform duration-300`} style={glow ? { boxShadow: `0 0 20px ${glow}` } : {}}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-[#0B0F19]/70 border border-[#1A2238] rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="relative text-left">
            <button type="button" onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#243050] focus:outline-none transition-colors cursor-pointer min-w-[140px]">
              <span className="flex-1 text-left">
                {roleFilter === 'all' && 'Tất cả Vai trò'}
                {roleFilter === 'CUSTOMER' && 'Khách hàng'}
                {roleFilter === 'STAFF' && 'Nhân viên'}
                {roleFilter === 'ADMIN' && 'Quản trị viên'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isRoleFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isRoleFilterOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsRoleFilterOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-[#0B0F19] border border-[#1A2238] rounded-xl shadow-2xl z-50 p-1 space-y-0.5">
                  {[{ value: 'all', label: 'Tất cả Vai trò', dot: 'bg-gray-500' }, { value: 'CUSTOMER', label: 'Khách hàng', dot: 'bg-blue-400' }, { value: 'STAFF', label: 'Nhân viên', dot: 'bg-amber-400' }, { value: 'ADMIN', label: 'Quản trị viên', dot: 'bg-rose-400' }].map((o) => (
                    <button key={o.value} type="button" onClick={() => { setRoleFilter(o.value); setIsRoleFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${roleFilter === o.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${o.dot}`} />{o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative text-left">
            <button type="button" onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#243050] focus:outline-none transition-colors cursor-pointer min-w-[150px]">
              <span className="flex-1 text-left">
                {statusFilter === 'all' && 'Tất cả Trạng thái'}
                {statusFilter === 'ACTIVE' && 'Hoạt động'}
                {statusFilter === 'SUSPENDED' && 'Bị khóa'}
                {statusFilter === 'INACTIVE' && 'Chưa kích hoạt'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-[#0B0F19] border border-[#1A2238] rounded-xl shadow-2xl z-50 p-1 space-y-0.5">
                  {[{ value: 'all', label: 'Tất cả Trạng thái', dot: 'bg-gray-500' }, { value: 'ACTIVE', label: 'Hoạt động', dot: 'bg-emerald-500' }, { value: 'SUSPENDED', label: 'Bị khóa', dot: 'bg-rose-500' }, { value: 'INACTIVE', label: 'Chưa kích hoạt', dot: 'bg-gray-400' }].map((o) => (
                    <button key={o.value} type="button" onClick={() => { setStatusFilter(o.value); setIsFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${statusFilter === o.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${o.dot}`} />{o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Show Phone Toggle */}
          <button type="button" onClick={() => setShowPhone(!showPhone)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer ${showPhone ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-[#0F1322] border-[#1A2238] text-gray-400 hover:text-white hover:border-[#243050]'}`}>
            {showPhone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Hiện SĐT</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-600 font-mono ml-auto shrink-0">{filteredUsers.length} kết quả</span>
      </div>

      {/* USER CARD LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-500 font-semibold text-[10px] uppercase tracking-widest">Đang tải dữ liệu...</p>
        </div>
      ) : paginatedUsers.length > 0 ? (
        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl overflow-hidden shadow-2xl mb-4">
          {/* Column Header */}
          <div className="flex items-center border-b border-[#1A2238] bg-white/[0.02]">
            <div className="w-1 shrink-0" />
            <div className="w-64 shrink-0 px-6 py-3"><span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Người Dùng</span></div>
            <div className="w-44 shrink-0 px-6 py-3 border-l border-[#1A2238]/50"><span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Vai Trò / Hạng</span></div>
            <div className="w-36 shrink-0 px-6 py-3 border-l border-[#1A2238]/50"><span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Điểm Tích Lũy</span></div>
            <div className="flex-1 px-6 py-3 border-l border-[#1A2238]/50"><span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Trạng Thái & Hành Động</span></div>
          </div>

          {paginatedUsers.map((row, index) => {
            const isLastRows = index >= paginatedUsers.length - 3 && index >= 2;
            const isAdminOrStaff = row.roles && (row.roles.includes('ADMIN') || row.roles.includes('STAFF'));
            return (
              <div key={row.id} className="flex items-stretch border-b border-[#1A2238]/50 last:border-b-0 hover:bg-white/[0.012] transition-colors duration-200 group min-h-[100px]">
                {/* LEFT ACCENT BAR */}
                <div className={`w-1 shrink-0 self-stretch ${getStatusAccentColor(row.status)} opacity-60`} />

                {/* SECTION 1 - USER IDENTITY */}
                <div className="w-64 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden border-2 border-[#1A2238] flex items-center justify-center">
                    {row.avatarUrl ? (
                      <img src={normalizeAvatarUrl(row.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-purple-900/40 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors duration-200 leading-tight">{row.fullName || '--'}</span>
                      {row.authProvider === 'GOOGLE' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-bold uppercase tracking-wider border border-blue-500/20 shrink-0">G</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 break-all leading-tight mb-1">{row.email}</div>
                    <div className="text-xs text-gray-600 font-mono">{formatPhone(row.phoneNumber)}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Calendar className="w-2.5 h-2.5 text-gray-700 shrink-0" />
                      <span className="text-[10px] text-gray-600 font-mono">{formatDate(row.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 2 - ROLE + MEMBERSHIP */}
                <div className="w-44 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center gap-2">
                  {getRoleBadge(row)}
                  {row.roles?.includes('CUSTOMER') ? getMemberTierBadge(row) : <span className="text-[10px] text-gray-600">--</span>}
                </div>

                {/* SECTION 3 - POINTS */}
                <div className="w-36 shrink-0 px-6 py-5 border-r border-[#1A2238]/50 flex flex-col justify-center">
                  {row.roles?.includes('CUSTOMER') ? (
                    <>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Điểm Tích Lũy</span>
                      <span className="text-xl font-black text-amber-400 font-mono leading-none">{(row.score || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-gray-600 mt-0.5">điểm</span>
                    </>
                  ) : (
                    <span className="text-gray-700 text-sm">--</span>
                  )}
                </div>

                {/* SECTION 4 - STATUS + ACTIONS */}
                <div className="flex-1 px-6 py-5 flex flex-col justify-center gap-2.5">
                  {isAdminOrStaff ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border self-start ${getStatusCls(row.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`} />
                      {getStatusLabel(row.status)}
                    </span>
                  ) : (
                    <div className="relative inline-block text-left self-start">
                      <button
                        type="button"
                        disabled={updatingUserId === row.id}
                        onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                        className={`focus:outline-none border rounded-full px-2.5 py-1 text-[10px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${getStatusCls(row.status)}`}
                      >
                        {updatingUserId === row.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`} />
                        )}
                        <span>{getStatusLabel(row.status)}</span>
                        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${openStatusDropdownId === row.id ? 'rotate-180' : ''}`} />
                      </button>
                      {openStatusDropdownId === row.id && (
                        <>
                          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenStatusDropdownId(null)} />
                          <div className={`absolute right-0 w-40 bg-[#0B0F19] border border-[#1A2238] rounded-xl shadow-2xl z-50 p-1 space-y-0.5 ${isLastRows ? 'bottom-full mb-1 origin-bottom-right' : 'mt-1 top-full origin-top-right'}`}>
                            {[
                              { value: 'ACTIVE', label: 'Hoạt động', dot: 'bg-emerald-500' },
                              { value: 'SUSPENDED', label: 'Bị khóa', dot: 'bg-rose-500' },
                              { value: 'INACTIVE', label: 'Chưa kích hoạt', dot: 'bg-gray-400' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => { handleStatusChange(row.id, row.email, option.value); setOpenStatusDropdownId(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${row.status === option.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${option.dot}`} />{option.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {row.roles?.includes('CUSTOMER') && (
                    <button
                      type="button"
                      onClick={() => { setSelectedUserForScore(row); setNewScore(row.score || 0); setIsScoreModalOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/15 hover:border-amber-500/40 transition-all duration-200 cursor-pointer self-start"
                    >
                      <Edit2 className="w-3 h-3" />
                      Điều chỉnh điểm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl mb-4">
          <UserX className="w-14 h-14 text-gray-700" />
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Không tìm thấy người dùng nào</p>
          <p className="text-xs text-gray-600">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
        </div>
      )}

      {/* PAGINATION */}
      {filteredUsers.length > 0 && (
        <div className="rounded-xl bg-[#0B0F19]/70 border border-[#1A2238] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {/* SCORE MODAL */}
      {isScoreModalOpen && selectedUserForScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F1322] border border-[#1A2238] rounded-2xl shadow-2xl text-left overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2238]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">Cập nhật điểm</h2>
              </div>
              <button type="button" onClick={() => { setIsScoreModalOpen(false); setSelectedUserForScore(null); }} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleScoreChange} className="p-6 space-y-5">
              <div className="bg-[#0B0F19]/60 border border-[#1A2238] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-0.5">Khách hàng</p>
                <p className="text-sm font-bold text-white">{selectedUserForScore.fullName}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedUserForScore.email}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Điểm tích lũy mới</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500/50 transition-colors"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1A2238]">
                <button type="button" onClick={() => { setIsScoreModalOpen(false); setSelectedUserForScore(null); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#1A2238] text-gray-400 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={isUpdatingScore} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                  {isUpdatingScore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;
