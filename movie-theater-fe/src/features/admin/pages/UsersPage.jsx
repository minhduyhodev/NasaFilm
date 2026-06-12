import React, { useState, useEffect, useCallback } from 'react';
import { User, SlidersHorizontal, Search, Edit2, Users, Crown, Activity, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import './UsersPage.css';

const UsersPage = () => {
  const { addNotification } = useNotification();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [showPhoneNumbers, setShowPhoneNumbers] = useState(false);

  // Fetch users from Backend
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUserService.getUsers();
      if (Array.isArray(data)) {
        setUsersList(data);
      }
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Status Change
  const handleStatusChange = async (userId, userEmail, newStatus) => {
    setUpdatingUserId(userId);
    try {
      await adminUserService.updateUserStatus(userId, newStatus);
      addNotification(
        'Cập nhật người dùng thành công',
        `Cập nhật thành công trạng thái cho tài khoản: ${userEmail}`,
        'success'
      );
      fetchUsers(); // Refresh list
    } catch (error) {
      addNotification(
        'Cập nhật thất bại',
        error.message || 'Đã xảy ra lỗi khi cập nhật thông tin người dùng.',
        'error'
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Calculate stats dynamically based on database contents
  const customerUsers = usersList.filter((u) => u.roles && u.roles.includes('CUSTOMER'));
  const totalUsers = customerUsers.length;
  const activeUsers = customerUsers.filter((u) => u.status === 'ACTIVE').length;
  const staffAndAdmins = usersList.filter((u) => u.roles && (u.roles.includes('STAFF') || u.roles.includes('ADMIN'))).length;
  const googleUsers = customerUsers.filter((u) => u.authProvider === 'GOOGLE').length;

  const cards = [
    {
      label: 'TỔNG KHÁCH HÀNG',
      value: totalUsers,
      sub: 'Tài khoản khách hàng đã đăng ký',
      isGreen: true,
      Icon: Users,
      color: 'text-indigo-500',
      bgIcon: 'text-indigo-500/10 group-hover:text-indigo-500/20 group-hover:scale-105',
    },
    {
      label: 'ĐANG HOẠT ĐỘNG',
      value: activeUsers,
      sub: 'Tài khoản hoạt động bình thường',
      isGreen: true,
      Icon: Activity,
      color: 'text-emerald-500',
      bgIcon: 'text-emerald-500/10 group-hover:text-emerald-500/20 group-hover:scale-105',
    },
    {
      label: 'ADMIN & NHÂN VIÊN',
      value: staffAndAdmins,
      sub: 'Ban quản trị hệ thống',
      isGreen: false,
      Icon: Crown,
      color: 'text-amber-500',
      bgIcon: 'text-amber-500/10 group-hover:text-amber-500/20 group-hover:scale-105',
    },
    {
      label: 'LIÊN KẾT GOOGLE',
      value: googleUsers,
      sub: 'Tài khoản đăng nhập nhanh',
      isGreen: false,
      Icon: User,
      color: 'text-sky-500',
      bgIcon: 'text-sky-500/10 group-hover:text-sky-500/20 group-hover:scale-105',
    },
  ];

  // Local filtering logic
  const filteredUsers = usersList.filter((user) => {
    // Only display users with CUSTOMER role
    const isCustomer = user.roles && user.roles.includes('CUSTOMER');
    if (!isCustomer) return false;

    // 1. Search Query filter (checks fullName, email, phoneNumber)
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !normalizedSearch ||
      (user.fullName && user.fullName.toLowerCase().includes(normalizedSearch)) ||
      (user.email && user.email.toLowerCase().includes(normalizedSearch)) ||
      (user.phoneNumber && user.phoneNumber.includes(normalizedSearch));

    // 2. Status filter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">TÀI KHOẢN NGƯỜI DÙNG</p>
          <h1 className="admin-title">Quản lý Khách hàng</h1>
          <p className="admin-description">
            Xem xét các hạng thành viên, theo dõi người dùng đang hoạt động và giám sát hoạt động đăng ký tài khoản của khách hàng.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card group">
            <card.Icon className={`absolute -right-4 -top-4 w-20 h-20 transition-all duration-300 z-0 ${card.bgIcon}`} strokeWidth={1} />
            <div className="admin-stat-card-top relative z-10">
              <p className="admin-stat-label">{card.label}</p>
              <card.Icon className={`w-5 h-5 ${card.color}`} strokeWidth={2} />
            </div>
            <h3 className="admin-stat-value relative z-10 mt-1">{isLoading ? '...' : card.value}</h3>
            <p className={`relative z-10 ${card.isGreen ? 'admin-stat-badge-green' : 'admin-stat-badge-muted'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="admin-action-group relative">
            {/* Custom Animated Status Filter Dropdown */}
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="admin-action-btn flex items-center justify-between gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 focus:outline-none transition-all duration-200 cursor-pointer min-w-[175px]"
            >
              <span>
                {statusFilter === 'all' && 'Tất cả Trạng thái'}
                {statusFilter === 'ACTIVE' && 'Hoạt động'}
                {statusFilter === 'SUSPENDED' && 'Bị khóa'}
                {statusFilter === 'INACTIVE' && 'Chưa kích hoạt'}
              </span>
              <span className={`material-symbols-outlined text-gray-400 text-base transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            
            {isFilterDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsFilterDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-12 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-1.5 origin-top-right transition-all duration-300 animate-dropdown-fade-in space-y-0.5">
                  {[
                    { value: 'all', label: 'Tất cả Trạng thái', color: 'bg-gray-400' },
                    { value: 'ACTIVE', label: 'Hoạt động', color: 'bg-emerald-500' },
                    { value: 'SUSPENDED', label: 'Bị khóa', color: 'bg-rose-500' },
                    { value: 'INACTIVE', label: 'Chưa kích hoạt', color: 'bg-gray-400' }
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
                          ? 'bg-red-50 text-red-600' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
              <p className="text-[#8a8d9f] text-sm font-medium">Đang tải danh sách người dùng...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr className="admin-table-thead-tr">
                  <th className="pb-3">KHÁCH HÀNG</th>
                  <th className="pb-3 text-center">HẠNG THÀNH VIÊN</th>
                  <th className="pb-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>SỐ ĐIỆN THOẠI</span>
                      <button
                        type="button"
                        onClick={() => setShowPhoneNumbers(!showPhoneNumbers)}
                        className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors duration-200 cursor-pointer inline-flex items-center justify-center focus:outline-none"
                        title={showPhoneNumbers ? "Ẩn số điện thoại" : "Hiện số điện thoại"}
                      >
                        {showPhoneNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </th>
                  <th className="pb-3 text-center">ĐIỂM TÍCH LŨY</th>
                  <th className="pb-3 text-center">NGÀY THAM GIA</th>
                  <th className="pb-3 text-center">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((row, index) => {
                  // Dynamic Member Tier calculation
                  const getMemberTier = (score) => {
                    const points = score || 0;
                    if (points >= 1000) return { label: 'VIP Member', class: 'bg-amber-500/10 border-amber-500/20 text-amber-600' };
                    if (points >= 500) return { label: 'Gold Member', class: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600' };
                    if (points >= 100) return { label: 'Silver Member', class: 'bg-slate-400/10 border-slate-400/20 text-slate-600' };
                    return { label: 'Standard', class: 'bg-gray-100 border-gray-200 text-gray-500' };
                  };
                  const tier = getMemberTier(row.score);
                  const isLastRow = index >= filteredUsers.length - 2 && index > 0;

                  return (
                    <tr key={row.id} className="admin-table-tr">
                      <td className="admin-table-td-user">
                        <div className="admin-user-icon-wrapper overflow-hidden">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="admin-user-name flex items-center gap-1.5">
                            {row.fullName}
                            {row.authProvider === 'GOOGLE' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase tracking-wider border border-blue-100 shrink-0">
                                Google
                              </span>
                            )}
                          </div>
                          <div className="admin-user-email">{row.email}</div>
                        </div>
                      </td>
                      <td className="admin-table-td-val text-center py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tier.class}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="admin-table-td-val text-center text-[#6e7191] font-semibold text-sm py-4">
                        {row.phoneNumber ? (
                          showPhoneNumbers ? (
                            row.phoneNumber
                          ) : row.phoneNumber.length >= 6 ? (
                            `${row.phoneNumber.slice(0, 3)}••••${row.phoneNumber.slice(-3)}`
                          ) : (
                            '••••'
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="admin-table-td-val text-center py-4">
                        <span className="font-mono text-gray-800 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md text-xs font-bold">
                          {row.score || 0}
                        </span>
                        <span className="text-gray-400 text-xs font-normal ml-1">Pts</span>
                      </td>
                      <td className="admin-table-td-active text-center text-gray-500 font-semibold text-xs py-4">
                        {row.createdAt ? (() => {
                          const date = new Date(row.createdAt);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = date.getMonth() + 1;
                          const year = date.getFullYear();
                          return `${day} thg ${month}, ${year}`;
                        })() : '—'}
                      </td>
                      <td className="text-center py-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id}
                            onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                            className={`focus:outline-none border rounded-full px-3.5 py-1 text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1.5 ${
                              row.status === 'ACTIVE'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
                                : row.status === 'SUSPENDED'
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/70'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-500' : row.status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-gray-400'}`} />
                            <span>
                              {row.status === 'ACTIVE' && 'Hoạt động'}
                              {row.status === 'SUSPENDED' && 'Bị khóa'}
                              {row.status === 'INACTIVE' && 'Chưa kích hoạt'}
                              {row.status === 'PENDING_VERIFICATION' && 'Chờ xác minh'}
                            </span>
                            <span className={`material-symbols-outlined text-[11px] text-current transition-transform duration-200 ${openStatusDropdownId === row.id ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>
                          
                          {openStatusDropdownId === row.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={() => setOpenStatusDropdownId(null)}
                              />
                              <div className={`absolute right-0 w-44 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-1 transition-all duration-300 space-y-0.5 ${
                                isLastRow 
                                  ? 'bottom-full mb-1.5 origin-bottom-right animate-dropdown-fade-in-up' 
                                  : 'mt-1.5 top-full origin-top-right animate-dropdown-fade-in'
                              }`}>
                                {[
                                  { value: 'ACTIVE', label: 'Hoạt động', color: 'bg-emerald-500' },
                                  { value: 'SUSPENDED', label: 'Bị khóa', color: 'bg-rose-500' },
                                  { value: 'INACTIVE', label: 'Chưa kích hoạt', color: 'bg-gray-400' },
                                  ...(row.status === 'PENDING_VERIFICATION' ? [{ value: 'PENDING_VERIFICATION', label: 'Chờ xác minh', color: 'bg-amber-500' }] : [])
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      handleStatusChange(row.id, row.email, option.value);
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all duration-200 cursor-pointer ${
                                      row.status === option.value 
                                        ? 'bg-red-50 text-red-600' 
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20">
              <Users className="mx-auto text-slate-700 mb-3" size={40} />
              <p className="text-sm text-[#8a8d9f]">Không tìm thấy khách hàng nào phù hợp với bộ lọc tìm kiếm.</p>
            </div>
          )}
        </div>
      </div>


    </>
  );
};

export default UsersPage;
