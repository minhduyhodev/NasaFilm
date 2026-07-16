import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { adminPromotionService } from '../api/adminPromotionService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getPointsToCashValue } from '../../../shared/utils/systemConfig';
import { formatDateForInput, formatDateForBackend, validateVoucherDiscountValue, validateVoucherSchedule } from '../utils/voucherFormUtils';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton, AdminDateTimePicker } from '../components';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../components/adminFormStyles';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const AdminVoucherFormPage = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { voucherId } = useParams();
  const isEditing = Boolean(voucherId);

  const defaultForm = {
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    maxUsage: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
  };

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [pointsToCashValue, setPointsToCashValue] = useState(() => getPointsToCashValue());
  const [form, setForm] = useState(defaultForm);
  const [initialForm, setInitialForm] = useState(defaultForm);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setPointsToCashValue(getPointsToCashValue(cfg)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const list = await adminPromotionService.getPromotions();
        const voucher = (list || []).find((v) => String(v.id) === String(voucherId));
        if (!isMounted) return;
        if (!voucher) {
          notificationService.error('Không tìm thấy voucher');
          navigate('/admin/vouchers');
          return;
        }
        const loadedForm = {
          code: voucher.code || '',
          discountType: voucher.discountType || 'PERCENTAGE',
          discountValue:
            voucher.discountType === 'PERCENTAGE'
              ? String(Math.round(voucher.discountValue * 100))
              : String(voucher.discountValue),
          maxUsage: voucher.maxUsage != null ? String(voucher.maxUsage) : '',
          startDate: formatDateForInput(voucher.startDate),
          endDate: formatDateForInput(voucher.endDate),
          status: voucher.status || 'ACTIVE',
        };
        setForm(loadedForm);
        setInitialForm(loadedForm);
      } catch (err) {
        notificationService.error('Khong the tai voucher');
        navigate('/admin/vouchers');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [voucherId, isEditing, navigate]);

  const isDirty = initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);

  const handleCancel = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Hủy chỉnh sửa',
        message: 'Bạn có chắc chắn muốn hủy? Mọi thay đổi chưa lưu sẽ bị mất.',
        confirmLabel: 'Hủy bỏ',
        variant: 'warning',
      });
      if (!ok) return;
    }
    navigate(isEditing ? `/admin/vouchers/${voucherId}` : '/admin/vouchers');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = form.code.trim().toUpperCase();
    if (!trimmedCode) {
      notificationService.error('Mã voucher không được để trống');
      return;
    }
    const discountError = validateVoucherDiscountValue(form.discountType, form.discountValue, pointsToCashValue);
    if (discountError) {
      notificationService.error(discountError);
      return;
    }
    const valueNum = parseFloat(form.discountValue);
    const scheduleError = validateVoucherSchedule({
      startDate: form.startDate,
      endDate: form.endDate,
      isEditing,
    });
    if (scheduleError) {
      notificationService.error(scheduleError);
      return;
    }

    const promoData = {
      code: trimmedCode,
      discountType: form.discountType,
      discountValue: form.discountType === 'PERCENTAGE' ? valueNum / 100 : valueNum,
      maxUsage: form.maxUsage ? parseInt(form.maxUsage, 10) : null,
      oncePerUser: false,
      startDate: formatDateForBackend(form.startDate),
      endDate: formatDateForBackend(form.endDate),
      status: form.status,
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await adminPromotionService.updatePromotion(voucherId, promoData);
        notificationService.success('Cập nhật voucher thành công');
        navigate(`/admin/vouchers/${voucherId}`);
      } else {
        const created = await adminPromotionService.createPromotion(promoData);
        notificationService.success('Tạo voucher thành công');
        navigate(`/admin/vouchers/${created?.id || ''}`);
      }
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
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

  return (
    <AdminPage>
      <PageHeader
        title={isEditing ? 'Chinh sua voucher' : 'Tao voucher moi'}
        backTo={isEditing ? `/admin/vouchers/${voucherId}` : '/admin/vouchers'}
      />

      <form onSubmit={handleSubmit}>
        <Section title="Thong tin khuyen mai">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className={adminLabelClass}>Ma voucher *</label>
              <input className={`${adminInputClass} uppercase font-bold`} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.replace(/\s/g, '').toUpperCase() }))} required />
            </div>
            <div>
              <label className={adminLabelClass}>Loai giam gia *</label>
              <select className={adminSelectClass} value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}>
                <option value="PERCENTAGE">Phan tram (%)</option>
                <option value="FIXED_AMOUNT">So tien co dinh (VND)</option>
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Gia tri giam *</label>
              <input
                type="number"
                min={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
                step={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
                className={adminInputClass}
                value={form.discountValue}
                onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                required
              />
              {form.discountType === 'FIXED_AMOUNT' && (
                <p className="text-xs text-gray-600 mt-1">
                  Toi thieu {pointsToCashValue.toLocaleString('vi-VN')} VND (gia tri 1 diem theo cau hinh he thong)
                </p>
              )}
            </div>
            <div>
              <label className={adminLabelClass}>Luot dung toi da</label>
              <input type="number" min="1" className={adminInputClass} placeholder="Khong gioi han" value={form.maxUsage} onChange={(e) => setForm((p) => ({ ...p, maxUsage: e.target.value }))} />
            </div>
            <AdminDateTimePicker
              label="Ngay bat dau"
              value={form.startDate}
              onChange={(v) => setForm((p) => ({ ...p, startDate: v }))}
            />
            <AdminDateTimePicker
              label="Ngay ket thuc"
              value={form.endDate}
              onChange={(v) => setForm((p) => ({ ...p, endDate: v }))}
            />
            <div>
              <label className={adminLabelClass}>Trang thai *</label>
              <select className={adminSelectClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">Hoat dong</option>
                <option value="INACTIVE">Vo hieu</option>
              </select>
            </div>
          </div>
        </Section>
        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <GhostButton type="button" onClick={handleCancel}>Huy</GhostButton>
          <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
            {isEditing ? 'Cap nhat' : 'Tao voucher'}
          </PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminVoucherFormPage;
