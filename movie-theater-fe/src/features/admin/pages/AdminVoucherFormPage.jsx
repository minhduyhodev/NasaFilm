import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { adminPromotionService } from '../api/adminPromotionService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getPointsToCashValue } from '../../../shared/utils/systemConfig';
import { formatDateForInput, formatDateForBackend, validateVoucherDiscountValue, validateVoucherSchedule } from '../utils/voucherFormUtils';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const AdminVoucherFormPage = () => {
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
          notificationService.error('Khong tim thay voucher');
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

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm('Bạn có chắc chắn muốn hủy? Mọi thay đổi chưa lưu sẽ bị mất.')) {
        return;
      }
    }
    navigate(isEditing ? `/admin/vouchers/${voucherId}` : '/admin/vouchers');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = form.code.trim().toUpperCase();
    if (!trimmedCode) {
      notificationService.error('Ma voucher khong duoc de trong');
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
        notificationService.success('Cap nhat voucher thanh cong');
        navigate(`/admin/vouchers/${voucherId}`);
      } else {
        const created = await adminPromotionService.createPromotion(promoData);
        notificationService.success('Tao voucher thanh cong');
        navigate(`/admin/vouchers/${created?.id || ''}`);
      }
    } catch (err) {
      notificationService.error(err.message || 'Luu that bai');
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
              <label className={labelClass}>Ma voucher *</label>
              <input className={`${inputClass} uppercase font-bold`} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.replace(/\s/g, '').toUpperCase() }))} required />
            </div>
            <div>
              <label className={labelClass}>Loai giam gia *</label>
              <select className={`${inputClass} app-select`} value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}>
                <option value="PERCENTAGE">Phan tram (%)</option>
                <option value="FIXED_AMOUNT">So tien co dinh (VND)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Gia tri giam *</label>
              <input
                type="number"
                min={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
                step={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
                className={inputClass}
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
              <label className={labelClass}>Luot dung toi da</label>
              <input type="number" min="1" className={inputClass} placeholder="Khong gioi han" value={form.maxUsage} onChange={(e) => setForm((p) => ({ ...p, maxUsage: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Ngay bat dau</label>
              <input type="datetime-local" className={inputClass} value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Ngay ket thuc</label>
              <input type="datetime-local" className={inputClass} value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Trang thai *</label>
              <select className={`${inputClass} app-select`} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
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
