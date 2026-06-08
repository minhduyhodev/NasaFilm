import React, { useState, useEffect, useCallback } from 'react';
import { User, SlidersHorizontal, Search, Edit2, Users, Crown, Activity, X, Loader2 } from 'lucide-react';
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
  
  const [updatingUserId, setUpdatingUserId] = useState(null);

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
    },
    {
      label: 'ĐANG HOẠT ĐỘNG',
      value: activeUsers,
      sub: 'Tài khoản hoạt động bình thường',
      isGreen: true,
      Icon: Activity,
    },
    {
      label: 'ADMIN & NHÂN VIÊN',
      value: staffAndAdmins,
      sub: 'Ban quản trị hệ thống',
      isGreen: false,
      Icon: Crown,
    },
    {
      label: 'LIÊN KẾT GOOGLE',
      value: googleUsers,
      sub: 'Tài khoản đăng nhập nhanh',
      isGreen: false,
      Icon: User,
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
            <card.Icon className="absolute -right-4 -top-4 w-20 h-20 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />
            <div className="admin-stat-card-top">
              <p className="admin-stat-label">{card.label}</p>
              <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
            </div>
            <h3 className="admin-stat-value">{isLoading ? '...' : card.value}</h3>
            <p className={`${card.isGreen ? 'admin-stat-badge-green' : 'admin-stat-badge-muted'}`}>
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
          
          <div className="admin-action-group">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-action-btn focus:outline-none bg-[#161722] border border-white/5 rounded-xl text-sm text-[#8a8d9f]"
              style={{ appearance: 'none', paddingRight: '2rem', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238a8d9f\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="SUSPENDED">Bị khóa</option>
              <option value="INACTIVE">Chưa kích hoạt</option>
            </select>
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
                  <th className="pb-3">VAI TRÒ</th>
                  <th className="pb-3">SỐ ĐIỆN THOẠI</th>
                  <th className="pb-3">ĐIỂM TÍCH LŨY</th>
                  <th className="pb-3">NGÀY THAM GIA</th>
                  <th className="pb-3 text-right">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((row) => (
                  <tr key={row.id} className="admin-table-tr">
                    <td className="admin-table-td-user">
                      <div className="admin-user-icon-wrapper overflow-hidden animate-pulse-none">
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="admin-user-name">{row.fullName}</div>
                        <div className="admin-user-email">{row.email}</div>
                      </div>
                    </td>
                    <td className="admin-table-td-val">
                      <span className="text-xs font-bold text-slate-300">
                        {row.roles && row.roles.join(', ')}
                      </span>
                    </td>
                    <td className="admin-table-td-val text-[#8a8d9f] text-sm">
                      {row.phoneNumber || '—'}
                    </td>
                    <td className="admin-table-td-val text-yellow-400 text-sm">
                      {row.score} điểm
                    </td>
                    <td className="admin-table-td-active">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="admin-table-actions-td text-right">
                      <select
                        value={row.status}
                        onChange={(e) => handleStatusChange(row.id, row.email, e.target.value)}
                        disabled={updatingUserId === row.id}
                        className={`focus:outline-none bg-[#161722] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                          row.status === 'ACTIVE'
                            ? 'text-emerald-400 border-emerald-500/20'
                            : row.status === 'SUSPENDED'
                            ? 'text-rose-400 border-rose-500/20'
                            : 'text-slate-400 border-slate-500/20'
                        }`}
                      >
                        <option value="ACTIVE">Hoạt động</option>
                        <option value="SUSPENDED">Bị khóa</option>
                        <option value="INACTIVE">Chưa kích hoạt</option>
                        {row.status === 'PENDING_VERIFICATION' && (
                          <option value="PENDING_VERIFICATION">Chờ xác minh</option>
                        )}
                      </select>
                    </td>
                  </tr>
                ))}
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
