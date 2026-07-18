import { useEffect, useState } from 'react';
import { Coins, Zap } from 'lucide-react';
import { adminPromotionService } from '../../api/adminPromotionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { systemConfigService } from '../../../../shared/services/systemConfigService';
import { getPointsToCashValue } from '../../../../shared/utils/systemConfig';
import { TIER_FORM_OPTIONS } from '../../../../shared/utils/memberTiers';
import { formatDateForInput, formatDateForBackend, validateVoucherDiscountValue, validateVoucherSchedule } from '../../utils/voucherFormUtils';
import { PrimaryButton, GhostButton, AdminDateTimePicker } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';
import './VoucherFormPanel.css';

const VOUCHER_TYPES = {
  REDEEM: 'REDEEM',
  DIRECT: 'DIRECT',
};

const emptyForm = {
  voucherType: VOUCHER_TYPES.REDEEM,
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

  const isDirectType = form.voucherType === VOUCHER_TYPES.DIRECT;

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
    const isDirect = (voucher.pointsCost ?? 0) <= 0;
    setForm({
      voucherType: isDirect ? VOUCHER_TYPES.DIRECT : VOUCHER_TYPES.REDEEM,
      code: voucher.code || '',
      discountType: voucher.discountType || 'PERCENTAGE',
      discountValue:
        voucher.discountType === 'PERCENTAGE'
          ? String(Math.round(voucher.discountValue * 100))
          : String(voucher.discountValue),
      pointsCost: isDirect ? '' : String(voucher.pointsCost ?? ''),
      minScore: voucher.minScore ?? 0,
      maxUsage: voucher.maxUsage != null ? String(voucher.maxUsage) : '',
      maxUsagePerUser: voucher.maxUsagePerUser != null ? String(voucher.maxUsagePerUser) : '',
      startDate: formatDateForInput(voucher.startDate),
      endDate: formatDateForInput(voucher.endDate),
      status: voucher.status === 'DELETED' ? 'INACTIVE' : (voucher.status || 'ACTIVE'),
    });
  }, [voucher]);

  const handleTypeChange = (voucherType) => {
    setForm((prev) => ({
      ...prev,
      voucherType,
      pointsCost: voucherType === VOUCHER_TYPES.DIRECT ? '' : prev.pointsCost,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = form.code.trim().toUpperCase();
    if (!trimmedCode) {
      notificationService.error('Mã voucher không được để trống');
      return;
    }

    let pointsCost = 0;
    if (isDirectType) {
      if (!form.maxUsage) {
        notificationService.error('Voucher khả dụng trực tiếp phải có giới hạn lượt sử dụng toàn hệ thống');
        return;
      }
    } else {
      pointsCost = parseInt(form.pointsCost, 10);
      if (!pointsCost || pointsCost <= 0) {
        notificationService.error('Voucher đổi điểm phải có số điểm lớn hơn 0');
        return;
      }
      if (!form.maxUsage && !form.maxUsagePerUser) {
        notificationService.error('Chọn ít nhất một giới hạn: toàn hệ thống hoặc mỗi tài khoản');
        return;
      }
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
      <fieldset className="voucher-type-picker">
        <legend className={adminLabelClass}>Loại voucher *</legend>
        <div className="voucher-type-picker__grid">
          <button
            type="button"
            onClick={() => handleTypeChange(VOUCHER_TYPES.REDEEM)}
            className={`voucher-type-option voucher-type-option--redeem${!isDirectType ? ' is-active' : ''}`}
            aria-pressed={!isDirectType}
          >
            <span className="voucher-type-option__icon"><Coins size={18} /></span>
            <span className="voucher-type-option__content">
              <strong>Đổi điểm</strong>
              <small>Khách dùng điểm tích lũy để nhận voucher</small>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange(VOUCHER_TYPES.DIRECT)}
            className={`voucher-type-option voucher-type-option--direct${isDirectType ? ' is-active' : ''}`}
            aria-pressed={isDirectType}
          >
            <span className="voucher-type-option__icon"><Zap size={18} /></span>
            <span className="voucher-type-option__content">
              <strong>Dùng trực tiếp</strong>
              <small>Voucher miễn phí, áp dụng ngay khi thanh toán</small>
            </span>
          </button>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Mã voucher *</label>
          <input className={`${adminInputClass} uppercase font-bold`} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
        </div>
        {!isDirectType && (
          <div>
            <label className={adminLabelClass}>Điểm đổi *</label>
            <input
              type="number"
              min="1"
              className={adminInputClass}
              value={form.pointsCost}
              onChange={(e) => setForm((p) => ({ ...p, pointsCost: e.target.value }))}
              required={!isDirectType}
            />
          </div>
        )}
        <div>
          <label className={adminLabelClass}>Hạng thành viên *</label>
          <select className={adminSelectClass} value={form.minScore} onChange={(e) => setForm((p) => ({ ...p, minScore: Number(e.target.value) }))}>
            {TIER_FORM_OPTIONS.map((tier) => (
              <option key={tier.value} value={tier.value}>{tier.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={adminLabelClass}>Loại giảm giá *</label>
          <select className={adminSelectClass} value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}>
            <option value="PERCENTAGE">Phần trăm (%)</option>
            <option value="FIXED_AMOUNT">Số tiền cố định (VND)</option>
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
          <label className={adminLabelClass}>
            {isDirectType ? 'Giới hạn lượt sử dụng toàn hệ thống *' : 'Giới hạn lượt đổi toàn hệ thống'}
          </label>
          <input
            type="number"
            min="1"
            className={adminInputClass}
            placeholder={isDirectType ? 'Bắt buộc' : 'Không giới hạn'}
            value={form.maxUsage}
            onChange={(e) => setForm((p) => ({ ...p, maxUsage: e.target.value }))}
            required={isDirectType}
          />
        </div>
        <div>
          <label className={adminLabelClass}>
            {isDirectType ? 'Giới hạn sử dụng mỗi tài khoản' : 'Giới hạn đổi mỗi tài khoản'}
          </label>
          <input type="number" min="1" className={adminInputClass} placeholder="Không giới hạn" value={form.maxUsagePerUser} onChange={(e) => setForm((p) => ({ ...p, maxUsagePerUser: e.target.value }))} />
        </div>
        <div>
          <label className={adminLabelClass}>Trạng thái *</label>
          <select className={adminSelectClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Vô hiệu</option>
          </select>
        </div>
        <AdminDateTimePicker
          className="sm:col-span-2"
          label="Ngày bắt đầu *"
          dateLabel=""
          timeLabel=""
          value={form.startDate}
          onChange={(v) => setForm((p) => ({ ...p, startDate: v }))}
          required
        />
        <AdminDateTimePicker
          className="sm:col-span-2"
          label="Ngày kết thúc *"
          dateLabel=""
          timeLabel=""
          value={form.endDate}
          onChange={(v) => setForm((p) => ({ ...p, endDate: v }))}
          required
        />
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
