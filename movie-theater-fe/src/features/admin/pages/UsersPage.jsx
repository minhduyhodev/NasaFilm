import React, { useState, useEffect, useCallback } from 'react';
import { User, SlidersHorizontal, Search, Edit2, Users, Crown, Activity, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import './UsersPage.css';

const UsersPage = () => {
  const { addNotification } = useNotification();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [showPhoneNumbers, setShowPhoneNumbers] = useState(false);
  const [selectedUserForScore, setSelectedUserForScore] = useState(null);
  const [newScore, setNewScore] = useState(0);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);

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

  // Handle Score Change
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
      addNotification(
        'Cập nhật thành công',
        `Cập nhật điểm thành công cho khách hàng: ${selectedUserForScore.fullName}`,
        'success'
      );
      setIsScoreModalOpen(false);
      setSelectedUserForScore(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      addNotification(
        'Cập nhật thất bại',
        error.message || 'Đã xảy ra lỗi khi cập nhật điểm người dùng.',
        'error'
      );
    } finally {
      setIsUpdatingScore(false);
    }
  };

  // Calculate stats dynamically based on database contents
  const customerUsers = usersList.filter((u) => u.roles && u.roles.includes('CUSTOMER'));
  const totalUsers = customerUsers.length;
  const activeUsers = customerUsers.filter((u) => u.status === 'ACTIVE').length;
  const staffAndAdmins = usersList.filter((u) => u.roles && (u.roles.includes('STAFF') || u.roles.includes('ADMIN'))).length;
  const googleUsers = customerUsers.filter((u) => u.authProvider === 'GOOGLE').length;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Quản lý Khách hàng</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tổng khách hàng: <span className="text-white font-bold">{totalUsers}</span> · 
            Hoạt động: <span className="text-emerald-400 font-bold">{activeUsers}</span> · 
            Staff & Admin: <span className="text-amber-400 font-bold">{staffAndAdmins}</span> · 
            Liên kết Google: <span className="text-sky-400 font-bold">{googleUsers}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-[#1A2238]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-300 text-xs font-semibold hover:text-white hover:bg-white/5 focus:outline-none transition-colors cursor-pointer min-w-[150px] text-left"
            >
              <span>
                {statusFilter === 'all' && 'Tất cả Trạng thái'}
                {statusFilter === 'ACTIVE' && 'Hoạt động'}
                {statusFilter === 'SUSPENDED' && 'Bị khóa'}
                {statusFilter === 'INACTIVE' && 'Chưa kích hoạt'}
              </span>
              <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            
            {isFilterDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsFilterDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-[#0B0F19] border border-[#1A2238] rounded-lg shadow-xl z-50 p-1 space-y-0.5 animate-dropdown-fade-in text-left">
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
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
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

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Đang tải dữ liệu...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                  <th className="py-2.5 px-4 text-left">Khách hàng</th>
                  <th className="py-2.5 px-4 text-center">Hạng thành viên</th>
                  <th className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>SỐ ĐIỆN THOẠI</span>
                      <button
                        type="button"
                        onClick={() => setShowPhoneNumbers(!showPhoneNumbers)}
                        className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer inline-flex items-center justify-center focus:outline-none"
                        title={showPhoneNumbers ? "Ẩn số điện thoại" : "Hiện số điện thoại"}
                      >
                        {showPhoneNumbers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-center">Điểm tích lũy</th>
                  <th className="py-2.5 px-4 text-center">Ngày tham gia</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2238]/40">
                {filteredUsers.map((row, index) => {
                  const getMemberTier = (score) => {
                    const points = score || 0;
                    if (points >= 10000) return { label: "NASA'VIP", class: 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]' };
                    return { label: "NASA'FRIEND", class: 'bg-gray-800/60 border-gray-700 text-gray-400' };
                  };
                  const tier = getMemberTier(row.score);
                  const isLastRow = index >= filteredUsers.length - 2 && index > 0;

                  return (
                    <tr key={row.id} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="overflow-hidden w-8 h-8 rounded-full bg-black/40 border border-[#1A2238] flex items-center justify-center shrink-0">
                            {row.avatarUrl ? (
                              <img src={normalizeAvatarUrl(row.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-white font-bold text-sm leading-tight group-hover:text-red-500 transition-colors duration-200 flex items-center gap-1.5">
                              {row.fullName}
                              {row.authProvider === 'GOOGLE' && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-bold uppercase tracking-wider border border-blue-500/20 shrink-0">
                                  Google
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${tier.class}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="text-center text-gray-300 font-mono py-2.5 px-4">
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
                      <td className="text-center py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-white bg-black/40 border border-[#1A2238] px-1.5 py-0.5 rounded text-[11px] font-bold">
                            {row.score || 0}
                          </span>
                          <span className="text-gray-400 text-xs font-normal">Pts</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForScore(row);
                              setNewScore(row.score || 0);
                              setIsScoreModalOpen(true);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer inline-flex items-center justify-center focus:outline-none"
                            title="Sửa điểm tích lũy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="text-center text-gray-400 font-semibold py-2.5 px-4">
                        {row.createdAt ? (() => {
                          const date = new Date(row.createdAt);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = date.getMonth() + 1;
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })() : '—'}
                      </td>
                      <td className="text-center py-2.5 px-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id}
                            onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                            className={`focus:outline-none border rounded-full px-2.5 py-0.5 text-[10px] font-bold transition duration-200 cursor-pointer flex items-center gap-1 ${
                              row.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : row.status === 'SUSPENDED'
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20'
                            }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-400' : row.status === 'SUSPENDED' ? 'bg-rose-400' : 'bg-zinc-400'}`} />
                            <span>
                              {row.status === 'ACTIVE' && 'Hoạt động'}
                              {row.status === 'SUSPENDED' && 'Bị khóa'}
                              {row.status === 'INACTIVE' && 'Chưa kích hoạt'}
                              {row.status === 'PENDING_VERIFICATION' && 'Chờ xác minh'}
                            </span>
                            <span className="text-[9px] opacity-75">▼</span>
                          </button>
                          
                          {openStatusDropdownId === row.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={() => setOpenStatusDropdownId(null)}
                              />
                              <div className={`absolute right-0 w-36 bg-[#0B0F19] border border-[#1A2238] rounded-lg shadow-xl z-50 p-0.5 transition-all duration-300 space-y-0.5 ${
                                isLastRow 
                                  ? 'bottom-full mb-1 origin-bottom-right animate-dropdown-fade-in-up' 
                                  : 'mt-1 top-full origin-top-right animate-dropdown-fade-in'
                              }`}>
                                {[
                                  { value: 'ACTIVE', label: 'Hoạt động', color: 'bg-emerald-500' },
                                  { value: 'SUSPENDED', label: 'Bị khóa', color: 'bg-rose-500' },
                                  { value: 'INACTIVE', label: 'Chưa kích hoạt', color: 'bg-gray-400' }
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      handleStatusChange(row.id, row.email, option.value);
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                                      row.status === option.value 
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                        : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                                    }`}
                                  >
                                    <span className={`w-1 h-1 rounded-full ${option.color}`} />
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
              <Users className="mx-auto text-gray-500 mb-3" size={36} />
              <p className="text-xs text-gray-400">Không tìm thấy khách hàng nào phù hợp với bộ lọc tìm kiếm.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cập nhật Điểm */}
      {isScoreModalOpen && selectedUserForScore && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md animate-dropdown-fade-in">
            <div className="modal-header">
              <h2 className="modal-title">Cập nhật điểm</h2>
              <button
                type="button"
                onClick={() => {
                  setIsScoreModalOpen(false);
                  setSelectedUserForScore(null);
                }}
                className="modal-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleScoreChange} className="space-y-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Khách hàng: <strong className="text-white">{selectedUserForScore.fullName}</strong>
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Email: {selectedUserForScore.email}
                </p>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Điểm tích lũy mới
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl bg-[#0B1020] border border-[#1A2238] px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#1A2238]">
                <button
                  type="button"
                  onClick={() => {
                    setIsScoreModalOpen(false);
                    setSelectedUserForScore(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#1A2238] text-gray-300 text-sm font-semibold hover:text-white hover:bg-white/5 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingScore}
                  className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingScore && <Loader2 className="w-4 h-4 animate-spin" />}
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
