import React, { useState, useEffect, useCallback } from 'react';
import { User, Search, Edit2, Users, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import './UsersPage.css';

const UsersPage = () => {
  const { addNotification } = useNotification();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter States
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

  // Filter all users (Customers, Staff, Admin)
  const filteredUsers = usersList.filter((user) => {
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !normalizedSearch ||
      (user.fullName && user.fullName.toLowerCase().includes(normalizedSearch)) ||
      (user.email && user.email.toLowerCase().includes(normalizedSearch)) ||
      (user.phoneNumber && user.phoneNumber.includes(normalizedSearch));

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    const matchesRole =
      roleFilter === 'all' ||
      (user.roles && user.roles.includes(roleFilter));

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getRoleBadge = (user) => {
    const isCustomer = user.roles && user.roles.includes('CUSTOMER');
    const isAdmin = user.roles && user.roles.includes('ADMIN');
    
    if (isCustomer) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/20 text-blue-400">
          Khách hàng
        </span>
      );
    } else if (isAdmin) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-red-500/10 border-red-500/30 text-red-400">
          Quản trị viên
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400">
          Nhân viên
        </span>
      );
    }
  };

  const getMemberTierBadge = (user) => {
    const isCustomer = user.roles && user.roles.includes('CUSTOMER');
    if (!isCustomer) {
      return <span className="text-gray-500">—</span>;
    }
    const points = user.score || 0;
    if (points >= 10000) {
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
          NASA'VIP
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-gray-800/60 border-gray-700 text-gray-400">
        NASA'FRIEND
      </span>
    );
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Quản lý Khách hàng và Nhân viên</h1>
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
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-300 text-xs font-semibold hover:text-white hover:bg-white/5 focus:outline-none transition-colors cursor-pointer min-w-[150px] text-left"
              >
                <span>
                  {roleFilter === 'all' && 'Tất cả Vai trò'}
                  {roleFilter === 'CUSTOMER' && 'Khách hàng'}
                  {roleFilter === 'STAFF' && 'Nhân viên'}
                  {roleFilter === 'ADMIN' && 'Quản trị viên'}
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform duration-300 ${isRoleFilterOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              {isRoleFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsRoleFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-[#0B0F19] border border-[#1A2238] rounded-lg shadow-xl z-50 p-1 space-y-0.5 animate-dropdown-fade-in text-left">
                    {[
                      { value: 'all', label: 'Tất cả Vai trò', color: 'bg-gray-400' },
                      { value: 'CUSTOMER', label: 'Khách hàng', color: 'bg-blue-400' },
                      { value: 'STAFF', label: 'Nhân viên', color: 'bg-amber-400' },
                      { value: 'ADMIN', label: 'Quản trị viên', color: 'bg-red-400' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setRoleFilter(option.value);
                          setIsRoleFilterOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          roleFilter === option.value 
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

            {/* Status Filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] text-gray-300 text-xs font-semibold hover:text-white hover:bg-white/5 focus:outline-none transition-colors cursor-pointer min-w-[150px] text-left"
              >
                <span>
                  {statusFilter === 'all' && 'Tất cả Trạng thái'}
                  {statusFilter === 'ACTIVE' && 'Hoạt động'}
                  {statusFilter === 'SUSPENDED' && 'Bị khóa'}
                  {statusFilter === 'INACTIVE' && 'Chưa kích hoạt'}
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              {isFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsFilterOpen(false)}
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
                          setIsFilterOpen(false);
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Đang tải dữ liệu...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                  <th className="py-2.5 px-4 text-left">Người dùng</th>
                  <th className="py-2.5 px-4 text-center">Vai trò</th>
                  <th className="py-2.5 px-4 text-center">Hạng thành viên</th>
                  <th className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>SỐ ĐIỆN THOẠI</span>
                      <button
                        type="button"
                        onClick={() => setShowPhone(!showPhone)}
                        className="p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer inline-flex items-center justify-center focus:outline-none"
                        title={showPhone ? "Ẩn số điện thoại" : "Hiện số điện thoại"}
                      >
                        {showPhone ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
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
                  const isLastRow = index >= filteredUsers.length - 3 && index >= 2;

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
                        {getRoleBadge(row)}
                      </td>
                      <td className="text-center py-2.5 px-4">
                        {getMemberTierBadge(row)}
                      </td>
                      <td className="text-center text-gray-300 font-mono py-2.5 px-4">
                        {row.phoneNumber ? (
                          showPhone ? (
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
                        {row.roles && row.roles.includes('CUSTOMER') ? (
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
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
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
              <p className="text-xs text-gray-400">Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm.</p>
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
                <p className="text-sm text-gray-500 mb-2">
                  Khách hàng: <strong className="text-gray-900">{selectedUserForScore.fullName}</strong>
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Email: {selectedUserForScore.email}
                </p>
                <label className="form-label">
                  Điểm tích lũy mới
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsScoreModalOpen(false);
                    setSelectedUserForScore(null);
                  }}
                  className="btn-cancel"
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
