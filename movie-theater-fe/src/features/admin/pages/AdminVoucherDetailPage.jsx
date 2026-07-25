import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit2, Trash2, Loader2, Ticket } from "lucide-react";
import { adminPromotionService } from "../api/adminPromotionService";
import { notificationService } from "../../../shared/services/notificationService";
import {
  formatDateForInput,
  formatDateTimeDisplay,
  formatDiscountDisplay,
  getVoucherLifecycleStatus,
} from "../utils/voucherFormUtils";
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "../components";
import { useConfirm } from "../../../shared/context/ConfirmDialogContext";

function lifecycleVariant(tone) {
  if (tone === "emerald") return "success";
  if (tone === "rose") return "danger";
  if (tone === "amber") return "warning";
  return "muted";
}

const AdminVoucherDetailPage = () => {
  const { voucherId } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [voucher, setVoucher] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const list = await adminPromotionService.getPromotions();
        const found = (list || []).find(
          (v) => String(v.id) === String(voucherId),
        );
        if (!isMounted) return;
        if (!found) {
          notificationService.error("Khong tim thay voucher");
          navigate("/admin/vouchers");
          return;
        }
        setVoucher(found);
      } catch {
        notificationService.error("Không thể tải voucher");
        navigate("/admin/vouchers");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [voucherId, navigate]);

  const handleDelete = async () => {
    if (!voucher) return;
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
      navigate("/admin/vouchers");
    } catch (err) {
      notificationService.error(err.message || "Xóa thất bại");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dang tai...
      </div>
    );
  }

  if (!voucher) return null;

  const lifecycle = getVoucherLifecycleStatus(voucher);
  const isDeleted = lifecycle.code === "DELETED";

  return (
    <AdminPage>
      <PageHeader
        title={voucher.code}
        description={
          voucher.description || `Giảm giá ${formatDiscountDisplay(voucher)}`
        }
        backTo="/admin/vouchers"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="w-full max-w-xs aspect-[4/3] rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center gap-2 p-6">
            <Ticket className="w-12 h-12 text-red-500" />
            <span className="text-2xl font-black text-white uppercase tracking-widest font-heading">
              {voucher.code}
            </span>
            <span className="text-lg font-bold text-amber-400">
              {formatDiscountDisplay(voucher)}
            </span>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2">
            {!isDeleted && (
              <>
                <PrimaryButton
                  type="button"
                  className="w-full justify-center py-2.5"
                  onClick={() => navigate(`/admin/vouchers/${voucher.id}/edit`)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chinh sua
                </PrimaryButton>
                <GhostButton
                  type="button"
                  className="w-full justify-center py-2.5 text-red-400 border border-red-500/30 hover:bg-red-500/10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Dang xoa..." : "Xoa "}
                </GhostButton>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <Section title="Chi tiet">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow
                label="Trang thai"
                value={
                  <StatusBadge variant={lifecycleVariant(lifecycle.tone)}>
                    {lifecycle.label}
                  </StatusBadge>
                }
              />
              {voucher.deletedAt && (
                <MetadataRow
                  label="Ngay xoa"
                  value={new Date(voucher.deletedAt).toLocaleString("vi-VN")}
                />
              )}
              <MetadataRow
                label="Loai giam"
                value={
                  voucher.discountType === "PERCENTAGE"
                    ? "Phan tram"
                    : "Co dinh"
                }
              />
              <MetadataRow
                label="Da su dung"
                value={`${voucher.usedCount ?? 0} / ${voucher.maxUsage ?? "∞"}`}
              />
              <MetadataRow
                label="Bat dau"
                value={
                  voucher.startDate
                    ? formatDateTimeDisplay(
                        formatDateForInput(voucher.startDate),
                      )
                    : "—"
                }
              />
              <MetadataRow
                label="Ket thuc"
                value={
                  voucher.endDate
                    ? formatDateTimeDisplay(formatDateForInput(voucher.endDate))
                    : "—"
                }
              />
            </dl>
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminVoucherDetailPage;
