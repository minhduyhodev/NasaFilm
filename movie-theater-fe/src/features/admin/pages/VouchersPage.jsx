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
  const [itemsPerPage, setItemsPerPage] = useState(6);
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
    <AdminPage className="vouchers-page">
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
            kpiClass: "kpi-total",
          },
          {
            label: "Đang hoạt động",
            value: activeVouchers,
            icon: CheckCircle,
            kpiClass: "kpi-active",
          },
          {
            label: "Vô hiệu hóa",
            value: inactiveVouchers,
            icon: Pause,
            kpiClass: "kpi-inactive",
          },
          {
            label: "Tổng lượt sử dụng",
            value: totalUsedCount,
            icon: Activity,
            kpiClass: "kpi-used",
          },
        ]}
      />

      <AdminTableShell
        className="vouchers-shell"
        toolbar={
          <div className="vouchers-toolbar">
            <div className="vouchers-search">
              <Search className="vouchers-search__icon" aria-hidden="true" />
              <input
                className="vouchers-search__input"
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
          <div className="vouchers-state">
            <div className="vouchers-state__spinner" />
            <p>Đang tải danh sách voucher...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="vouchers-state">
            <Ticket className="vouchers-state__icon" />
            <p className="vouchers-state__title">Không tìm thấy voucher nào</p>
            <p className="vouchers-state__desc">
              Hãy tạo voucher mới hoặc điều chỉnh bộ lọc.
            </p>
          </div>
        ) : (
          <div className="vouchers-grid">
            {paginatedVouchers.map((v) => {
              const lifecycle = getVoucherLifecycleStatus(v);
              const usedCount = v.usedCount ?? 0;
              const maxUsage = v.maxUsage;
              const pct =
                maxUsage > 0
                  ? Math.min(100, Math.round((usedCount / maxUsage) * 100))
                  : 0;
              const ringR = 22;
              const ring = 2 * Math.PI * ringR;
              const dashOffset = ring - (pct / 100) * ring;
              const discountLabel =
                v.discountType === "PERCENTAGE"
                  ? `${Math.round(v.discountValue * 100)}%`
                  : `${Number(v.discountValue).toLocaleString("vi-VN")}đ`;
              const usageFraction =
                maxUsage > 0 ? `${usedCount}/${maxUsage}` : `${usedCount} lượt`;
              const usagePct = maxUsage > 0 ? `${pct}%` : null;
              const startLabel = v.startDate
                ? formatDateTimeDisplay(formatDateForInput(v.startDate))
                : null;
              const endLabel = v.endDate
                ? formatDateTimeDisplay(formatDateForInput(v.endDate))
                : null;

              return (
                <article
                  key={v.id}
                  className={`voucher-ticket voucher-ticket--${lifecycle.tone}${
                    lifecycle.soonExpiring ? " voucher-ticket--soon" : ""
                  }`}
                >
                  <div className="voucher-ticket__stub">
                    <h3 className="voucher-ticket__code">{v.code}</h3>
                    <p className="voucher-ticket__discount">{discountLabel}</p>

                    {maxUsage > 0 ? (
                      <div className="voucher-ticket__ring" aria-hidden="true">
                        <svg viewBox="0 0 56 56" className="voucher-ticket__ring-svg">
                          <circle cx="28" cy="28" r={ringR} className="voucher-ticket__ring-track" />
                          <circle
                            cx="28"
                            cy="28"
                            r={ringR}
                            className="voucher-ticket__ring-value"
                            style={{
                              strokeDasharray: ring,
                              strokeDashoffset: dashOffset,
                            }}
                          />
                        </svg>
                        <span className="voucher-ticket__ring-label">
                          <span className="voucher-ticket__ring-frac">{usageFraction}</span>
                          <span className="voucher-ticket__ring-pct">{usagePct}</span>
                        </span>
                      </div>
                    ) : (
                      <p className="voucher-ticket__usage-plain">{usageFraction}</p>
                    )}
                  </div>

                  <div className="voucher-ticket__perforation" aria-hidden="true">
                    <span className="voucher-ticket__notch voucher-ticket__notch--top" />
                    <span className="voucher-ticket__dash" />
                    <span className="voucher-ticket__notch voucher-ticket__notch--bottom" />
                  </div>

                  <div className="voucher-ticket__panel">
                    {lifecycle.soonExpiring ? (
                      <span className="voucher-ticket__tag">Sắp hết hạn</span>
                    ) : (
                      <span className="voucher-ticket__tag voucher-ticket__tag--spacer" aria-hidden="true" />
                    )}

                    <div className="voucher-ticket__status">
                      <span
                        className={`voucher-ticket__dot voucher-ticket__dot--${lifecycle.tone}`}
                      />
                      <span className={`voucher-ticket__status-text voucher-ticket__status-text--${lifecycle.tone}`}>
                        {lifecycle.label}
                      </span>
                    </div>

                    <div className="voucher-ticket__dates">
                      {startLabel ? (
                        <p>
                          <span className="voucher-ticket__date-label">Từ:</span>{" "}
                          <span className="voucher-ticket__date-value">{startLabel}</span>
                        </p>
                      ) : null}
                      {endLabel ? (
                        <p>
                          <span className="voucher-ticket__date-label">Đến:</span>{" "}
                          <span className="voucher-ticket__date-value">{endLabel}</span>
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="voucher-ticket__cta"
                      onClick={() =>
                        setVoucherModal({
                          open: true,
                          mode: "detail",
                          voucher: v,
                        })
                      }
                    >
                      Chi tiết
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminTableShell>

      <AdminModal
        open={voucherModal.open}
        onClose={closeVoucherModal}
        title={voucherModalTitle}
        subtitle={voucherModalSubtitle}
        size={voucherModal.mode === "detail" ? "md" : "xl"}
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
