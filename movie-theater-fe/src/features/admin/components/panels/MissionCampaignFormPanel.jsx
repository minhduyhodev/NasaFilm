import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminMissionService, MISSION_CAMPAIGN_STATUSES } from '../../api/adminMissionService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton, AdminDateTimePicker, AdminSelectDropdown } from '..';
import { adminInputClass, adminTextareaClass } from '../adminFormStyles';
import {
  formatMissionDateForBackend,
  formatMissionDateForInput,
  MISSION_CODE_PATTERN,
} from '../../utils/missionAdminUtils';

const emptyForm = {
  code: '',
  title: '',
  description: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  sortOrder: 0,
};

const STATUS_HINTS = {
  DRAFT: 'Nhiệm vụ gắn chiến dịch sẽ ẩn với khán giả.',
  ACTIVE: 'Chiến dịch hiện trên tab Nhiệm vụ của khách.',
  ARCHIVED: 'Đã kết thúc — nhiệm vụ gắn sẽ không hiện.',
};

const fieldLabelClass = 'mc-form__label';

const MissionCampaignFormPanel = ({ campaign, onSuccess, onCancel }) => {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const statusOptions = useMemo(
    () => MISSION_CAMPAIGN_STATUSES.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  useEffect(() => {
    if (!campaign) {
      setForm(emptyForm);
      return;
    }
    setForm({
      code: campaign.code || '',
      title: campaign.title || '',
      description: campaign.description || '',
      status: campaign.status || 'DRAFT',
      startsAt: campaign.startsAt ? formatMissionDateForInput(campaign.startsAt) : '',
      endsAt: campaign.endsAt ? formatMissionDateForInput(campaign.endsAt) : '',
      sortOrder: campaign.sortOrder ?? 0,
    });
  }, [campaign]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || !form.title.trim()) {
      notificationService.error('Mã và tên chiến dịch không được để trống.');
      return;
    }
    if (!MISSION_CODE_PATTERN.test(code)) {
      notificationService.error('Mã chỉ gồm chữ in hoa, số và dấu gạch dưới.');
      return;
    }
    if (form.status === 'ACTIVE' && (!form.startsAt || !form.endsAt)) {
      notificationService.error('Chiến dịch Đang chạy cần có thời gian bắt đầu và kết thúc.');
      return;
    }
    if (
      form.startsAt
      && form.endsAt
      && new Date(form.endsAt).getTime() < new Date(form.startsAt).getTime()
    ) {
      notificationService.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }
    setIsSaving(true);
    try {
      await adminMissionService.upsertCampaign({
        ...form,
        code,
        title: form.title.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: formatMissionDateForBackend(form.startsAt),
        endsAt: formatMissionDateForBackend(form.endsAt),
      });
      notificationService.success('Đã lưu chiến dịch.');
      onSuccess?.();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu chiến dịch.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mc-form mc-form--campaign">
      <section className="mc-form-section">
        <h3 className="mc-form-section__title">Thông tin chung</h3>
        <div className="mc-form-grid">
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Mã</label>
            <input
              className={`${adminInputClass} mc-form__input mc-form__input--line`}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="MUA_HE_2026"
              disabled={Boolean(campaign)}
            />
          </div>
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Tên</label>
            <input
              className={`${adminInputClass} mc-form__input mc-form__input--line`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Mùa hè NASA 2026"
            />
          </div>
          <div className="mc-form-field mc-form-field--full">
            <label className={fieldLabelClass}>Mô tả</label>
            <textarea
              className={`${adminTextareaClass} mc-form__textarea`}
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tùy chọn"
            />
          </div>
        </div>
      </section>

      <section className="mc-form-section">
        <h3 className="mc-form-section__title">Lịch trình</h3>
        <div className="mc-form-grid">
          <div className="mc-form-field">
            <AdminSelectDropdown
              label="Trạng thái"
              labelClassName={fieldLabelClass}
              value={form.status}
              options={statusOptions}
              onChange={(val) => setForm({ ...form, status: val })}
            />
          </div>
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Thứ tự hiển thị</label>
            <input
              type="number"
              min="0"
              className={`${adminInputClass} mc-form__input`}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>

          {STATUS_HINTS[form.status] && (
            <div className="mc-form-field mc-form-field--full">
              <p className={`mc-form-hint mc-form-hint--${form.status.toLowerCase()}`}>
                <AlertTriangle size={14} aria-hidden="true" />
                <span>{STATUS_HINTS[form.status]}</span>
              </p>
            </div>
          )}

          <div className="mc-form-field">
            <AdminDateTimePicker
              dateLabel="Bắt đầu"
              timeLabel="Giờ"
              value={form.startsAt}
              onChange={(v) => setForm({ ...form, startsAt: v })}
            />
          </div>
          <div className="mc-form-field">
            <AdminDateTimePicker
              dateLabel="Kết thúc"
              timeLabel="Giờ"
              value={form.endsAt}
              onChange={(v) => setForm({ ...form, endsAt: v })}
            />
          </div>
        </div>
      </section>

      <div className="mc-form-actions mc-form-actions--campaign">
        <PrimaryButton type="submit" className="mc-form__submit" disabled={isSaving} loading={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu'}
        </PrimaryButton>
        <GhostButton type="button" className="mc-form__cancel" onClick={onCancel}>
          Hủy
        </GhostButton>
      </div>
    </form>
  );
};

export default MissionCampaignFormPanel;
