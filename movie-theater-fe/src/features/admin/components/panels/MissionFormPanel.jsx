import { useEffect, useMemo, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import {
  adminMissionService,
  getMissionPreset,
  MISSION_CONDITION_TYPES,
  MISSION_PRESETS,
  MISSION_RECURRENCE_TYPES,
} from '../../api/adminMissionService';
import { getFeatureLabel, getMissionDisplayTitle, formatMissionDateForBackend, formatMissionDateForInput, MISSION_CODE_PATTERN } from '../../utils/missionAdminUtils';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton, AdminDateTimePicker, AdminSelectDropdown } from '..';
import { adminInputClass, adminTextareaClass } from '../adminFormStyles';

const CUSTOM_OPTION = '__CUSTOM__';

const CONDITION_JSON_DEFAULTS = {
  GENRE_WINDOW: '{"windowDays":30}',
  PREMIERE_BOOKING: '{"windowDays":3}',
  MATCHMAKER_QUIZ: '{}',
};

const emptyCustomForm = () => ({
  code: '',
  title: '',
  description: '',
  conditionType: 'GENRE_WINDOW',
  conditionJson: CONDITION_JSON_DEFAULTS.GENRE_WINDOW,
  recurrence: 'ONCE',
  campaignUuid: '',
  startsAt: '',
  endsAt: '',
  rewardPoints: 100,
  rewardBadgeCode: '',
  rewardBadgeTitle: '',
  requiresFeature: '',
  targetValue: 1,
  active: true,
  sortOrder: 0,
});

const buildFormFromPreset = (preset, overrides = {}) => ({
  code: preset.code,
  title: preset.title,
  description: preset.description,
  conditionType: preset.conditionType,
  conditionJson: preset.conditionJson,
  recurrence: preset.recurrence,
  campaignUuid: '',
  startsAt: '',
  endsAt: '',
  rewardPoints: preset.rewardPoints,
  rewardBadgeCode: preset.rewardBadgeCode || '',
  rewardBadgeTitle: preset.rewardBadgeTitle || '',
  requiresFeature: preset.requiresFeature || '',
  targetValue: preset.targetValue,
  active: true,
  sortOrder: preset.sortOrder,
  ...overrides,
});

const buildFormFromTemplate = (template) => ({
  code: template.code || '',
  title: template.title || '',
  description: template.description || '',
  conditionType: template.conditionType || 'GENRE_WINDOW',
  conditionJson: template.conditionJson || '{}',
  recurrence: template.recurrence || 'ONCE',
  campaignUuid: template.campaignUuid ? String(template.campaignUuid) : '',
  startsAt: template.startsAt ? formatMissionDateForInput(template.startsAt) : '',
  endsAt: template.endsAt ? formatMissionDateForInput(template.endsAt) : '',
  rewardPoints: template.rewardPoints ?? 0,
  rewardBadgeCode: template.rewardBadgeCode || '',
  rewardBadgeTitle: template.rewardBadgeTitle || '',
  requiresFeature: template.requiresFeature || '',
  targetValue: template.targetValue ?? 1,
  active: template.active !== false,
  sortOrder: template.sortOrder ?? 0,
});

const resolveFormForCode = (code, existingTemplates) => {
  const existing = existingTemplates.find((item) => item.code === code);
  if (existing) {
    return buildFormFromTemplate(existing);
  }
  const preset = getMissionPreset(code);
  return preset ? buildFormFromPreset(preset) : null;
};

const resolveRequiresFeature = (conditionType) =>
  conditionType === 'ORBIT_ROOM_JOIN' ? 'ORBIT_SEAT' : '';

const parseWindowDays = (conditionJson) => {
  try {
    const parsed = JSON.parse(conditionJson || '{}');
    return parsed.windowDays ?? '';
  } catch {
    return '';
  }
};

const withWindowDays = (conditionJson, days) => {
  try {
    const parsed = JSON.parse(conditionJson || '{}');
    return JSON.stringify({ ...parsed, windowDays: Number(days) || 1 });
  } catch {
    return JSON.stringify({ windowDays: Number(days) || 1 });
  }
};

const usesWindowDays = (conditionType) =>
  conditionType === 'GENRE_WINDOW' || conditionType === 'PREMIERE_BOOKING';

const fieldLabelClass = 'mc-form__label';

const MissionFormPanel = ({
  template,
  campaigns = [],
  existingTemplates = [],
  onSuccess,
  onCancel,
}) => {
  const isEditing = Boolean(template?.code);
  const usedCodes = useMemo(
    () => new Set(existingTemplates.map((item) => item.code)),
    [existingTemplates],
  );

  const [mode, setMode] = useState('preset');
  const [form, setForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState({ info: false, reward: false, schedule: false });
  const infoRef = useRef(null);
  const rewardRef = useRef(null);
  const scheduleRef = useRef(null);
  const sectionRefs = { info: infoRef, reward: rewardRef, schedule: scheduleRef };

  const touchSection = (section) => {
    setTouched((prev) => (prev[section] ? prev : { ...prev, [section]: true }));
  };

  const updateForm = (section, patch) => {
    touchSection(section);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (template) {
      const nextForm = buildFormFromTemplate(template);
      setForm(nextForm);
      setMode(getMissionPreset(template.code) ? 'preset' : 'custom');
      setTouched({
        info: Boolean(nextForm.title?.trim() && nextForm.code?.trim()),
        reward: Number(nextForm.targetValue) > 0 || Number(nextForm.rewardPoints) > 0,
        schedule: Boolean(nextForm.startsAt || nextForm.endsAt),
      });
      return;
    }

    const firstOpenPreset = MISSION_PRESETS.find((item) => !usedCodes.has(item.code));
    if (firstOpenPreset) {
      setMode('preset');
      setForm(resolveFormForCode(firstOpenPreset.code, existingTemplates));
      setTouched({ info: false, reward: false, schedule: false });
      return;
    }

    setMode('custom');
    setForm(emptyCustomForm());
    setTouched({ info: false, reward: false, schedule: false });
  }, [template, existingTemplates, usedCodes]);

  const preset = getMissionPreset(form?.code);
  const isCustomMission = mode === 'custom' || (isEditing && !preset);
  const selectValue = mode === 'custom' ? CUSTOM_OPTION : form?.code || '';
  const showWindowDays = form ? usesWindowDays(form.conditionType) : false;

  const typeOptions = useMemo(
    () => [
      ...MISSION_PRESETS.map((item) => ({
        value: item.code,
        label: usedCodes.has(item.code)
          ? `${item.label}${existingTemplates.find((t) => t.code === item.code)?.deletedAt ? ' (đã xóa — hãy khôi phục)' : ' (đã dùng)'}`
          : item.label,
        disabled: usedCodes.has(item.code),
      })),
      { value: CUSTOM_OPTION, label: 'Loại mới…' },
    ],
    [usedCodes],
  );

  const conditionOptions = useMemo(
    () => MISSION_CONDITION_TYPES.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  const recurrenceOptions = useMemo(
    () => MISSION_RECURRENCE_TYPES.map((item) => ({ value: item.value, label: item.label })),
    [],
  );

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Không gắn' },
      ...campaigns.map((campaign) => ({
        value: String(campaign.uuid),
        label: campaign.title,
      })),
    ],
    [campaigns],
  );

  const steps = useMemo(() => {
    if (!form) return [];
    const hasInfo =
      Boolean(form.title?.trim())
      && Boolean(form.code?.trim());
    const hasReward =
      Number(form.targetValue) > 0
      && (
        Number(form.rewardPoints) > 0
        || Boolean(form.rewardBadgeCode?.trim())
        || Boolean(form.rewardBadgeTitle?.trim())
      );
    const hasSchedule = Boolean(form.startsAt || form.endsAt);
    return [
      { id: 'info', label: 'Thông tin chung', done: touched.info && hasInfo },
      { id: 'reward', label: 'Phần thưởng & Mục tiêu', done: touched.reward && hasReward },
      { id: 'schedule', label: 'Lịch trình', done: touched.schedule && hasSchedule },
    ];
  }, [form, touched]);

  const handleTypeChange = (value) => {
    if (value === CUSTOM_OPTION) {
      setMode('custom');
      setForm(emptyCustomForm());
      setTouched({ info: true, reward: false, schedule: false });
      return;
    }
    setMode('preset');
    const nextForm = resolveFormForCode(value, existingTemplates);
    if (nextForm) {
      setForm(nextForm);
      const hasReward =
        Number(nextForm.targetValue) > 0
        && (
          Number(nextForm.rewardPoints) > 0
          || Boolean(nextForm.rewardBadgeCode?.trim())
          || Boolean(nextForm.rewardBadgeTitle?.trim())
        );
      setTouched({
        info: Boolean(nextForm.title?.trim() && nextForm.code?.trim()),
        reward: hasReward,
        schedule: Boolean(nextForm.startsAt || nextForm.endsAt),
      });
    }
  };

  const handleConditionChange = (conditionType) => {
    updateForm('info', {
      conditionType,
      conditionJson: CONDITION_JSON_DEFAULTS[conditionType] || '{}',
      requiresFeature: resolveRequiresFeature(conditionType),
    });
  };

  const scrollToSection = (id) => {
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = form?.code?.trim().toUpperCase();
    if (!code) {
      notificationService.error(isCustomMission ? 'Mã nhiệm vụ không được để trống.' : 'Hãy chọn loại nhiệm vụ.');
      return;
    }
    if (!MISSION_CODE_PATTERN.test(code)) {
      notificationService.error('Mã chỉ gồm chữ in hoa, số và dấu gạch dưới.');
      return;
    }
    if (!form.title.trim()) {
      notificationService.error('Tên không được để trống.');
      return;
    }
    if (!isEditing && usedCodes.has(code)) {
      const existing = existingTemplates.find((item) => String(item.code).toUpperCase() === code);
      notificationService.error(
        existing?.deletedAt
          ? 'Mã này đang ở mục đã xóa. Hãy khôi phục hoặc chọn mã khác.'
          : 'Mã này đã tồn tại. Hãy chọn mã khác hoặc Sửa nhiệm vụ hiện có.',
      );
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
      await adminMissionService.upsertTemplate({
        ...form,
        code,
        title: form.title.trim(),
        description: form.description.trim(),
        campaignUuid: form.campaignUuid || null,
        rewardBadgeCode: form.rewardBadgeCode?.trim() || null,
        rewardBadgeTitle: form.rewardBadgeTitle?.trim() || null,
        requiresFeature: form.requiresFeature?.trim() || null,
        startsAt: formatMissionDateForBackend(form.startsAt),
        endsAt: formatMissionDateForBackend(form.endsAt),
      });
      notificationService.success(isEditing ? 'Đã cập nhật nhiệm vụ.' : 'Đã thêm nhiệm vụ.');
      onSuccess?.();
    } catch (error) {
      notificationService.error(error.message || 'Không thể lưu nhiệm vụ.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!form) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="mc-form mc-form--wizard">
      <nav className="mc-form-stepper" aria-label="Tiến trình form">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`mc-form-stepper__item ${step.done ? 'is-done' : ''} ${
              index > 0 && steps[index - 1]?.done ? 'has-prev-done' : ''
            }`}
            onClick={() => scrollToSection(step.id)}
          >
            <span className="mc-form-stepper__dot" aria-hidden="true" />
            <span className="mc-form-stepper__label">{step.label}</span>
          </button>
        ))}
      </nav>

      <section ref={infoRef} className="mc-form-section" id="mc-section-info">
        <h3 className="mc-form-section__title">Thông tin chung</h3>
        <div className="mc-form-grid">
          {isEditing ? (
            isCustomMission ? (
              <div className="mc-form-field mc-form-field--full">
                <label className={fieldLabelClass}>Mã</label>
                <div className="mc-form-static">{form.code}</div>
              </div>
            ) : (
              <div className="mc-form-field mc-form-field--full">
                <label className={fieldLabelClass}>Loại</label>
                <div className="mc-form-static">
                  {preset?.label || getMissionDisplayTitle({ code: form.code, title: form.title })}
                </div>
              </div>
            )
          ) : (
            <div className="mc-form-field mc-form-field--full">
              <AdminSelectDropdown
                label="Loại"
                labelClassName={fieldLabelClass}
                value={selectValue}
                options={typeOptions}
                onChange={handleTypeChange}
                placeholder="Chọn loại nhiệm vụ"
              />
            </div>
          )}

          <div className="mc-form-field mc-form-field--full">
            <AdminSelectDropdown
              label="Chiến dịch"
              labelClassName={fieldLabelClass}
              value={form.campaignUuid ? String(form.campaignUuid) : ''}
              options={campaignOptions}
              onChange={(val) => updateForm('info', { campaignUuid: val })}
            />
          </div>

          {isCustomMission && !isEditing && (
            <div className="mc-form-field">
              <label className={fieldLabelClass}>Mã</label>
              <input
                className={`${adminInputClass} mc-form__input`}
                value={form.code}
                onChange={(e) => updateForm('info', { code: e.target.value.toUpperCase() })}
                placeholder="SUMMER_WATCH"
              />
            </div>
          )}

          {isCustomMission && (
            <div className={`mc-form-field ${isEditing ? 'mc-form-field--full' : ''}`}>
              <AdminSelectDropdown
                label="Hành động theo dõi"
                labelClassName={fieldLabelClass}
                value={form.conditionType}
                options={conditionOptions}
                onChange={handleConditionChange}
              />
            </div>
          )}

          <div className="mc-form-field mc-form-field--full">
            <label className={fieldLabelClass}>Tên</label>
            <input
              className={`${adminInputClass} mc-form__input`}
              value={form.title}
              onChange={(e) => updateForm('info', { title: e.target.value })}
              placeholder="Xem 5 phim mùa hè"
            />
          </div>

          <div className="mc-form-field mc-form-field--full">
            <label className={fieldLabelClass}>Mô tả</label>
            <textarea
              className={`${adminTextareaClass} mc-form__textarea`}
              rows={3}
              value={form.description}
              onChange={(e) => updateForm('info', { description: e.target.value })}
              placeholder="Mô tả nhiệm vụ cho khán giả..."
            />
          </div>
        </div>
      </section>

      <section ref={rewardRef} className="mc-form-section" id="mc-section-reward">
        <h3 className="mc-form-section__title">Phần thưởng & Mục tiêu</h3>
        <div className="mc-form-grid">
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Mục tiêu</label>
            <input
              type="number"
              min="1"
              className={`${adminInputClass} mc-form__input`}
              value={form.targetValue}
              onChange={(e) => updateForm('reward', { targetValue: Number(e.target.value) })}
            />
          </div>
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Điểm</label>
            <div className="mc-form-points">
              <input
                type="number"
                min="0"
                className={`${adminInputClass} mc-form__input`}
                value={form.rewardPoints}
                onChange={(e) => updateForm('reward', { rewardPoints: Number(e.target.value) })}
              />
              <Star className="mc-form-points__icon" size={14} fill="currentColor" />
            </div>
          </div>
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Mã huy hiệu</label>
            <input
              className={`${adminInputClass} mc-form__input`}
              value={form.rewardBadgeCode}
              onChange={(e) => updateForm('reward', { rewardBadgeCode: e.target.value })}
              placeholder="EXPLORER_BADGE"
            />
          </div>
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Tên huy hiệu</label>
            <input
              className={`${adminInputClass} mc-form__input`}
              value={form.rewardBadgeTitle}
              onChange={(e) => updateForm('reward', { rewardBadgeTitle: e.target.value })}
              placeholder="Nhà thám hiểm"
            />
          </div>
        </div>

        <label className={`mc-form-switch ${form.active ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => updateForm('reward', { active: e.target.checked })}
          />
          <span className="mc-form-switch__track" aria-hidden="true">
            <span className="mc-form-switch__thumb" />
          </span>
          <span className="mc-form-switch__text">{form.active ? 'Đang bật' : 'Đã tắt'}</span>
        </label>
      </section>

      <section ref={scheduleRef} className="mc-form-section" id="mc-section-schedule">
        <h3 className="mc-form-section__title">Lịch trình</h3>
        <div className={`mc-form-grid ${showWindowDays ? 'mc-form-grid--3' : ''}`}>
          <div className="mc-form-field">
            <AdminSelectDropdown
              label="Chu kỳ"
              labelClassName={fieldLabelClass}
              value={form.recurrence}
              options={recurrenceOptions}
              onChange={(val) => updateForm('schedule', { recurrence: val })}
            />
          </div>
          {showWindowDays && (
            <div className="mc-form-field">
              <label className={fieldLabelClass}>Cửa sổ (ngày)</label>
              <input
                type="number"
                min="1"
                max="365"
                className={`${adminInputClass} mc-form__input`}
                value={parseWindowDays(form.conditionJson)}
                onChange={(e) => {
                  touchSection('schedule');
                  setForm((prev) => ({
                    ...prev,
                    conditionJson: withWindowDays(prev.conditionJson, e.target.value),
                  }));
                }}
              />
            </div>
          )}
          <div className="mc-form-field">
            <label className={fieldLabelClass}>Thứ tự hiển thị</label>
            <input
              type="number"
              min="0"
              className={`${adminInputClass} mc-form__input`}
              value={form.sortOrder}
              onChange={(e) => updateForm('schedule', { sortOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="mc-form-grid mc-form-grid--schedule">
          <div className="mc-form-field">
            <AdminDateTimePicker
              dateLabel="Bắt đầu"
              timeLabel="Giờ"
              value={form.startsAt}
              onChange={(v) => updateForm('schedule', { startsAt: v })}
            />
          </div>
          <div className="mc-form-field">
            <AdminDateTimePicker
              dateLabel="Kết thúc"
              timeLabel="Giờ"
              value={form.endsAt}
              onChange={(v) => updateForm('schedule', { endsAt: v })}
            />
          </div>
        </div>
      </section>

      {form.campaignUuid && (
        <p className="mc-form-note">
          Nhiệm vụ chỉ hiện với khán giả khi chiến dịch <strong>Đang chạy</strong> và còn trong thời gian.
        </p>
      )}

      {form.requiresFeature && (
        <p className="mc-form-note">
          Khóa tới khi có {getFeatureLabel(form.requiresFeature)}.
          {form.code === 'SOCIAL_ORBIT' && ' Tính năng chưa kích hoạt trên hệ thống.'}
        </p>
      )}

      <div className="mc-form-actions">
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

export default MissionFormPanel;
