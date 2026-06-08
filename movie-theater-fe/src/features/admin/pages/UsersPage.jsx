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
  
  // Edit user modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('CUSTOMER');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handle Edit button click
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditRole(user.roles && user.roles.length > 0 ? user.roles[0] : 'CUSTOMER');
    setEditStatus(user.status || 'ACTIVE');
  };

  // Handle Edit Submit
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      const originalRole = selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0] : 'CUSTOMER';
      const originalStatus = selectedUser.status || 'ACTIVE';

      // 1. Update status if changed
      if (editStatus !== originalStatus) {
        await adminUserService.updateUserStatus(selectedUser.id, editStatus);
      }

      // 2. Update role if changed
      if (editRole !== originalRole) {
        await adminUserService.updateUserRole(selectedUser.id, editRole);
      }

      addNotification(
        'Cập nhật người dùng thành công',
        `Cập nhật thành công vai trò/trạng thái cho tài khoản: ${selectedUser.email}`,
        'success'
      );
      setSelectedUser(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      addNotification(
        'Cập nhật thất bại',
        error.message || 'Đã xảy ra lỗi khi cập nhật thông tin người dùng.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats dynamically based on database contents
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.status === 'ACTIVE').length;
  const staffAndAdmins = usersList.filter((u) => u.roles.includes('STAFF') || u.roles.includes('ADMIN')).length;
  const googleUsers = usersList.filter((u) => u.authProvider === 'GOOGLE').length;

  const cards = [
    {
      label: 'TOTAL USERS',
      value: totalUsers,
      sub: 'Total registered accounts',
      isGreen: true,
      Icon: Users,
    },
    {
      label: 'ACTIVE NOW',
      value: activeUsers,
      sub: 'Accounts in Active status',
      isGreen: true,
      Icon: Activity,
    },
    {
      label: 'ADMIN & STAFF',
      value: staffAndAdmins,
      sub: 'System administrators',
      isGreen: false,
      Icon: Crown,
    },
    {
      label: 'GOOGLE SIGN-IN',
      value: googleUsers,
      sub: 'Google OAuth accounts',
      isGreen: false,
      Icon: User,
    },
  ];

  // Local filtering logic
  const filteredUsers = usersList.filter((user) => {
    // 1. Search Query filter (checks fullName, email, phoneNumber)
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !normalizedSearch ||
      (user.fullName && user.fullName.toLowerCase().includes(normalizedSearch)) ||
      (user.email && user.email.toLowerCase().includes(normalizedSearch)) ||
      (user.phoneNumber && user.phoneNumber.includes(normalizedSearch));

    // 2. Status filter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    // 3. Role filter
    const matchesRole = roleFilter === 'all' || (user.roles && user.roles.includes(roleFilter));

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">USER ACCOUNTS</p>
          <h1 className="admin-title">Manage Customers</h1>
          <p className="admin-description">
            Review membership tiers, track active users, and monitor account registration activity across the full customer base.
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
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="admin-action-group">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="admin-action-btn focus:outline-none bg-[#161722] border border-white/5 rounded-xl text-sm text-[#8a8d9f]"
              style={{ appearance: 'none', paddingRight: '2rem', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238a8d9f\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-action-btn focus:outline-none bg-[#161722] border border-white/5 rounded-xl text-sm text-[#8a8d9f]"
              style={{ appearance: 'none', paddingRight: '2rem', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238a8d9f\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="admin-table-container">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-[#8a8d9f] text-sm font-medium">Loading user list...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr className="admin-table-thead-tr">
                  <th className="pb-3">USER</th>
                  <th className="pb-3">ROLES</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3">PHONE NUMBER</th>
                  <th className="pb-3">SCORE</th>
                  <th className="pb-3">JOINED DATE</th>
                  <th className="pb-3 text-right">ACTION</th>
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
                    <td className="py-4 pr-6">
                      <span
                        className={
                          row.status === 'ACTIVE'
                            ? 'admin-badge-active'
                            : row.status === 'SUSPENDED'
                            ? 'admin-badge-suspended'
                            : 'admin-badge-inactive'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="admin-table-td-val text-[#8a8d9f] text-sm">
                      {row.phoneNumber || '—'}
                    </td>
                    <td className="admin-table-td-val text-yellow-400 text-sm">
                      {row.score} pts
                    </td>
                    <td className="admin-table-td-active">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="admin-table-actions-td">
                      <div className="admin-table-actions-group">
                        <button 
                          onClick={() => handleOpenEdit(row)}
                          className="admin-btn-edit" 
                          title="Edit Status & Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20">
              <Users className="mx-auto text-slate-700 mb-3" size={40} />
              <p className="text-sm text-[#8a8d9f]">No users found matching search filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal Dialog */}
      {selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-container">
            {/* Modal Header */}
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Edit User Permissions</h3>
              <button 
                onClick={() => setSelectedUser(null)} 
                disabled={isSubmitting}
                className="admin-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="admin-modal-body">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-[#8a8d9f]" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">{selectedUser.fullName}</h4>
                  <p className="text-xs text-[#6e7191] mt-0.5">{selectedUser.email}</p>
                </div>
              </div>

              {/* Edit Role Select */}
              <div className="admin-form-group">
                <label className="admin-form-label">User Role</label>
                <div className="admin-form-input-wrapper">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="admin-form-select focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <option value="CUSTOMER">CUSTOMER (Khách hàng)</option>
                    <option value="STAFF">STAFF (Nhân viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>
              </div>

              {/* Edit Status Select */}
              <div className="admin-form-group">
                <label className="admin-form-label">Account Status</label>
                <div className="admin-form-input-wrapper">
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="admin-form-select focus:outline-none"
                    disabled={isSubmitting}
                  >
                    <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                    <option value="SUSPENDED">SUSPENDED (Đình chỉ)</option>
                    <option value="INACTIVE">INACTIVE (Chưa kích hoạt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="admin-modal-footer">
              <button 
                onClick={() => setSelectedUser(null)} 
                disabled={isSubmitting}
                className="admin-modal-cancel-btn"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEdit} 
                disabled={isSubmitting}
                className="admin-modal-save-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersPage;
