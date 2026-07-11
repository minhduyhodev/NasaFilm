import React, { useState, useEffect, useCallback } from "react";
import {
  User,
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
import Pagination from "../../../shared/components/Pagination";
import AdminModal from "../components/AdminModal";
import AdminUserFormPanel from "../components/panels/AdminUserFormPanel";
import { adminFilterSelectClass } from "../components/adminFormStyles";
import { AdminPage, PageHeader, AdminKpiGrid } from "../components";
import "./UsersPage.css";

const UsersPage = () => {
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visiblePhoneUserIds, setVisiblePhoneUserIds] = useState(new Set());
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    return status;
  };

  const getStatusCls = (status) => {
    if (status === "ACTIVE")
      return "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
    if (status === "SUSPENDED")
      return "bg-rose-500/10 border-rose-500/25 text-rose-400";
    if (status === "PENDING_VERIFICATION")
      return "bg-amber-500/10 border-amber-500/25 text-amber-400";
    if (status === "INACTIVE")
      return "bg-zinc-500/10 border-zinc-500/25 text-zinc-400";
    return "bg-zinc-500/10 border-zinc-500/25 text-zinc-400";
  };

  const getStatusDot = (status) => {
    if (status === "ACTIVE") return "bg-emerald-400";
    if (status === "SUSPENDED") return "bg-rose-400";
    if (status === "PENDING_VERIFICATION") return "bg-amber-400";
    if (status === "INACTIVE") return "bg-zinc-400";
    return "bg-zinc-400";
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-sans">
          <Star className="w-2.5 h-2.5 fill-amber-400" />
          NASA VIP
        </span>
      );
    if (points >= 5000)
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-500/10 border-blue-500/30 text-blue-400 font-sans">
          <Star className="w-2.5 h-2.5 fill-blue-400" />
          NASA FRIEND
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-gray-800/60 border-gray-700 text-gray-400 font-sans">
        <Star className="w-2.5 h-2.5" />
        NASA MEMBER
      </span>
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

      {/* FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-1 font-sans">
        <div className="relative w-full sm:w-72 font-sans">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            className="w-full rounded-lg bg-[#0B0F19] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
            placeholder="Tìm theo tên, email, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap font-sans sm:ml-auto">
          {/* Status Filter */}
          <select
            className={`${adminFilterSelectClass} font-mono`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="PENDING_VERIFICATION">Chờ xác thực</option>
            <option value="INACTIVE">Không hoạt động</option>
            <option value="SUSPENDED">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* USER TABLE */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-[#0F1322] border border-[#1A2238] rounded-xl">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-widest font-sans">
            Đang tải danh sách khách hàng...
          </p>
        </div>
      ) : paginatedUsers.length > 0 ? (
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-[#1A2238]">
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">
                    Khách Hàng
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">
                    Hạng Hội Viên
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">
                    Điểm Tích Lũy
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">
                    Trạng Thái
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono text-center">
                    Hành Động
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((row, index) => {
                  const isLastRow =
                    index >= paginatedUsers.length - 2 && index > 0;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#1A2238]/40 hover:bg-white/[0.01] transition-colors duration-150 font-sans"
                    >
                      {/* IDENTITY */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 font-sans">
                          <UserAvatar src={row.avatarUrl} name={row.fullName} />
                          <div className="min-w-0 flex-1 font-sans">
                            <div className="flex items-center gap-1.5 flex-wrap font-sans">
                              <span className="text-xs font-bold text-white font-sans">
                                {row.fullName || "--"}
                              </span>
                              {row.authProvider === "GOOGLE" && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-gray-400 shrink-0 font-mono">
                                  G
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 break-all leading-tight font-sans">
                              {row.email}
                            </div>
                            {row.phoneNumber ? (
                              <div className="flex items-center gap-1.5 mt-0.5 font-sans">
                                <span className="text-[11px] text-gray-500 font-sans">
                                  {visiblePhoneUserIds.has(row.id)
                                    ? row.phoneNumber
                                    : row.phoneNumber.length >= 6
                                      ? `${row.phoneNumber.slice(0, 3)}....${row.phoneNumber.slice(-3)}`
                                      : "...."}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePhoneVisibility(row.id)}
                                  className="text-gray-500 hover:text-white transition-colors focus:outline-none p-0.5 cursor-pointer flex items-center justify-center"
                                >
                                  {visiblePhoneUserIds.has(row.id) ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-500 mt-0.5 font-sans">
                                --
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-gray-500 text-[9px] font-sans">
                              <Calendar className="w-2.5 h-2.5 shrink-0" />
                              <span className="font-mono">
                                Ngày tạo: {formatDate(row.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TIER */}
                      <td className="px-6 py-4">{getMemberTierBadge(row)}</td>

                      {/* POINTS */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col font-sans">
                          <span className="text-base font-extrabold text-amber-500 font-sans">
                            {(row.score || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                            ĐIỂM
                          </span>
                        </div>
                      </td>

                      {/* STATUS + QUICK TOGGLE */}
                      <td className="px-6 py-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            disabled={updatingUserId === row.id}
                            onClick={() =>
                              setOpenStatusDropdownId(
                                openStatusDropdownId === row.id ? null : row.id,
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono cursor-pointer transition-all duration-200 focus:outline-none hover:bg-white/[0.04] disabled:opacity-85 ${getStatusCls(row.status)}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getStatusDot(row.status)}`}
                            />
                            <span>{getStatusLabel(row.status)}</span>
                            <ChevronDown
                              className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${openStatusDropdownId === row.id ? "rotate-180" : ""}`}
                            />
                          </button>

                          {openStatusDropdownId === row.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40 bg-transparent"
                                onClick={() => setOpenStatusDropdownId(null)}
                              ></div>
                              <div
                                className={`absolute left-0 w-36 bg-[#0B0F19] border border-[#1A2238] rounded-lg shadow-xl p-1 space-y-0.5 z-50 text-left ${isLastRow ? "bottom-full mb-1" : "mt-1 top-full"}`}
                              >
                                {[
                                  {
                                    value: "ACTIVE",
                                    label: "Hoạt động",
                                    dot: "bg-emerald-400",
                                    cls: "text-emerald-400 hover:bg-emerald-500/10",
                                  },
                                  {
                                    value: "SUSPENDED",
                                    label: "Bị khóa",
                                    dot: "bg-rose-400",
                                    cls: "text-rose-400 hover:bg-rose-500/10",
                                  },
                                  {
                                    value: "PENDING_VERIFICATION",
                                    label: "Chờ xác thực",
                                    dot: "bg-amber-400",
                                    cls: "text-amber-400 hover:bg-amber-500/10",
                                  },
                                  {
                                    value: "INACTIVE",
                                    label: "Không hoạt động",
                                    dot: "bg-zinc-400",
                                    cls: "text-zinc-400 hover:bg-zinc-500/10",
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
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[10px] font-bold transition-all duration-200 cursor-pointer ${opt.cls} ${row.status === opt.value ? "bg-[#0f172a]" : "border border-transparent"}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${opt.dot}`}
                                    />
                                    <span>{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(row)}
                          className="p-2 bg-[#1A2238] hover:bg-[#2C3B5E] text-gray-300 hover:text-white rounded-lg transition duration-200 cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold border-none font-mono"
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
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-28 gap-3 bg-[#0F1322] border border-[#1A2238] rounded-xl mb-4 font-sans">
          <UserX className="w-14 h-14 text-gray-700" />
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400 font-sans">
            Không tìm thấy khách hàng nào
          </p>
          <p className="text-xs text-gray-600 font-sans">
            Thử thay đổi từ khóa hoặc bộ lọc của bạn.
          </p>
        </div>
      )}

      {/* PAGINATION */}
      {totalElements > 0 && (
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
