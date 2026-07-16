import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  Plus,
  Search,
  Activity,
  CheckCircle,
  Pause,
  Edit2,
  Trash2,
} from "lucide-react";
import { adminPromotionService } from "../api/adminPromotionService";
import { notificationService } from "../../../shared/services/notificationService";
import Pagination from "../../../shared/components/Pagination";
import AdminModal from "../components/AdminModal";
import VoucherFormPanel from "../components/panels/VoucherFormPanel";
import {
  AdminPage,
  PageHeader,
  AdminKpiGrid,
  FilterPills,
  StatusBadge,
  AdminTableShell,
  PrimaryButton,
  GhostButton,
} from "../components";
import {
  formatDateForInput,
  formatDateTimeDisplay,
  formatDiscountDisplay,
  getVoucherLifecycleStatus,
} from "../utils/voucherFormUtils";
import { useConfirm } from "../../../shared/context/ConfirmDialogContext";
import { resolveTierLabelByMinScore } from "../../../shared/utils/memberTiers";
import "./VouchersPage.css";

function lifecycleVariant(tone) {
  if (tone === "emerald") return "success";
  if (tone === "rose") return "danger";
  if (tone === "amber") return "warning";
  return "muted";
}

const VouchersPage = () => {
  const confirm = useConfirm();
  const [vouchersList, setVouchersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const [voucherModal, setVoucherModal] = useState({
    open: false,
    mode: "create",
    voucher: null,
  });

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminPromotionService.getPromotions();
      if (Array.isArray(data)) setVouchersList(data);
    } catch (error) {
      notificationService.error(
        error.message || "Không thể tải danh sách khuyến mãi.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredVouchers = vouchersList.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.code.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const lifecycle = getVoucherLifecycleStatus(v);
    const matchesStatus =
      (statusFilter === "all" && lifecycle.code !== "DELETED") ||
      (statusFilter === "ACTIVE" && lifecycle.code === "ACTIVE") ||
      (statusFilter === "INACTIVE" &&
        lifecycle.code !== "ACTIVE" &&
        lifecycle.code !== "DELETED") ||
      (statusFilter === "DELETED" && lifecycle.code === "DELETED");
    return matchesSearch && matchesStatus;
  });

  const totalVouchers = vouchersList.filter(
    (v) => !v.deletedAt && v.status !== "DELETED",
  ).length;
  const activeVouchers = vouchersList.filter(
    (v) => getVoucherLifecycleStatus(v).code === "ACTIVE",
  ).length;
  const inactiveVouchers = vouchersList.filter((v) => {
    const code = getVoucherLifecycleStatus(v).code;
    return code !== "ACTIVE" && code !== "DELETED";
  }).length;
  const totalUsedCount = vouchersList.reduce(
    (acc, curr) => acc + (curr.usedCount || 0),
    0,
  );

  const paginatedVouchers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVouchers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVouchers, currentPage, itemsPerPage]);

  const closeVoucherModal = () =>
    setVoucherModal({ open: false, mode: "create", voucher: null });

  const handleVoucherSaved = async () => {
    closeVoucherModal();
    await fetchVouchers();
  };

  const handleDeleteVoucher = async (voucher) => {
    const ok = await confirm({
      title: "Xóa voucher",
      message: `Bạn có chắc muốn xóa mã "${voucher.code}"? Voucher sẽ không còn hiển thị với khách hàng.`,
      confirmLabel: "Xóa voucher",
      variant: "danger",
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await adminPromotionService.deletePromotion(voucher.id);
      notificationService.success("Đã xóa voucher");
      closeVoucherModal();
      await fetchVouchers();
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  const voucherModalTitle =
    voucherModal.mode === "create"
      ? "Tạo voucher mới"
      : voucherModal.mode === "edit"
        ? "Chỉnh sửa voucher"
        : voucherModal.voucher?.code || "Chi tiết voucher";

  const voucherModalSubtitle =
    voucherModal.mode === "detail" && voucherModal.voucher
      ? voucherModal.voucher.description ||
        `Giảm giá ${formatDiscountDisplay(voucherModal.voucher)}`
      : undefined;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trung tâm khuyến mãi"
        title="Quản lý voucher"
        description="Tạo chiến dịch chiết khấu, quản lý lượt sử dụng mã và thời hạn kích hoạt voucher toàn hệ thống."
        primaryAction={{
          label: "Tạo voucher mới",
          icon: <Plus size={16} />,
          onClick: () =>
            setVoucherModal({ open: true, mode: "create", voucher: null }),
        }}
      />

      <AdminKpiGrid
        items={[
          {
            label: "Tổng voucher",
            value: totalVouchers,
            icon: Ticket,
            color: "text-amber-400",
            kpiClass: "kpi-total",
          },
          {
            label: "Đang hoạt động",
            value: activeVouchers,
            icon: CheckCircle,
            color: "text-emerald-400",
            kpiClass: "kpi-active",
          },
          {
            label: "Vô hiệu hóa",
            value: inactiveVouchers,
            icon: Pause,
            color: "text-amber-400",
            kpiClass: "kpi-inactive",
          },
          {
            label: "Tổng lượt sử dụng",
            value: totalUsedCount,
            icon: Activity,
            color: "text-sky-400",
            kpiClass: "kpi-used",
          },
        ]}
      />

      <AdminTableShell
        toolbar={
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
            <div className="adm-toolbar__search max-w-md w-full">
              <Search className="adm-toolbar__search-icon" />
              <input
                className="adm-input"
                placeholder="Tìm kiếm theo mã voucher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <FilterPills
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                { id: "all", label: "Tất cả" },
                { id: "ACTIVE", label: "Hoạt động", count: activeVouchers },
                { id: "INACTIVE", label: "Vô hiệu", count: inactiveVouchers },
                { id: "DELETED", label: "Đã xóa" },
              ]}
              ariaLabel="Lọc trạng thái voucher"
            />
          </div>
        }
        footer={
          filteredVouchers.length > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredVouchers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          ) : null
        }
      >
        {isLoading ? (
          <div className="adm-loading min-h-[280px]">
            <div className="w-10 h-10 border-2 border-[var(--adm-accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--adm-text-dim)]">
              Đang tải danh sách voucher...
            </p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="adm-empty">
            <Ticket className="w-12 h-12 text-[var(--adm-text-dim)] mb-2" />
            <p className="font-semibold text-[var(--adm-text)]">
              Không tìm thấy voucher nào
            </p>
            <p className="text-xs text-[var(--adm-text-dim)] mt-1">
              Hãy tạo voucher mới hoặc điều chỉnh bộ lọc.
            </p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Mã voucher</th>
                <th>Chiết khấu</th>
                <th>Lượt sử dụng</th>
                <th>Hiệu lực</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVouchers.map((v) => {
                const lifecycle = getVoucherLifecycleStatus(v);
                const usedCount = v.usedCount ?? 0;
                const pct =
                  v.maxUsage > 0
                    ? Math.min(100, Math.round((usedCount / v.maxUsage) * 100))
                    : 0;
                const progressColor =
                  pct >= 85
                    ? "bg-rose-500"
                    : pct >= 60
                      ? "bg-amber-500"
                      : "bg-emerald-500";

                return (
                  <tr
                    key={v.id}
                    onClick={() =>
                      setVoucherModal({ open: true, mode: "detail", voucher: v })
                    }
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-sm font-bold text-[var(--adm-text)] tracking-wider uppercase">
                          {v.code}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge variant={lifecycleVariant(lifecycle.tone)}>
                            {lifecycle.label}
                          </StatusBadge>
                          {lifecycle.soonExpiring && (
                            <StatusBadge variant="warning">Sắp hết hạn</StatusBadge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-xs text-[var(--adm-text-dim)]">
                          {v.discountType === "PERCENTAGE"
                            ? "Phần trăm (%)"
                            : "Cố định (đ)"}
                        </span>
                        <span className="text-base font-bold text-amber-400 adm-tabular">
                          {v.discountType === "PERCENTAGE"
                            ? `${Math.round(v.discountValue * 100)}%`
                            : `${Number(v.discountValue).toLocaleString("vi-VN")} đ`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1.5 max-w-[150px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--adm-text-dim)] adm-tabular">
                          <span>
                            {usedCount} / {v.maxUsage ?? "∞"}
                          </span>
                          {v.maxUsage > 0 && <span>{pct}%</span>}
                        </div>
                        {v.maxUsage > 0 ? (
                          <div className="h-1 rounded-full bg-[var(--adm-border)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progressColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--adm-text-dim)]">
                            Không giới hạn
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs text-[var(--adm-text-dim)]">
                        {v.startDate && (
                          <span>
                            Từ:{" "}
                            {formatDateTimeDisplay(formatDateForInput(v.startDate))}
                          </span>
                        )}
                        {v.endDate && (
                          <span>
                            Đến:{" "}
                            {formatDateTimeDisplay(formatDateForInput(v.endDate))}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminTableShell>

      <AdminModal
        open={voucherModal.open}
        onClose={closeVoucherModal}
        title={voucherModalTitle}
        subtitle={voucherModalSubtitle}
        size={voucherModal.mode === "detail" ? "md" : "lg"}
      >
        {voucherModal.mode === "detail" &&
          voucherModal.voucher &&
          (() => {
            const v = voucherModal.voucher;
            const lifecycle = getVoucherLifecycleStatus(v);
            const usedCount = v.usedCount ?? 0;
            return (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 p-4 rounded-[var(--adm-radius-sm)] bg-white/[0.03] border border-[var(--adm-border)]">
                  <Ticket className="w-10 h-10 text-[var(--adm-accent)]" />
                  <span className="text-xl font-black text-[var(--adm-text)] uppercase tracking-widest">
                    {v.code}
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatDiscountDisplay(v)}
                  </span>
                  <StatusBadge variant={lifecycleVariant(lifecycle.tone)}>
                    {lifecycle.label}
                  </StatusBadge>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Loại giảm
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {v.discountType === "PERCENTAGE"
                        ? "Phần trăm (%)"
                        : "Số tiền cố định"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Giá trị giảm
                    </dt>
                    <dd className="text-amber-400 font-bold">
                      {formatDiscountDisplay(v)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Điểm đổi
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {(v.pointsCost ?? 0) > 0
                        ? `${Number(v.pointsCost).toLocaleString("vi-VN")} điểm`
                        : "Không cần điểm"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Hạng thành viên
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {resolveTierLabelByMinScore(v.minScore)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Giới hạn toàn hệ thống
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {v.maxUsage != null
                        ? `${usedCount} / ${v.maxUsage} lượt`
                        : "Không giới hạn"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Giới hạn mỗi tài khoản
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {v.maxUsagePerUser != null
                        ? `${v.maxUsagePerUser} lượt đổi`
                        : "Không giới hạn"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Kích hoạt
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {(v.pointsCost ?? 0) > 0
                        ? "Đổi điểm trước khi sử dụng"
                        : "Khả dụng trực tiếp khi đặt vé"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                      Trạng thái vận hành
                    </dt>
                    <dd className="text-[var(--adm-text)]">
                      {v.status === "ACTIVE"
                        ? "Đang bật trong hệ thống"
                        : "Đã tắt thủ công"}
                    </dd>
                  </div>
                  {v.startDate && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                        Bắt đầu
                      </dt>
                      <dd className="text-[var(--adm-text)]">
                        {formatDateTimeDisplay(formatDateForInput(v.startDate))}
                      </dd>
                    </div>
                  )}
                  {v.endDate && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                        Kết thúc
                      </dt>
                      <dd className="text-[var(--adm-text)]">
                        {formatDateTimeDisplay(formatDateForInput(v.endDate))}
                      </dd>
                    </div>
                  )}
                  {v.deletedAt && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">
                        Ngày xóa
                      </dt>
                      <dd className="text-[var(--adm-text)]">
                        {new Date(v.deletedAt).toLocaleString("vi-VN")}
                      </dd>
                    </div>
                  )}
                </dl>
                {lifecycle.code !== "DELETED" ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <PrimaryButton
                      type="button"
                      className="flex-1 justify-center"
                      onClick={() =>
                        setVoucherModal({
                          open: true,
                          mode: "edit",
                          voucher: v,
                        })
                      }
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </PrimaryButton>
                    <GhostButton
                      type="button"
                      className="flex-1 justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => handleDeleteVoucher(v)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting ? "Đang xóa..." : "Xóa Voucher"}
                    </GhostButton>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--adm-text-dim)]">
                    Voucher đã được xóa và không thể chỉnh sửa.
                  </p>
                )}
              </div>
            );
          })()}
        {(voucherModal.mode === "create" || voucherModal.mode === "edit") && (
          <VoucherFormPanel
            voucher={voucherModal.mode === "edit" ? voucherModal.voucher : null}
            onSuccess={handleVoucherSaved}
            onCancel={closeVoucherModal}
          />
        )}
      </AdminModal>
    </AdminPage>
  );
};

export default VouchersPage;
