import { useEffect, useMemo, useState } from 'react';
import { Coins, Zap } from 'lucide-react';
import { adminPromotionService } from '../../api/adminPromotionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { systemConfigService } from '../../../../shared/services/systemConfigService';
import { getPointsToCashValue } from '../../../../shared/utils/systemConfig';
import { TIER_FORM_OPTIONS } from '../../../../shared/utils/memberTiers';
import {
  formatDateForInput,
  formatDateForBackend,
  validateVoucherDiscountValue,
  validateVoucherSchedule,
} from '../../utils/voucherFormUtils';
import { PrimaryButton, GhostButton, AdminDateTimePicker, AdminSelectDropdown } from '..';
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

  const tierOptions = useMemo(
    () => TIER_FORM_OPTIONS.map((tier) => ({ value: tier.value, label: tier.label })),
    [],
  );
  const discountTypeOptions = [
    { value: 'PERCENTAGE', label: 'Phần trăm (%)' },
    { value: 'FIXED_AMOUNT', label: 'Số tiền cố định (VND)' },
  ];
  const statusOptions = [
    { value: 'ACTIVE', label: 'Hoạt động' },
    { value: 'INACTIVE', label: 'Vô hiệu' },
  ];

  useEffect(() => {
    systemConfigService
      .getConfig()
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
      status: voucher.status === 'DELETED' ? 'INACTIVE' : voucher.status || 'ACTIVE',
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
      const maxUsage = Number.parseInt(form.maxUsage, 10);
      if (!form.maxUsage || Number.isNaN(maxUsage) || maxUsage <= 0) {
        notificationService.error('Voucher khả dụng trực tiếp phải có giới hạn lượt sử dụng lớn hơn 0');
        return;
      }
    } else {
      pointsCost = parseInt(form.pointsCost, 10);
      if (!pointsCost || pointsCost <= 0) {
        notificationService.error('Voucher đổi điểm phải có số điểm lớn hơn 0');
        return;
      }
      const maxUsage = form.maxUsage ? Number.parseInt(form.maxUsage, 10) : null;
      const maxUsagePerUser = form.maxUsagePerUser
        ? Number.parseInt(form.maxUsagePerUser, 10)
        : null;
      if (
        (maxUsage == null || Number.isNaN(maxUsage) || maxUsage <= 0)
        && (maxUsagePerUser == null || Number.isNaN(maxUsagePerUser) || maxUsagePerUser <= 0)
      ) {
        notificationService.error('Chọn ít nhất một giới hạn (> 0): toàn hệ thống hoặc mỗi tài khoản');
        return;
      }
    }

    const discountError = validateVoucherDiscountValue(
      form.discountType,
      form.discountValue,
      pointsToCashValue,
    );
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
    <form onSubmit={handleSubmit} className="voucher-form">
      <fieldset className="voucher-type-picker">
        <legend className="voucher-form__label">
          Loại voucher<span className="voucher-form__req"> *</span>
        </legend>
        <div className="voucher-type-picker__grid">
          <button
            type="button"
            onClick={() => handleTypeChange(VOUCHER_TYPES.REDEEM)}
            className={`voucher-type-option voucher-type-option--redeem${!isDirectType ? ' is-active' : ''}`}
            aria-pressed={!isDirectType}
          >
            <span className="voucher-type-option__icon" aria-hidden="true">
              <Coins size={18} strokeWidth={2} />
            </span>
            <span className="voucher-type-option__content">
              <strong className="voucher-type-option__title">Đổi điểm</strong>
              <span className="voucher-type-option__desc">Khách dùng điểm tích lũy để nhận voucher</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange(VOUCHER_TYPES.DIRECT)}
            className={`voucher-type-option voucher-type-option--direct${isDirectType ? ' is-active' : ''}`}
            aria-pressed={isDirectType}
          >
            <span className="voucher-type-option__icon" aria-hidden="true">
              <Zap size={18} strokeWidth={2} />
            </span>
            <span className="voucher-type-option__content">
              <strong className="voucher-type-option__title">Dùng trực tiếp</strong>
              <span className="voucher-type-option__desc">Voucher miễn phí, áp dụng ngay khi thanh toán</span>
            </span>
          </button>
        </div>
      </fieldset>

      <div className="voucher-form__grid voucher-form__grid--2">
        <div className="voucher-form__field">
          <label className="voucher-form__label">
            Mã voucher<span className="voucher-form__req"> *</span>
          </label>
          <input
            className="voucher-form__input voucher-form__input--code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="VD: CINELUXE50"
            required
          />
        </div>
        <div className="voucher-form__field">
          <label className="voucher-form__label">
            Điểm đổi{!isDirectType ? <span className="voucher-form__req"> *</span> : null}
          </label>
          <input
            type="number"
            min="1"
            className="voucher-form__input"
            value={form.pointsCost}
            onChange={(e) => setForm((p) => ({ ...p, pointsCost: e.target.value }))}
            placeholder={isDirectType ? 'Không áp dụng' : 'Nhập số điểm'}
            disabled={isDirectType}
            required={!isDirectType}
          />
        </div>
      </div>

      <div className="voucher-form__grid voucher-form__grid--3">
        <AdminSelectDropdown
          label="Hạng thành viên *"
          labelClassName="voucher-form__label"
          value={form.minScore}
          options={tierOptions}
          onChange={(val) => setForm((p) => ({ ...p, minScore: Number(val) }))}
        />
        <AdminSelectDropdown
          label="Loại giảm giá *"
          labelClassName="voucher-form__label"
          value={form.discountType}
          options={discountTypeOptions}
          onChange={(val) => setForm((p) => ({ ...p, discountType: val }))}
        />
        <div className="voucher-form__field">
          <label className="voucher-form__label">
            Giá trị giảm<span className="voucher-form__req"> *</span>
          </label>
          <input
            type="number"
            min={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
            step={form.discountType === 'FIXED_AMOUNT' ? pointsToCashValue : 1}
            className="voucher-form__input"
            value={form.discountValue}
            onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
            placeholder={form.discountType === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Số tiền (VND)'}
            required
          />
        </div>
      </div>

      <div className="voucher-form__grid voucher-form__grid--3">
        <div className="voucher-form__field">
          <label className="voucher-form__label">
            Giới hạn lượt sử dụng hệ thống
            {isDirectType ? <span className="voucher-form__req"> *</span> : null}
          </label>
          <input
            type="number"
            min="1"
            className="voucher-form__input"
            placeholder={isDirectType ? 'Bắt buộc' : 'Không giới hạn'}
            value={form.maxUsage}
            onChange={(e) => setForm((p) => ({ ...p, maxUsage: e.target.value }))}
            required={isDirectType}
          />
        </div>
        <div className="voucher-form__field">
          <label className="voucher-form__label">
            {isDirectType ? 'Giới hạn sử dụng mỗi tài khoản' : 'Giới hạn đổi mỗi tài khoản'}
          </label>
          <input
            type="number"
            min="1"
            className="voucher-form__input"
            placeholder="Không giới hạn"
            value={form.maxUsagePerUser}
            onChange={(e) => setForm((p) => ({ ...p, maxUsagePerUser: e.target.value }))}
          />
        </div>
        <AdminSelectDropdown
          label="Trạng thái *"
          labelClassName="voucher-form__label"
          value={form.status}
          options={statusOptions}
          onChange={(val) => setForm((p) => ({ ...p, status: val }))}
        />
      </div>

      <div className="voucher-form__grid voucher-form__grid--2">
        <AdminDateTimePicker
          label="Ngày bắt đầu *"
          dateLabel=""
          timeLabel=""
          value={form.startDate}
          onChange={(v) => setForm((p) => ({ ...p, startDate: v }))}
          required
        />
        <AdminDateTimePicker
          label="Ngày kết thúc *"
          dateLabel=""
          timeLabel=""
          value={form.endDate}
          onChange={(v) => setForm((p) => ({ ...p, endDate: v }))}
          required
        />
      </div>

      <div className="voucher-form__actions">
        <PrimaryButton
          type="submit"
          className="voucher-form__submit"
          loading={isSaving}
          disabled={isSaving}
        >
          {isEditing ? 'Cập nhật' : 'Tạo voucher'}
        </PrimaryButton>
        <GhostButton type="button" className="voucher-form__cancel" onClick={onCancel}>
          Hủy
        </GhostButton>
      </div>
    </form>
  );
};

export default VoucherFormPanel;
