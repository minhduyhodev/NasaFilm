import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Edit2,
  Users,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  Ban,
  Star,
  Calendar,
  UserX,
  ChevronDown,
  X,
  UserPlus,
} from "lucide-react";
import { adminUserService } from "../api/adminUserService";
import { notificationService } from "../../../shared/services/notificationService";
import UserAvatar from "../../../shared/components/UserAvatar";
import AdminModal from "../components/AdminModal";
import AdminUserFormPanel from "../components/panels/AdminUserFormPanel";
import { adminFilterSelectClass } from "../components/adminFormStyles";
import {
  AdminPage,
  PageHeader,
  AdminKpiGrid,
  FilterPills,
  StatusBadge,
  AdminTableShell,
} from "../components";
import { useConfirm } from "../../../shared/context/ConfirmDialogContext";
import "./UsersPage.css";

const UsersPage = () => {
  const confirm = useConfirm();
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visiblePhoneUserIds, setVisiblePhoneUserIds] = useState(new Set());
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    inactive: 0,
    vip: 0,
  });

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [scoreForm, setScoreForm] = useState("");
  const [statusForm, setStatusForm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminUserService.getUserStats();
      setStats({
        total: data?.total ?? 0,
        active: data?.active ?? 0,
        suspended: data?.suspended ?? 0,
        pending: data?.pending ?? 0,
        inactive: data?.inactive ?? 0,
        vip: data?.vip ?? 0,
      });
    } catch {
      // Keep previous stats on failure
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUserService.getUsers({
        query: debouncedSearch,
        status: statusFilter,
        page: currentPage - 1,
        size: itemsPerPage,
      });
      setUsersList(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.total || 0);
    } catch (error) {
      notificationService.error(
        error.message || "Không thể tải danh sách khách hàng.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, itemsPerPage]);

  const refreshUsers = useCallback(async () => {
    await Promise.all([fetchUsers(), fetchStats()]);
  }, [fetchUsers, fetchStats]);

  const handleStatusChange = async (userId, userEmail, newStatus) => {
    const statusLabels = {
      ACTIVE: 'Hoạt động',
      SUSPENDED: 'Bị khóa',
      INACTIVE: 'Không hoạt động',
    };
    const ok = await confirm({
      title: 'Thay đổi trạng thái tài khoản',
      message: `Xác nhận đổi trạng thái tài khoản khách hàng sang "${statusLabels[newStatus] || newStatus}"?`,
      highlight: userEmail,
      detail: newStatus === 'SUSPENDED'
        ? 'Khách hàng sẽ không thể đăng nhập cho đến khi được mở khóa.'
        : '',
      confirmLabel: 'Xác nhận thay đổi',
      variant: newStatus === 'SUSPENDED' ? 'danger' : 'warning',
    });
    if (!ok) return;

    setUpdatingUserId(userId);
    try {
      await adminUserService.updateUserStatus(userId, newStatus);
      notificationService.success(
        `Đã cập nhật trạng thái tài khoản: ${userEmail}`,
      );
      refreshUsers();
    } catch (error) {
      notificationService.error(
        error.message || "Lỗi khi cập nhật trạng thái.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenDetailModal = (user) => {
    setSelectedUser(user);
    setScoreForm(
      user.score !== undefined && user.score !== null
        ? String(user.score)
        : "0",
    );
    setStatusForm(user.status || "ACTIVE");
    setIsDetailModalOpen(true);
  };

  const handleSaveUserDetail = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const promises = [];
      let hasChanges = false;

      // Update score if changed
      const parsedScore = parseInt(scoreForm, 10);
      if (!isNaN(parsedScore) && parsedScore !== (selectedUser.score || 0)) {
        promises.push(
          adminUserService.updateUserScore(selectedUser.id, parsedScore),
        );
        hasChanges = true;
      }

      // Update status if changed
      if (statusForm !== selectedUser.status) {
        promises.push(
          adminUserService.updateUserStatus(selectedUser.id, statusForm),
        );
        hasChanges = true;
      }

      if (hasChanges) {
        const ok = await confirm({
          title: 'Lưu thay đổi tài khoản',
          message: 'Xác nhận cập nhật thông tin tài khoản khách hàng?',
          highlight: selectedUser.fullName || selectedUser.email,
          detail: [
            !isNaN(parsedScore) && parsedScore !== (selectedUser.score || 0)
              ? `Điểm thành viên: ${selectedUser.score || 0} → ${parsedScore}`
              : null,
            statusForm !== selectedUser.status
              ? `Trạng thái: ${getStatusLabel(selectedUser.status)} → ${getStatusLabel(statusForm)}`
              : null,
          ].filter(Boolean).join(' · '),
          confirmLabel: 'Lưu thay đổi',
          variant: statusForm === 'SUSPENDED' ? 'danger' : 'warning',
        });
        if (!ok) return;

        await Promise.all(promises);
        notificationService.success(
          `Đã lưu thay đổi cho tài khoản: ${selectedUser.fullName || selectedUser.email}`,
        );
        refreshUsers();
      }
      setIsDetailModalOpen(false);
    } catch (error) {
      notificationService.error(error.message || "Lỗi khi cập nhật thông tin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paginatedUsers = usersList;

  const getStatusLabel = (status) => {
    if (status === "ACTIVE") return "Hoạt động";
    if (status === "SUSPENDED") return "Bị khóa";
    if (status === "INACTIVE") return "Không hoạt động";
    if (status === "PENDING_VERIFICATION") return "Chờ xác thực";
    if (status === "BANNED") return "Bị cấm";
    if (status === "DELETED") return "Đã xóa";
    return status;
  };

  const getStatusVariant = (status) => {
    if (status === "ACTIVE") return "success";
    if (status === "SUSPENDED") return "danger";
    if (status === "PENDING_VERIFICATION") return "warning";
    if (status === "INACTIVE") return "muted";
    return "muted";
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return "--";
    const date = new Date(createdAt);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const togglePhoneVisibility = (userId) => {
    setVisiblePhoneUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getMemberTierBadge = (user) => {
    const points = user.score || 0;
    if (points >= 10000)
      return (
        <StatusBadge variant="warning">
          <Star className="w-2.5 h-2.5 fill-current" />
          NASA VIP
        </StatusBadge>
      );
    if (points >= 5000)
      return (
        <StatusBadge variant="info">
          <Star className="w-2.5 h-2.5 fill-current" />
          NASA FRIEND
        </StatusBadge>
      );
    return (
      <StatusBadge variant="muted">
        <Star className="w-2.5 h-2.5" />
        NASA MEMBER
      </StatusBadge>
    );
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Nhân sự & khách hàng"
        title="Danh sách khách hàng"
        description="Quản lý tài khoản khách hàng hội viên, giám sát điểm thưởng tích lũy và cập nhật trạng thái hoạt động."
        variant="display"
        primaryAction={{
          label: "Tạo khách hàng",
          onClick: () => setIsCreateModalOpen(true),
          icon: <UserPlus className="w-4 h-4" />,
        }}
      />

      <AdminKpiGrid
        items={[
          {
            label: "Tổng khách hàng",
            value: stats.total,
            badge: "trong hệ thống",
            icon: Users,
            color: "text-pink-400",
            kpiClass: "kpi-total",
          },
          {
            label: "Đang hoạt động",
            value: stats.active,
            badge: "tài khoản active",
            icon: CheckCircle,
            color: "text-emerald-400",
            kpiClass: "kpi-showing",
          },
          {
            label: "Tài khoản bị khóa",
            value: stats.suspended,
            badge: "đã tạm khóa",
            icon: Ban,
            color: "text-rose-400",
            kpiClass: "kpi-upcoming",
          },
          {
            label: "Hội viên VIP",
            value: stats.vip,
            badge: "từ 10.000 điểm",
            icon: Star,
            color: "text-amber-400",
            kpiClass: "kpi-hidden",
          },
        ]}
      />

      <AdminTableShell
        toolbar={(
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
            <div className="adm-toolbar__search max-w-md w-full">
              <Search className="adm-toolbar__search-icon" />
              <input
                className="adm-input"
                placeholder="Tìm theo tên, email, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <FilterPills
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { id: "all", label: "Tất cả" },
                { id: "ACTIVE", label: "Hoạt động" },
                { id: "PENDING_VERIFICATION", label: "Chờ xác thực" },
                { id: "INACTIVE", label: "Không hoạt động" },
                { id: "SUSPENDED", label: "Bị khóa" },
              ]}
              ariaLabel="Lọc trạng thái khách hàng"
            />
          </div>
        )}
        footer={totalElements > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <span className="adm-tabular">
              Trang {currentPage}/{totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="adm-btn adm-btn--ghost min-w-8 h-8 px-2"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="adm-btn adm-btn--ghost min-w-8 h-8 px-2"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      >
      {isLoading ? (
        <div className="adm-loading">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p>Đang tải danh sách khách hàng...</p>
        </div>
      ) : paginatedUsers.length > 0 ? (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Hạng hội viên</th>
                  <th>Điểm tích lũy</th>
                  <th>Trạng thái</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((row, index) => {
                  const isLastRow =
                    index >= paginatedUsers.length - 2 && index > 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <UserAvatar src={row.avatarUrl} name={row.fullName} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="adm-table__primary">
                                {row.fullName || "--"}
                              </span>
                              {row.authProvider === "GOOGLE" && (
                                <StatusBadge variant="muted">G</StatusBadge>
                              )}
                            </div>
                            <span className="adm-table__secondary">{row.email}</span>
                            {row.phoneNumber ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="adm-table__secondary !mt-0">
                                  {visiblePhoneUserIds.has(row.id)
                                    ? row.phoneNumber
                                    : row.phoneNumber.length >= 6
                                      ? `${row.phoneNumber.slice(0, 3)}....${row.phoneNumber.slice(-3)}`
                                      : "...."}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePhoneVisibility(row.id)}
                                  className="text-[var(--adm-text-dim)] hover:text-white transition-colors focus:outline-none p-0.5 cursor-pointer flex items-center justify-center bg-transparent border-0"
                                >
                                  {visiblePhoneUserIds.has(row.id) ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="adm-table__secondary">--</span>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-[var(--adm-text-dim)] text-[9px]">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span className="font-mono adm-tabular">
                                Ngày tạo: {formatDate(row.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{getMemberTierBadge(row)}</td>

                      <td>
                        <div className="flex flex-col">
                          <span className="text-base font-extrabold text-amber-500 adm-tabular">
                            {(row.score || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-[var(--adm-text-dim)] font-bold uppercase tracking-wider">
                            Điểm
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id}
                            onClick={() =>
                              setOpenStatusDropdownId(
                                openStatusDropdownId === row.id ? null : row.id,
                              )
                            }
                            className="inline-flex items-center gap-1.5 cursor-pointer transition-opacity disabled:opacity-85 bg-transparent border-0 p-0"
                          >
                            <StatusBadge variant={getStatusVariant(row.status)}>
                              {getStatusLabel(row.status)}
                              <ChevronDown
                                className={`w-3 h-3 transition-transform duration-200 ${openStatusDropdownId === row.id ? "rotate-180" : ""}`}
                              />
                            </StatusBadge>
                          </button>

                          {openStatusDropdownId === row.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setOpenStatusDropdownId(null)}
                              ></div>
                              <div
                                className={`absolute left-0 w-40 adm-dropdown ${isLastRow ? "bottom-full mb-1" : "mt-1 top-full"}`}
                              >
                                {[
                                  {
                                    value: "ACTIVE",
                                    label: "Hoạt động",
                                    variant: "success",
                                  },
                                  {
                                    value: "SUSPENDED",
                                    label: "Bị khóa",
                                    variant: "danger",
                                  },
                                  {
                                    value: "PENDING_VERIFICATION",
                                    label: "Chờ xác thực",
                                    variant: "warning",
                                  },
                                  {
                                    value: "INACTIVE",
                                    label: "Không hoạt động",
                                    variant: "muted",
                                  },
                                ].map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleStatusChange(
                                        row.id,
                                        row.email,
                                        opt.value,
                                      );
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={`adm-dropdown__item ${row.status === opt.value ? "adm-dropdown__item--active" : ""}`}
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
                          Chỉnh sửa
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
            Không tìm thấy khách hàng nào
          </p>
          <p className="text-xs">
            Thử thay đổi từ khóa hoặc bộ lọc của bạn.
          </p>
        </div>
      )}
      </AdminTableShell>

      {/* ==================== DETAIL EDIT MODAL ==================== */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDetailModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl p-6 text-left transform scale-100 transition-all duration-300 font-sans">
            <div className="flex justify-between items-center mb-5 border-b border-[#1A2238]/60 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Star className="w-4 h-4 text-amber-500" />
                Cập nhật thông tin Khách hàng
              </h2>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded hover:bg-white/5 border border-transparent text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#0B0F19] border border-[#1A2238] rounded-lg">
                <UserAvatar
                  src={selectedUser.avatarUrl}
                  name={selectedUser.fullName}
                />
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {selectedUser.fullName || "--"}
                  </h4>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                  Điểm tích lũy hội viên
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 font-mono"
                  value={scoreForm}
                  onChange={(e) => setScoreForm(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-mono">
                  Trạng thái hoạt động *
                </label>
                <select
                  className={`w-full ${adminFilterSelectClass} font-mono`}
                  value={statusForm}
                  onChange={(e) => setStatusForm(e.target.value)}
                >
                  <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                  <option value="PENDING_VERIFICATION">Chờ xác thực (PENDING)</option>
                  <option value="SUSPENDED">Khóa tài khoản (SUSPENDED)</option>
                  <option value="INACTIVE">Không hoạt động (INACTIVE)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#1A2238]/60 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0F1322] border border-[#1A2238] hover:bg-[#1a2238]/40 text-gray-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer font-mono"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserDetail}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black text-[10px] font-bold uppercase transition-all hover:bg-amber-600 cursor-pointer border-none font-mono flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo tài khoản khách hàng"
        subtitle="Hệ thống gửi email kích hoạt với mật khẩu tạm thời"
        size="lg"
      >
        <AdminUserFormPanel
          mode="CUSTOMER"
          onSuccess={() => {
            setIsCreateModalOpen(false);
            refreshUsers();
          }}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </AdminModal>
    </AdminPage>
  );
};

export default UsersPage;
