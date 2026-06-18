import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Search, Edit2, Users, Loader2, Eye, EyeOff,
  CheckCircle, Ban, Shield, Star, Calendar, UserX, ChevronDown, X
} from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import Pagination from '../../../shared/components/Pagination';
import './UsersPage.css';

const UsersPage = () => {
  const { addNotification } = useNotification();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [visiblePhoneUserIds, setVisiblePhoneUserIds] = useState(new Set());
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleForm, setRoleForm] = useState('');
  const [scoreForm, setScoreForm] = useState('');
  const [statusForm, setStatusForm] = useState('');
  const [isPhoneVisibleInModal, setIsPhoneVisibleInModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenDetailModal = (user) => {
    setSelectedUser(user);
    setRoleForm(user.roles?.[0] || 'CUSTOMER');
    setScoreForm(user.score !== undefined && user.score !== null ? String(user.score) : '0');
    setStatusForm(user.status || 'ACTIVE');
    setIsPhoneVisibleInModal(false);
    setIsDetailModalOpen(true);
  };

  const handleSaveUserDetail = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const promises = [];
      let hasChanges = false;

      // Update role if changed
      if (!selectedUser.roles?.includes(roleForm)) {
        promises.push(adminUserService.updateUserRole(selectedUser.id, roleForm));
        hasChanges = true;
      }

      // Update score if changed (only for CUSTOMER role)
      if (roleForm === 'CUSTOMER') {
        const parsedScore = parseInt(scoreForm, 10);
        if (!isNaN(parsedScore) && parsedScore !== (selectedUser.score || 0)) {
          promises.push(adminUserService.updateUserScore(selectedUser.id, parsedScore));
          hasChanges = true;
        }
      }

      // Update status if changed
      if (statusForm !== selectedUser.status) {
        promises.push(adminUserService.updateUserStatus(selectedUser.id, statusForm));
        hasChanges = true;
      }

      if (hasChanges) {
        await Promise.all(promises);
        addNotification(
          'Cập nhật thành công',
          `Đã cập nhật thông tin tài khoản: ${selectedUser.fullName || selectedUser.email}`,
          'success'
        );
        fetchUsers();
      }
      setIsDetailModalOpen(false);
    } catch (error) {
      addNotification(
        'Cập nhật thất bại',
        error.message || 'Đã xảy ra lỗi khi cập nhật thông tin.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
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

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

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

  const togglePhoneVisibility = (userId) => {
    setVisiblePhoneUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getRoleBadge = (user) => {
    if (user.roles?.includes('ADMIN')) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 border-rose-500/25 text-rose-400 font-sans">Quản trị viên</span>;
    } else if (user.roles?.includes('CUSTOMER')) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/25 text-blue-400 font-sans">Khách hàng</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/25 text-amber-400 font-sans">Nhân viên</span>;
  };

  const getMemberTierBadge = (user) => {
    if (!user.roles?.includes('CUSTOMER')) return null;
    const points = user.score || 0;
    if (points >= 10000) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-sans"><Star className="w-2.5 h-2.5 fill-amber-400" />NASA VIP</span>;
    if (points >= 5000) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 border-blue-500/30 text-blue-400 font-sans"><Star className="w-2.5 h-2.5 fill-blue-400" />NASA FRIEND</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-800/60 border-gray-700 text-gray-400 font-sans"><Star className="w-2.5 h-2.5" />NASA MEMBER</span>;
  };

  const roleOptions = [
    { value: 'all', label: 'Tất cả Vai trò' },
    { value: 'CUSTOMER', label: 'Khách hàng' },
    { value: 'STAFF', label: 'Nhân viên' },
    { value: 'ADMIN', label: 'Quản trị viên' }
  ];
  const currentRoleOpt = roleOptions.find(opt => opt.value === roleFilter) || roleOptions[0];

  const statusOptions = [
    { value: 'all', label: 'Tất cả Trạng thái', icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 shrink-0" /> },
    { value: 'ACTIVE', label: 'Hoạt động', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" /> },
    { value: 'SUSPENDED', label: 'Bị khóa', icon: <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shrink-0" /> },
    { value: 'INACTIVE', label: 'Chưa kích hoạt', icon: <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2 shrink-0" /> }
  ];
  const currentStatusOpt = statusOptions.find(opt => opt.value === statusFilter) || statusOptions[0];

  return (
    <div className="space-y-6 text-left">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Quản Trị Hệ Thống Người Dùng</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Khách Hàng</h1>
          <p className="text-sm text-gray-400 mt-2">Phân quyền tài khoản, giám sát điểm thưởng tích lũy và cập nhật trạng thái người dùng trên hệ thống.</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'TỔNG NGƯỜI DÙNG', value: stats.total, icon: Users, color: 'text-indigo-400', kpiClass: 'kpi-total' },
          { label: 'ĐANG HOẠT ĐỘNG', value: stats.active, icon: CheckCircle, color: 'text-emerald-400', kpiClass: 'kpi-active' },
          { label: 'BỊ KHÓA / TẠM NGƯNG', value: stats.banned, icon: Ban, color: 'text-rose-400', kpiClass: 'kpi-banned' },
          { label: 'NHÂN VIÊN / QUẢN TRỊ', value: stats.staffAdmin, icon: Shield, color: 'text-purple-400', kpiClass: 'kpi-staff' },
        ].map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-1 font-sans">
        <div className="relative w-full sm:w-72 font-sans">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            className="w-full rounded-lg bg-[#0f172a] border border-[#242d42] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors font-sans"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap font-sans sm:ml-auto">
          {/* Role Filter */}
          <div className="relative text-left z-30 font-sans">
            <button
              type="button"
              onClick={() => {
                setIsRoleDropdownOpen(!isRoleDropdownOpen);
                setIsStatusDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] border border-[#242d42] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#475569] focus:outline-none transition-all duration-200 cursor-pointer min-w-[140px] h-[34px] justify-between font-sans"
            >
              <span>{currentRoleOpt.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoleDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsRoleDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-1 w-40 bg-[#1c2333] border border-[#242d42] rounded-lg shadow-xl p-1.5 space-y-0.5 animate-dropdown-fade-in z-20 text-left">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRoleFilter(opt.value);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer ${roleFilter === opt.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 border border-transparent'}`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative text-left z-30 font-sans">
            <button
              type="button"
              onClick={() => {
                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                setIsRoleDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] border border-[#242d42] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#475569] focus:outline-none transition-all duration-200 cursor-pointer min-w-[160px] h-[34px] justify-between font-sans"
            >
              <span className="flex items-center font-sans">
                {currentStatusOpt.icon}
                <span>{currentStatusOpt.label}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsStatusDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-1 w-44 bg-[#1c2333] border border-[#242d42] rounded-lg shadow-xl p-1.5 space-y-0.5 animate-dropdown-fade-in z-20 text-left">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer ${statusFilter === opt.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 border border-transparent'}`}
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
      </div>

      {/* USER TABLE */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-[#1c2333]/50 border border-[#242d42] rounded-2xl">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-widest font-sans">Đang tải dữ liệu...</p>
        </div>
      ) : paginatedUsers.length > 0 ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#242d42]">
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Người Dùng</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Vai Trò / Hạng</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">Điểm Tích Lũy</th>
                <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((row, index) => {
                const isAdminOrStaff = row.roles && (row.roles.includes('ADMIN') || row.roles.includes('STAFF'));
                const isLastRow = index >= paginatedUsers.length - 2 && index > 0;
                return (
                  <tr key={row.id} className="border-b border-[#242d42]/30 hover:bg-white/[0.01] transition-colors duration-150 font-sans">
                    {/* USER IDENTITY */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 font-sans">
                        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-[#242d42] flex items-center justify-center">
                          {row.avatarUrl ? (
                            <img src={normalizeAvatarUrl(row.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-purple-900/40 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap font-sans">
                            <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors duration-200 font-sans">{row.fullName || '--'}</span>
                            {row.authProvider === 'GOOGLE' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-gray-300 shrink-0 font-sans">
                                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                </svg>
                                Google
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 break-all leading-tight font-sans">{row.email}</div>
                          {row.phoneNumber ? (
                            <div className="flex items-center gap-1.5 mt-0.5 font-sans">
                              <span className="text-[11px] text-gray-500 font-sans">
                                {visiblePhoneUserIds.has(row.id)
                                  ? row.phoneNumber
                                  : row.phoneNumber.length >= 6
                                  ? `${row.phoneNumber.slice(0, 3)}....${row.phoneNumber.slice(-3)}`
                                  : '....'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePhoneVisibility(row.id)}
                                className="text-gray-500 hover:text-white transition-colors focus:outline-none p-0.5 cursor-pointer flex items-center justify-center"
                                title={visiblePhoneUserIds.has(row.id) ? "Ẩn số điện thoại" : "Hiện số điện thoại"}
                              >
                                {visiblePhoneUserIds.has(row.id) ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500 mt-0.5 font-sans">--</div>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-gray-600 text-[9px] font-sans">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            <span className="font-sans">{formatDate(row.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ROLE + MEMBERSHIP */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start font-sans">
                        {getRoleBadge(row)}
                        {row.roles?.includes('CUSTOMER') && getMemberTierBadge(row)}
                      </div>
                    </td>

                    {/* POINTS */}
                    <td className="px-6 py-4">
                      {row.roles?.includes('CUSTOMER') ? (
                        <div className="flex flex-col font-sans">
                          <span className="text-base font-extrabold text-amber-400 font-sans">{(row.score || 0).toLocaleString()}</span>
                          <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider font-sans">điểm</span>
                        </div>
                      ) : (
                        <span className="text-gray-700 text-xs font-sans">--</span>
                      )}
                    </td>

                    {/* STATUS + ACTIONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 font-sans">
                        {isAdminOrStaff ? (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border font-sans ${getStatusCls(row.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`} />
                            {getStatusLabel(row.status)}
                          </span>
                        ) : (
                          <div className="relative inline-block text-left font-sans">
                            <button
                              type="button"
                              disabled={updatingUserId === row.id}
                              onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border font-sans cursor-pointer transition-all duration-200 focus:outline-none hover:bg-white/[0.04] ${getStatusCls(row.status)}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`} />
                              <span>{getStatusLabel(row.status)}</span>
                              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${openStatusDropdownId === row.id ? 'rotate-180' : ''}`} />
                            </button>

                            {openStatusDropdownId === row.id && (
                              <>
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenStatusDropdownId(null)}></div>
                                <div className={`absolute right-0 w-36 bg-[#1c2333] border border-[#242d42] rounded-lg shadow-xl p-1 space-y-0.5 z-50 animate-dropdown-fade-in text-left ${isLastRow ? 'bottom-full mb-1' : 'mt-1 top-full'}`}>
                                  {[
                                    { value: 'ACTIVE', label: 'Hoạt động', dot: 'bg-emerald-400', cls: 'text-emerald-400 hover:bg-emerald-500/10' },
                                    { value: 'SUSPENDED', label: 'Bị khóa', dot: 'bg-rose-400', cls: 'text-rose-400 hover:bg-rose-500/10' },
                                    { value: 'INACTIVE', label: 'Chưa kích hoạt', dot: 'bg-zinc-400', cls: 'text-zinc-400 hover:bg-zinc-500/10' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        handleStatusChange(row.id, row.email, opt.value);
                                        setOpenStatusDropdownId(null);
                                      }}
                                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[10px] font-bold transition-all duration-200 cursor-pointer ${opt.cls} ${row.status === opt.value ? 'bg-[#0f172a] border-[#242d42]' : 'border border-transparent'}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                      <span>{opt.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 gap-3 bg-[#1c2333]/50 border border-[#242d42] rounded-2xl mb-4 font-sans">
          <UserX className="w-14 h-14 text-gray-700" />
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400 font-sans">Không tìm thấy người dùng nào</p>
          <p className="text-xs text-gray-600 font-sans">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
        </div>
      )}

      {/* PAGINATION / TABLE FOOTER */}
      {filteredUsers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
};

export default UsersPage;
