import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Edit2, Users, Loader2,
  CheckCircle, Ban, Shield, Calendar, UserX, ChevronDown, X, UserPlus, ShieldAlert
} from 'lucide-react';
import { adminUserService } from '../api/adminUserService';
import { notificationService } from '../../../shared/services/notificationService';
import UserAvatar from '../../../shared/components/UserAvatar';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import AdminModal from '../components/AdminModal';
import AdminUserFormPanel from '../components/panels/AdminUserFormPanel';
import { adminFilterSelectClass } from '../components/adminFormStyles';
import { AdminPage, PageHeader, AdminKpiGrid } from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const StaffPage = () => {
  const confirm = useConfirm();
  const { user: currentUser } = useAuthContext();
  const [usersList, setUsersList] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Modals and drop-downs
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleForm, setRoleForm] = useState('');
  const [statusForm, setStatusForm] = useState('');
  const [permissionForm, setPermissionForm] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUserService.getUsers({
        audience: 'STAFF',
        page: 0,
        size: 500,
      });
      setUsersList(data.items || []);
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải danh sách nhân sự.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    adminUserService.getPermissions()
      .then((data) => setAvailablePermissions(Array.isArray(data) ? data : []))
      .catch(() => setAvailablePermissions([]));
  }, []);

  const normalizeRoles = (roles) => {
    if (!Array.isArray(roles)) return [];
    return roles
      .map((role) => {
        if (typeof role === 'string') return role;
        if (role && typeof role === 'object') return role.name || role.roleName || '';
        return '';
      })
      .filter(Boolean)
      .map((role) => String(role).replace(/^ROLE_/i, '').toUpperCase());
  };

  const normalizeStatus = (status) => {
    if (status == null) return '';
    if (typeof status === 'string') return status.toUpperCase();
    if (typeof status === 'object' && status.name) return String(status.name).toUpperCase();
    return String(status).toUpperCase();
  };

  const handleStatusChange = async (userId, userEmail, newStatus) => {
    if (userId === currentUser?.id && newStatus === 'SUSPENDED') {
      notificationService.warning('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    const statusLabels = {
      ACTIVE: 'Hoạt động',
      SUSPENDED: 'Bị khóa',
    };
    const ok = await confirm({
      title: 'Thay đổi trạng thái nhân viên',
      message: `Xác nhận đổi trạng thái tài khoản sang "${statusLabels[newStatus] || newStatus}"?`,
      highlight: userEmail,
      detail: newStatus === 'SUSPENDED'
        ? 'Nhân viên sẽ không thể đăng nhập cho đến khi được mở khóa.'
        : '',
      confirmLabel: 'Xác nhận thay đổi',
      variant: newStatus === 'SUSPENDED' ? 'danger' : 'warning',
    });
    if (!ok) return;

    setUpdatingUserId(userId);
    try {
      await adminUserService.updateUserStatus(userId, newStatus);
      notificationService.success(`Đã cập nhật trạng thái tài khoản: ${userEmail}`);
      fetchUsers();
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi cập nhật trạng thái.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenDetailModal = (user) => {
    setSelectedUser(user);
    const roles = normalizeRoles(user.roles);
    setRoleForm(roles[0] || 'STAFF');
    setStatusForm(normalizeStatus(user.status) || 'ACTIVE');
    setPermissionForm(user.permissions || []);
    setIsDetailModalOpen(true);
  };

  const handleSaveUserDetail = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser?.id && roleForm !== 'ADMIN') {
      notificationService.warning('Bạn không thể tự hạ quyền ADMIN của chính mình!');
      return;
    }
    if (selectedUser.id === currentUser?.id && roleForm === 'STAFF' && !currentUser?.roles?.includes('admin')) {
      notificationService.warning('Chỉ quản trị viên mới được chỉnh quyền chi tiết');
      return;
    }
    setIsSubmitting(true);
    try {
      const promises = [];
      let hasChanges = false;

      // Update role if changed
      if (!normalizeRoles(selectedUser.roles).includes(roleForm)) {
        promises.push(adminUserService.updateUserRole(selectedUser.id, roleForm));
        hasChanges = true;
      }

      // Update status if changed
      if (statusForm !== normalizeStatus(selectedUser.status)) {
        promises.push(adminUserService.updateUserStatus(selectedUser.id, statusForm));
        hasChanges = true;
      }

      if (roleForm === 'STAFF') {
        const originalPermissions = [...(selectedUser.permissions || [])].sort().join('|');
        const nextPermissions = [...permissionForm].sort().join('|');
        if (originalPermissions !== nextPermissions) {
          promises.push(adminUserService.updateUserPermissions(selectedUser.id, permissionForm));
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const roleChanged = !normalizeRoles(selectedUser.roles).includes(roleForm);
        const statusChanged = statusForm !== normalizeStatus(selectedUser.status);
        const permissionsChanged = roleForm === 'STAFF'
          && [...(selectedUser.permissions || [])].sort().join('|') !== [...permissionForm].sort().join('|');

        const ok = await confirm({
          title: 'Lưu thay đổi nhân viên',
          message: 'Xác nhận cập nhật vai trò, quyền hạn hoặc trạng thái tài khoản?',
          highlight: selectedUser.fullName || selectedUser.email,
          detail: [
            roleChanged ? `Vai trò → ${roleForm}` : null,
            statusChanged ? `Trạng thái → ${statusForm === 'SUSPENDED' ? 'Bị khóa' : 'Hoạt động'}` : null,
            permissionsChanged ? 'Cập nhật danh sách quyền chi tiết' : null,
          ].filter(Boolean).join(' · '),
          confirmLabel: 'Lưu thay đổi',
          variant: statusForm === 'SUSPENDED' || roleChanged ? 'danger' : 'warning',
        });
        if (!ok) return;

        await Promise.all(promises);

        const updatedPermissions = permissionsChanged ? permissionForm : (selectedUser.permissions || []);

        setSelectedUser((prev) => prev ? { ...prev, permissions: updatedPermissions } : prev);

        notificationService.success(`Đã lưu thay đổi cho tài khoản: ${selectedUser.fullName || selectedUser.email}`);
        await fetchUsers();
      }
      setIsDetailModalOpen(false);
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi cập nhật thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // API audience=STAFF đã lọc sẵn; normalize role để không nuốt user khi format role lệch
  const staffAndAdmins = React.useMemo(() => {
    return (usersList || []).filter((user) => {
      const roles = normalizeRoles(user.roles);
      if (roles.length === 0) return true;
      return roles.includes('STAFF') || roles.includes('ADMIN');
    });
  }, [usersList]);

  const filteredStaff = React.useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().trim();
    return staffAndAdmins.filter((user) => {
      const roles = normalizeRoles(user.roles);
      const status = normalizeStatus(user.status);
      const matchesSearch =
        !normalizedSearch ||
        (user.fullName && user.fullName.toLowerCase().includes(normalizedSearch)) ||
        (user.email && user.email.toLowerCase().includes(normalizedSearch)) ||
        (user.phoneNumber && user.phoneNumber.includes(normalizedSearch));
      const matchesStatus = statusFilter === 'all' || status === String(statusFilter).toUpperCase();
      const matchesRole = roleFilter === 'all' || roles.includes(String(roleFilter).toUpperCase());
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [staffAndAdmins, searchQuery, statusFilter, roleFilter]);

  const stats = React.useMemo(() => ({
    total: staffAndAdmins.length,
    admins: staffAndAdmins.filter((u) => normalizeRoles(u.roles).includes('ADMIN')).length,
    staff: staffAndAdmins.filter((u) => normalizeRoles(u.roles).includes('STAFF')).length,
    active: staffAndAdmins.filter((u) => normalizeStatus(u.status) === 'ACTIVE').length,
    suspended: staffAndAdmins.filter((u) => normalizeStatus(u.status) === 'SUSPENDED').length,
  }), [staffAndAdmins]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage) || 1);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStaff = React.useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredStaff.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage, totalPages]);

  const getStatusLabel = (status) => {
    if (status === 'ACTIVE') return 'Hoạt động';
    if (status === 'SUSPENDED') return 'Bị khóa';
    if (status === 'INACTIVE') return 'Chưa kích hoạt';
    return status;
  };

  const getStatusCls = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
    if (status === 'SUSPENDED') return 'bg-rose-500/10 border-rose-500/25 text-rose-400';
    return 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400';
  };

  const getStatusDot = (status) => {
    if (status === 'ACTIVE') return 'bg-emerald-400';
    if (status === 'SUSPENDED') return 'bg-rose-400';
    return 'bg-zinc-400';
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return '--';
    const date = new Date(createdAt);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const togglePermission = (permissionName) => {
    setPermissionForm((prev) => {
      const next = new Set(prev);
      if (next.has(permissionName)) next.delete(permissionName);
      else next.add(permissionName);
      return Array.from(next);
    });
  };

  const permissionGroups = availablePermissions.reduce((acc, permission) => {
    const group = permission.group || 'Khác';
    if (!acc[group]) acc[group] = [];
    acc[group].push(permission);
    return acc;
  }, {});

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Nhân sự & khách hàng"
        title="Quản lý nhân sự"
        description="Quản lý quyền hạn tài khoản nhân viên (Staff) và quản trị viên (Admin), tạm khóa hoặc kích hoạt tài khoản nhân sự."
        variant="display"
        primaryAction={{
          label: 'Thêm nhân sự',
          onClick: () => setIsStaffModalOpen(true),
          icon: <UserPlus className="w-4 h-4" />,
        }}
      />

      <AdminKpiGrid
        items={[
          {
            label: 'Tổng nhân sự',
            value: stats.total,
            badge: 'trong hệ thống',
            icon: Users,
            color: 'text-pink-400',
            kpiClass: 'kpi-total',
          },
          {
            label: 'Đang hoạt động',
            value: stats.active,
            badge: 'tài khoản active',
            icon: CheckCircle,
            color: 'text-emerald-400',
            kpiClass: 'kpi-showing',
          },
          {
            label: 'Tài khoản bị khóa',
            value: stats.suspended,
            badge: 'đã tạm khóa',
            icon: Ban,
            color: 'text-rose-400',
            kpiClass: 'kpi-upcoming',
          },
          {
            label: 'Quản trị viên',
            value: stats.admins,
            badge: 'tài khoản admin',
            icon: ShieldAlert,
            color: 'text-purple-400',
            kpiClass: 'kpi-hidden',
          },
        ]}
      />

      {/* FILTER TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 p-1 font-sans">
        <div className="relative w-full md:max-w-sm md:flex-1 font-sans">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5 pointer-events-none" />
          <input
            className="w-full rounded-lg bg-[#0B0F19] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-slate-500/60 transition-colors font-sans"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-nowrap font-sans md:ml-auto shrink-0">
          <select
            className={`${adminFilterSelectClass} font-mono`}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Lọc theo vai trò"
          >
            <option value="all">Tất cả Vai trò</option>
            <option value="STAFF">Nhân viên (STAFF)</option>
            <option value="ADMIN">Quản trị viên (ADMIN)</option>
          </select>

          <select
            className={`${adminFilterSelectClass} font-mono`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="SUSPENDED">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* USER TABLE */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-[#0F1322] border border-[#1A2238] rounded-xl">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-widest font-sans">Đang tải dữ liệu nhân sự...</p>
        </div>
      ) : paginatedStaff.length > 0 ? (
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-[#1A2238]">
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono align-middle">Nhân Sự</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono align-middle">Số Điện Thoại</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono align-middle">Quyền Hạn</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono align-middle">Trạng Thái</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono text-center align-middle">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((row, index) => {
                  const isSelf = row.id === currentUser?.id;
                  const isLastRow = index >= paginatedStaff.length - 2 && index > 0;
                  return (
                    <tr key={row.id} className="border-b border-[#1A2238]/40 hover:bg-white/[0.01] transition-colors duration-150 font-sans">
                      {/* IDENTITY */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3 font-sans">
                          <UserAvatar src={row.avatarUrl} name={row.fullName} />
                          <div className="min-w-0 flex-1 font-sans">
                            <div className="flex items-center gap-1.5 flex-wrap font-sans">
                              <span className="text-xs font-bold text-white font-sans">{row.fullName || '--'}</span>
                              {isSelf && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[8px] font-bold text-blue-400 uppercase font-mono shrink-0">
                                  Tài khoản của bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 break-all leading-tight font-sans">{row.email}</div>
                            <div className="flex items-center gap-1 mt-1 text-gray-500 text-[9px] font-sans">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span className="font-mono">Ngày tạo: {formatDate(row.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="px-6 py-4 text-xs text-gray-300 font-mono align-middle">
                        {row.phoneNumber || '--'}
                      </td>

                      {/* ROLE */}
                      <td className="px-6 py-4 align-middle">
                        {row.roles?.includes('ADMIN') ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-rose-500/10 border-rose-500/20 text-rose-400 font-mono">
                            ADMINISTRATOR
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-mono">
                              STAFF MEMBER
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {(row.permissions || []).length} quyền chi tiết
                            </span>
                          </div>
                        )}
                      </td>

                      {/* STATUS + QUICK TOGGLE */}
                      <td className="px-6 py-4 align-middle">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id || isSelf}
                            onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono cursor-pointer transition-all duration-200 focus:outline-none hover:bg-white/[0.04] disabled:opacity-85 disabled:cursor-not-allowed ${getStatusCls(row.status)}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`} />
                            <span>{getStatusLabel(row.status)}</span>
                            {!isSelf && <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${openStatusDropdownId === row.id ? 'rotate-180' : ''}`} />}
                          </button>

                          {openStatusDropdownId === row.id && (
                            <>
                              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenStatusDropdownId(null)}></div>
                              <div className={`absolute left-0 w-36 bg-[#0B0F19] border border-[#1A2238] rounded-lg shadow-xl p-1 space-y-0.5 z-50 text-left ${isLastRow ? 'bottom-full mb-1' : 'mt-1 top-full'}`}>
                                {[
                                  { value: 'ACTIVE', label: 'Hoạt động', dot: 'bg-emerald-400', cls: 'text-emerald-400 hover:bg-emerald-500/10' },
                                  { value: 'SUSPENDED', label: 'Bị khóa', dot: 'bg-rose-400', cls: 'text-rose-400 hover:bg-rose-500/10' }
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleStatusChange(row.id, row.email, opt.value);
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[10px] font-bold transition-all duration-200 cursor-pointer ${opt.cls} ${row.status === opt.value ? 'bg-[#0f172a]' : 'border border-transparent'}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                    <span>{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(row)}
                            className="h-9 px-3 bg-[#1A2238] hover:bg-[#2C3B5E] text-gray-300 hover:text-white rounded-lg transition duration-200 cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold border-none font-mono"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Sửa quyền
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 gap-3 bg-[#0F1322] border border-[#1A2238] rounded-xl mb-4 font-sans">
          <UserX className="w-14 h-14 text-gray-700" />
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400 font-sans">
            {staffAndAdmins.length === 0
              ? 'Chưa có tài khoản nhân sự'
              : 'Không khớp bộ lọc hiện tại'}
          </p>
          <p className="text-xs text-gray-600 font-sans">
            {staffAndAdmins.length === 0
              ? 'Bấm “Thêm nhân sự” để tạo tài khoản Staff/Admin.'
              : 'Thử xóa từ khóa hoặc chọn lại Vai trò / Trạng thái.'}
          </p>
        </div>
      )}

      {/* PAGINATION */}
      {filteredStaff.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-2 border-t border-[#1A2238]/60 font-sans">
          <span className="text-[13px] text-gray-400 font-medium font-sans">
            Trang {currentPage}/{totalPages}
          </span>

          <div className="flex items-center gap-1.5 font-sans">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 bg-[#0B0F19] hover:bg-[#1A2238] border border-[#1A2238] text-gray-300 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer min-w-8 h-8 flex items-center justify-center font-sans"
            >
              ‹
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 bg-[#0B0F19] hover:bg-[#1A2238] border border-[#1A2238] text-gray-300 hover:text-white rounded-lg text-sm font-bold transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer min-w-8 h-8 flex items-center justify-center font-sans"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* ==================== EDIT ROLE & STATUS MODAL ==================== */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative w-full max-w-md max-h-[85vh] bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl text-left transform scale-100 transition-all duration-300 font-sans flex flex-col">
            <div className="flex justify-between items-center px-6 pt-6 pb-3 border-b border-[#1A2238]/60 shrink-0">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Shield className="w-4 h-4 text-amber-500" />
                Cập nhật Quyền & Trạng Thái Nhân Sự
              </h2>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded hover:bg-white/5 border border-transparent text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              <div className="flex items-center gap-3 p-3 bg-[#0B0F19] border border-[#1A2238] rounded-lg">
                <UserAvatar src={selectedUser.avatarUrl} name={selectedUser.fullName} />
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{selectedUser.fullName || '--'}</h4>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{selectedUser.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Phân quyền tài khoản *</label>
                <select
                  disabled={selectedUser.id === currentUser?.id}
                  className={`w-full ${adminFilterSelectClass} font-mono`}
                  value={roleForm}
                  onChange={(e) => setRoleForm(e.target.value)}
                >
                  <option value="STAFF">Nhân Viên (STAFF)</option>
                  <option value="ADMIN">Quản Trị Viên (ADMIN)</option>
                </select>
                {selectedUser.id === currentUser?.id && (
                  <p className="text-[9px] text-amber-500 mt-1 font-mono">Bạn không thể tự hạ quyền của chính mình.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">Trạng thái vận hành *</label>
                <select
                  disabled={selectedUser.id === currentUser?.id}
                  className={`w-full ${adminFilterSelectClass} font-mono`}
                  value={statusForm}
                  onChange={(e) => setStatusForm(e.target.value)}
                >
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="SUSPENDED">Khóa tài khoản (SUSPENDED)</option>
                </select>
              </div>

              {roleForm === 'STAFF' && (
                <div className="rounded-lg border border-[#1A2238] bg-[#0B0F19] p-3 max-h-72 overflow-y-auto">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-mono">Quyền chi tiết</label>
                  <div className="space-y-3">
                    {Object.entries(permissionGroups).map(([group, permissions]) => (
                      <div key={group}>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1.5 font-mono">{group}</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {permissions.map((permission) => (
                            <label key={permission.name} className="flex items-start gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[11px] text-gray-300 cursor-pointer hover:border-white/20">
                              <input
                                type="checkbox"
                                checked={permissionForm.includes(permission.name)}
                                onChange={() => togglePermission(permission.name)}
                                className="mt-0.5"
                              />
                              <span>
                                <span className="block font-bold text-white">{permission.description}</span>
                                <span className="block text-[9px] font-mono text-gray-500">{permission.name}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#1A2238]/60 flex gap-2 justify-end shrink-0 bg-[#0F1322]">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-9 px-4 rounded-lg bg-[#0F1322] border border-[#1A2238] hover:bg-[#1a2238]/40 text-gray-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-mono flex items-center justify-center"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveUserDetail}
                disabled={isSubmitting}
                className="h-9 px-4 rounded-lg bg-amber-500 text-black text-[10px] font-bold uppercase transition-all hover:bg-amber-600 cursor-pointer border-none font-mono flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Thêm nhân sự"
        subtitle="Tạo tài khoản nhân viên mới"
        size="lg"
      >
        <AdminUserFormPanel
          mode="STAFF"
          initialPermissions={availablePermissions}
          onSuccess={() => {
            setIsStaffModalOpen(false);
            fetchUsers();
          }}
          onCancel={() => setIsStaffModalOpen(false)}
        />
      </AdminModal>
    </AdminPage>
  );
};

export default StaffPage;
