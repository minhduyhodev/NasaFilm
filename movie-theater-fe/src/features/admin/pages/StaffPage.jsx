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
import { AdminPage, PageHeader, AdminKpiGrid, FilterPills, StatusBadge, AdminTableShell } from '../components';
import Pagination from '../../../shared/components/Pagination';
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
  const [itemsPerPage, _setItemsPerPage] = useState(10);
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

  const getStatusVariant = (status) => {
    if (status === 'ACTIVE') return 'success';
    if (status === 'SUSPENDED') return 'danger';
    return 'muted';
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

      <AdminTableShell
        toolbar={(
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 w-full">
            <div className="adm-toolbar__search max-w-md w-full">
              <Search className="adm-toolbar__search-icon" />
              <input
                className="adm-input"
                placeholder="Tìm theo tên, email, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPills
                value={roleFilter}
                onChange={setRoleFilter}
                items={[
                  { id: 'all', label: 'Tất cả vai trò' },
                  { id: 'STAFF', label: 'Staff' },
                  { id: 'ADMIN', label: 'Admin' },
                ]}
                ariaLabel="Lọc vai trò"
              />
              <FilterPills
                value={statusFilter}
                onChange={setStatusFilter}
                items={[
                  { id: 'all', label: 'Tất cả trạng thái' },
                  { id: 'ACTIVE', label: 'Hoạt động' },
                  { id: 'SUSPENDED', label: 'Bị khóa' },
                ]}
                ariaLabel="Lọc trạng thái"
              />
            </div>
          </div>
        )}
        footer={filteredStaff.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredStaff.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        ) : null}
      >
      {isLoading ? (
        <div className="adm-loading">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p>Đang tải dữ liệu nhân sự...</p>
        </div>
      ) : paginatedStaff.length > 0 ? (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Số điện thoại</th>
                  <th>Quyền hạn</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStaff.map((row, index) => {
                  const isSelf = row.id === currentUser?.id;
                  const isLastRow = index >= paginatedStaff.length - 2 && index > 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <UserAvatar src={row.avatarUrl} name={row.fullName} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="adm-table__primary">{row.fullName || '--'}</span>
                              {isSelf && <StatusBadge variant="info">Tài khoản của bạn</StatusBadge>}
                            </div>
                            <span className="adm-table__secondary">{row.email}</span>
                            <div className="flex items-center gap-1 mt-1 text-[var(--adm-text-dim)] text-[9px]">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span className="font-mono adm-tabular">Ngày tạo: {formatDate(row.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="font-mono text-xs">{row.phoneNumber || '--'}</td>

                      <td>
                        {row.roles?.includes('ADMIN') ? (
                          <StatusBadge variant="accent">ADMINISTRATOR</StatusBadge>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge variant="info">STAFF MEMBER</StatusBadge>
                            <span className="text-[10px] text-[var(--adm-text-dim)]">
                              {(row.permissions || []).length} quyền chi tiết
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id || isSelf}
                            onClick={() => setOpenStatusDropdownId(openStatusDropdownId === row.id ? null : row.id)}
                            className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed bg-transparent border-0 p-0"
                          >
                            <StatusBadge variant={getStatusVariant(row.status)}>
                              {getStatusLabel(row.status)}
                              {!isSelf && (
                                <ChevronDown className={`w-3 h-3 transition-transform ${openStatusDropdownId === row.id ? 'rotate-180' : ''}`} />
                              )}
                            </StatusBadge>
                          </button>

                          {openStatusDropdownId === row.id && (
                            <>
                              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenStatusDropdownId(null)}></div>
                              <div className={`absolute left-0 w-36 adm-dropdown ${isLastRow ? 'bottom-full mb-1' : 'mt-1 top-full'}`}>
                                {[
                                  { value: 'ACTIVE', label: 'Hoạt động', variant: 'success' },
                                  { value: 'SUSPENDED', label: 'Bị khóa', variant: 'danger' },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleStatusChange(row.id, row.email, opt.value);
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={`adm-dropdown__item ${row.status === opt.value ? 'adm-dropdown__item--active' : ''}`}
                                  >
                                    <StatusBadge variant={opt.variant}>{opt.label}</StatusBadge>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(row)}
                          className="adm-btn adm-btn--ghost inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Sửa quyền
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
      ) : (
        <div className="adm-empty">
          <UserX className="w-14 h-14 opacity-40" />
          <p className="text-sm font-bold text-[var(--adm-text)]">
            {staffAndAdmins.length === 0
              ? 'Chưa có tài khoản nhân sự'
              : 'Không khớp bộ lọc hiện tại'}
          </p>
          <p className="text-xs">
            {staffAndAdmins.length === 0
              ? 'Bấm “Thêm nhân sự” để tạo tài khoản Staff/Admin.'
              : 'Thử xóa từ khóa hoặc chọn lại Vai trò / Trạng thái.'}
          </p>
        </div>
      )}
      </AdminTableShell>

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
