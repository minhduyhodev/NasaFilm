import React, { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  Plus,
  Search,
  Activity,
  CheckCircle,
  Pause,
  ChevronDown,
  Edit2,
  Trash2,
} from "lucide-react";
import { adminPromotionService } from "../api/adminPromotionService";
import { notificationService } from "../../../shared/services/notificationService";
import Pagination from "../../../shared/components/Pagination";
import AdminModal from "../components/AdminModal";
import VoucherFormPanel from "../components/panels/VoucherFormPanel";
import { PrimaryButton, GhostButton } from "../components";
import {
  formatDateForInput,
  formatDateTimeDisplay,
  formatDiscountDisplay,
  getVoucherLifecycleStatus,
  getVoucherStatusClassName,
} from "../utils/voucherFormUtils";
import { useConfirm } from "../../../shared/context/ConfirmDialogContext";
import { resolveTierLabelByMinScore } from "../../../shared/utils/memberTiers";
import "./VouchersPage.css";

const VouchersPage = () => {
  const confirm = useConfirm();
  const [vouchersList, setVouchersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
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

  const filterOptions = [
    {
      value: "all",
      label: "Tất cả trạng thái",
      icon: (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 shrink-0" />
      ),
    },
    {
      value: "ACTIVE",
      label: "Hoạt động",
      icon: (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" />
      ),
    },
    {
      value: "INACTIVE",
      label: "Đã vô hiệu",
      icon: (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 shrink-0" />
      ),
    },
    {
      value: "DELETED",
      label: "Đã xóa",
      icon: (
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mr-2 shrink-0" />
      ),
    },
  ];
  const currentFilter =
    filterOptions.find((opt) => opt.value === statusFilter) || filterOptions[0];

  const closeVoucherModal = () =>
    setVoucherModal({ open: false, mode: "create", voucher: null });

  const handleVoucherSaved = async () => {
    closeVoucherModal();
    await fetchVouchers();
  };

  const handleDeleteVoucher = async (voucher) => {
    const ok = await confirm({
      title: 'Xóa voucher',
      message: `Bạn có chắc muốn xóa mã "${voucher.code}"? Voucher sẽ không còn hiển thị với khách hàng.`,
      confirmLabel: 'Xóa voucher',
      variant: 'danger',
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
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">
            Trung Tâm Khuyến Mãi
          </p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">
            Quản Lý Voucher &amp; Khuyến Mãi
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            Tạo chiến dịch chiết khấu, quản lý lượt sử dụng mã và thời hạn kích
            hoạt voucher toàn hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setVoucherModal({ open: true, mode: "create", voucher: null })
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm text-white font-bold transition shadow-md cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus size={16} /> Tạo Voucher Mới
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-left">
        {[
          {
            label: "TỔNG VOUCHER",
            value: totalVouchers,
            icon: Ticket,
            color: "text-indigo-400",
            kpiClass: "kpi-total",
          },
          {
            label: "ĐANG HOẠT ĐỘNG",
            value: activeVouchers,
            icon: CheckCircle,
            color: "text-emerald-400",
            kpiClass: "kpi-active",
          },
          {
            label: "VÔ HIỆU HÓA",
            value: inactiveVouchers,
            icon: Pause,
            color: "text-amber-400",
            kpiClass: "kpi-inactive",
          },
          {
            label: "TỔNG LƯỢT SỬ DỤNG",
            value: totalUsedCount,
            icon: Activity,
            color: "text-blue-400",
            kpiClass: "kpi-used",
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
                {kpi.label}
              </span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-1">
        <div className="relative w-full sm:w-72 text-left">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF3366]/50 transition-colors font-sans"
            placeholder="Tìm kiếm theo mã voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative text-left z-20">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#242d42] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#475569] focus:outline-none transition-colors cursor-pointer min-w-[170px] h-[38px] justify-between"
          >
            <span className="flex items-center">
              {currentFilter.icon}
              <span>{currentFilter.label}</span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isFilterDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isFilterDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10 bg-transparent"
                onClick={() => setIsFilterDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 space-y-0.5 z-20">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-gray-100 transition text-left text-xs font-semibold cursor-pointer ${statusFilter === opt.value ? "bg-red-50 text-red-600 font-bold border border-red-200" : "text-gray-700 border border-transparent"}`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 bg-[#1c2333]/50 border border-[#242d42] rounded-xl shadow-2xl">
          <div className="w-10 h-10 border-2 border-[#FF3366] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-sans">
            Đang tải danh sách voucher...
          </p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#1c2333]/50 border border-[#242d42] rounded-xl shadow-2xl">
          <Ticket className="w-14 h-14 text-zinc-700" />
          <p className="font-bold text-white uppercase tracking-wider text-sm font-sans">
            Không tìm thấy voucher nào
          </p>
          <p className="text-xs text-gray-500 font-sans">
            Hãy tạo voucher mới hoặc điều chỉnh bộ lọc.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242d42]">
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                    Mã Voucher
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                    Chiết Khấu
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                    Lượt Sử Dụng
                  </th>
                  <th className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 font-sans">
                    Hiệu Lực
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedVouchers.map((v) => {
                  const lifecycle = getVoucherLifecycleStatus(v);
                  const usedCount = v.usedCount ?? 0;
                  const pct =
                    v.maxUsage > 0
                      ? Math.min(
                          100,
                          Math.round((usedCount / v.maxUsage) * 100),
                        )
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
                        setVoucherModal({
                          open: true,
                          mode: "detail",
                          voucher: v,
                        })
                      }
                      className="border-b border-[#242d42]/30 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-base font-extrabold text-white tracking-widest uppercase font-sans">
                            {v.code}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 font-sans border ${getVoucherStatusClassName(lifecycle.tone)}`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${lifecycle.tone === "emerald" ? "bg-emerald-400" : lifecycle.tone === "rose" ? "bg-rose-400" : lifecycle.tone === "amber" ? "bg-amber-400" : "bg-zinc-400"}`}
                              />
                              {lifecycle.label}
                            </span>
                            {lifecycle.soonExpiring && (
                              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                                Sắp hết hạn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-gray-400 font-sans">
                            {v.discountType === "PERCENTAGE"
                              ? "Phần trăm (%)"
                              : "Cố định (đ)"}
                          </span>
                          <span className="text-lg font-black text-amber-400 font-sans">
                            {v.discountType === "PERCENTAGE"
                              ? `${Math.round(v.discountValue * 100)}%`
                              : `${Number(v.discountValue).toLocaleString("vi-VN")} đ`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[150px] text-left">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 font-sans">
                            <span>
                              {usedCount} / {v.maxUsage ?? "∞"}
                            </span>
                            {v.maxUsage > 0 && <span>{pct}%</span>}
                          </div>
                          {v.maxUsage > 0 ? (
                            <div className="h-1 rounded-full bg-[#1A2238] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-sans">
                              Không giới hạn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 font-sans text-left">
                          {v.startDate && (
                            <span className="text-[11px] text-gray-400">
                              Từ:{" "}
                              {formatDateTimeDisplay(
                                formatDateForInput(v.startDate),
                              )}
                            </span>
                          )}
                          {v.endDate && (
                            <span className="text-[11px] text-gray-400">
                              Đến:{" "}
                              {formatDateTimeDisplay(
                                formatDateForInput(v.endDate),
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredVouchers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

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
                <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Ticket className="w-10 h-10 text-red-500" />
                  <span className="text-xl font-black text-white uppercase tracking-widest">
                    {v.code}
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatDiscountDisplay(v)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getVoucherStatusClassName(lifecycle.tone)}`}
                  >
                    {lifecycle.label}
                  </span>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Loại giảm
                    </dt>
                    <dd className="text-white">
                      {v.discountType === "PERCENTAGE"
                        ? "Phần trăm (%)"
                        : "Số tiền cố định"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Giá trị giảm
                    </dt>
                    <dd className="text-amber-400 font-bold">
                      {formatDiscountDisplay(v)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Điểm đổi
                    </dt>
                    <dd className="text-white">
                      {(v.pointsCost ?? 0) > 0
                        ? `${Number(v.pointsCost).toLocaleString("vi-VN")} điểm`
                        : "Không cần điểm"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Hạng thành viên
                    </dt>
                    <dd className="text-white">
                      {resolveTierLabelByMinScore(v.minScore)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Giới hạn toàn hệ thống
                    </dt>
                    <dd className="text-white">
                      {v.maxUsage != null
                        ? `${usedCount} / ${v.maxUsage} lượt`
                        : "Không giới hạn"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Giới hạn mỗi tài khoản
                    </dt>
                    <dd className="text-white">
                      {v.maxUsagePerUser != null
                        ? `${v.maxUsagePerUser} lượt đổi`
                        : "Không giới hạn"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Kích hoạt
                    </dt>
                    <dd className="text-white">
                      {(v.pointsCost ?? 0) > 0
                        ? "Đổi điểm trước khi sử dụng"
                        : "Khả dụng trực tiếp khi đặt vé"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                      Trạng thái vận hành
                    </dt>
                    <dd className="text-white">
                      {v.status === "ACTIVE"
                        ? "Đang bật trong hệ thống"
                        : "Đã tắt thủ công"}
                    </dd>
                  </div>
                  {v.startDate && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                        Bắt đầu
                      </dt>
                      <dd className="text-white">
                        {formatDateTimeDisplay(formatDateForInput(v.startDate))}
                      </dd>
                    </div>
                  )}
                  {v.endDate && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                        Kết thúc
                      </dt>
                      <dd className="text-white">
                        {formatDateTimeDisplay(formatDateForInput(v.endDate))}
                      </dd>
                    </div>
                  )}
                  {v.deletedAt && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">
                        Ngày xóa
                      </dt>
                      <dd className="text-white">
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
                  <p className="text-xs text-gray-500">
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
    </div>
  );
};

export default VouchersPage;
