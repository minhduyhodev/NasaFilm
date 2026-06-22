import React, { useEffect, useState } from 'react';
import { adminPromotionService } from '../../api/adminPromotionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { systemConfigService } from '../../../../shared/services/systemConfigService';
import { getPointsToCashValue } from '../../../../shared/utils/systemConfig';
import { TIER_FORM_OPTIONS } from '../../../../shared/utils/memberTiers';
import { formatDateForInput, formatDateForBackend, validateVoucherDiscountValue, validateVoucherSchedule } from '../../utils/voucherFormUtils';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const emptyForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  pointsCost: '',
  minScore: 0,
  maxUsage: '',
  maxUsagePerUser: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
};

const VoucherFormPanel = ({ voucher, onSuccess, onCancel }) => {
  const isEditing = Boolean(voucher?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [pointsToCashValue, setPointsToCashValue] = useState(() => getPointsToCashValue());
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setPointsToCashValue(getPointsToCashValue(cfg)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!voucher) {
      setForm(emptyForm);
      return;
    }
    setForm({
      code: voucher.code || '',
      discountType: voucher.discountType || 'PERCENTAGE',
      discountValue:
        voucher.discountType === 'PERCENTAGE'
          ? String(Math.round(voucher.discountValue * 100))
          : String(voucher.discountValue),
      pointsCost: voucher.pointsCost != null ? String(voucher.pointsCost) : '',
      minScore: voucher.minScore ?? 0,
      maxUsage: voucher.maxUsage != null ? String(voucher.maxUsage) : '',
      maxUsagePerUser: voucher.maxUsagePerUser != null ? String(voucher.maxUsagePerUser) : '',
      startDate: formatDateForInput(voucher.startDate),
      endDate: formatDateForInput(voucher.endDate),
      status: voucher.status || 'ACTIVE',
    });
  }, [voucher]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = form.code.trim().toUpperCase();
    if (!trimmedCode) {
      notificationService.error('Mã voucher không được để trống');
      return;
    }
    const pointsCost = parseInt(form.pointsCost, 10);
    if (!pointsCost || pointsCost <= 0) {
      notificationService.error('Voucher phải có điểm đổi lớn hơn 0');
      return;
    }
    if (!form.maxUsage && !form.maxUsagePerUser) {
      notificationService.error('Chọn ít nhất một giới hạn: toàn hệ thống hoặc trên tài khoản');
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
      pointsCost,
      minScore: Number(form.minScore) || 0,
      maxUsage: form.maxUsage ? parseInt(form.maxUsage, 10) : null,
      maxUsagePerUser: form.maxUsagePerUser ? parseInt(form.maxUsagePerUser, 10) : null,
      oncePerUser: false,
      startDate: formatDateForBackend(form.startDate),
      endDate: formatDateForBackend(form.endDate),
      status: form.status,
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await adminPromotionService.updatePromotion(voucher.id, promoData);
        notificationService.success('Cập nhật voucher thành công');
      } else {
        await adminPromotionService.createPromotion(promoData);
        notificationService.success('Tạo voucher thành công');
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">
        Voucher chỉ sử dụng được sau khi khách hàng đổi điểm để kích hoạt. Có thể giới hạn theo toàn hệ thống và/hoặc theo từng tài khoản.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Mã voucher *</label>
          <input className={`${adminInputClass} uppercase font-bold`} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
        </div>
        <div>
          <label className={adminLabelClass}>Điểm đổi *</label>
          <input type="number" min="1" className={adminInputClass} value={form.pointsCost} onChange={(e) => setForm((p) => ({ ...p, pointsCost: e.target.value }))} required />
        </div>
        <div>
          <label className={adminLabelClass}>Hạng thành viên *</label>
          <select className={`${adminInputClass} cursor-pointer`} value={form.minScore} onChange={(e) => setForm((p) => ({ ...p, minScore: Number(e.target.value) }))}>
            {TIER_FORM_OPTIONS.map((tier) => (
              <option key={tier.value} value={tier.value} style={{ background: '#0F1322' }}>{tier.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Loại giảm giá *</label>
          <select className={`${adminInputClass} cursor-pointer`} value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}>
            <option value="PERCENTAGE" style={{ background: '#0F1322' }}>Phần trăm (%)</option>
            <option value="FIXED_AMOUNT" style={{ background: '#0F1322' }}>Số tiền cố định (VND)</option>
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Giá trị giảm *</label>
          <input
            type="number"
            min={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
            step={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
            className={adminInputClass}
            value={form.discountValue}
            onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className={adminLabelClass}>Giới hạn toàn hệ thống</label>
          <input type="number" min="1" className={adminInputClass} placeholder="Không giới hạn" value={form.maxUsage} onChange={(e) => setForm((p) => ({ ...p, maxUsage: e.target.value }))} />
        </div>
        <div>
          <label className={adminLabelClass}>Giới hạn mỗi tài khoản</label>
          <input type="number" min="1" className={adminInputClass} placeholder="Không giới hạn" value={form.maxUsagePerUser} onChange={(e) => setForm((p) => ({ ...p, maxUsagePerUser: e.target.value }))} />
        </div>
        <div>
          <label className={adminLabelClass}>Ngày bắt đầu *</label>
          <input type="datetime-local" className={adminInputClass} value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
        </div>
        <div>
          <label className={adminLabelClass}>Ngày kết thúc *</label>
          <input type="datetime-local" className={adminInputClass} value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required />
        </div>
        <div>
          <label className={adminLabelClass}>Trạng thái *</label>
          <select className={`${adminInputClass} cursor-pointer`} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="ACTIVE" style={{ background: '#0F1322' }}>Hoạt động</option>
            <option value="INACTIVE" style={{ background: '#0F1322' }}>Vô hiệu</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Cập nhật' : 'Tạo voucher'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default VoucherFormPanel;
