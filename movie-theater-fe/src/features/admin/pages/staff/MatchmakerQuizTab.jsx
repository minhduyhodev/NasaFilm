import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminDiscoverService } from '../../api/adminDiscoverService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import { AdminModal, AdminSelectDropdown, GhostButton, PrimaryButton } from '../../components';
import { adminInputClass, adminLabelClass } from '../../components/adminFormStyles';
import MatchmakerSuggestionsTab from './MatchmakerSuggestionsTab';

const GROUP_OPTIONS = [
  { value: 'MOOD', label: 'Tâm trạng' },
  { value: 'DURATION', label: 'Thời lượng' },
  { value: 'VIEWING', label: 'Nơi xem' },
];

const GROUP_LABELS = {
  MOOD: 'Tâm trạng',
  DURATION: 'Thời lượng',
  VIEWING: 'Nơi xem',
};

const emptyOptionForm = () => ({
  optionGroup: 'MOOD',
  optionKey: '',
  label: '',
  hint: '',
  iconKey: '',
  code: '',
  sortOrder: 0,
  active: true,
});

const MatchmakerQuizTab = ({ onConfigChange }) => {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOption, setSavingOption] = useState(false);
  const [config, setConfig] = useState(null);
  const [settings, setSettings] = useState({
    maxMatches: 3,
    maxGenreSelections: 2,
    authenticatedQuestionCount: 5,
    guestQuestionCount: 4,
  });
  const [optionModal, setOptionModal] = useState({ open: false, option: null });
  const [optionForm, setOptionForm] = useState(emptyOptionForm());

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await adminDiscoverService.getQuizConfig();
      setConfig(data);
      setSettings({
        maxMatches: data.maxMatches ?? 3,
        maxGenreSelections: data.maxGenreSelections ?? 2,
        authenticatedQuestionCount: data.authenticatedQuestionCount ?? 5,
        guestQuestionCount: data.guestQuestionCount ?? 4,
      });
      onConfigChange?.(data);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải cấu hình quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const data = await adminDiscoverService.updateQuizSettings({
        maxMatches: Number(settings.maxMatches),
        maxGenreSelections: Number(settings.maxGenreSelections),
        authenticatedQuestionCount: Math.min(5, Math.max(3, Number(settings.authenticatedQuestionCount) || 5)),
        guestQuestionCount: Math.min(5, Math.max(3, Number(settings.guestQuestionCount) || 4)),
      });
      setConfig(data);
      notificationService.success('Đã lưu cấu hình quiz');
      onConfigChange?.(data);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể lưu cấu hình');
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreateOption = () => {
    setOptionForm(emptyOptionForm());
    setOptionModal({ open: true, option: null });
  };

  const openEditOption = (option) => {
    setOptionForm({
      optionGroup: option.optionGroup || 'MOOD',
      optionKey: option.key || '',
      label: option.label || '',
      hint: option.hint || '',
      iconKey: option.iconKey || '',
      code: option.code || '',
      sortOrder: option.sortOrder ?? 0,
      active: option.active !== false,
    });
    setOptionModal({ open: true, option });
  };

  const handleSaveOption = async (e) => {
    e.preventDefault();
    setSavingOption(true);
    try {
      const payload = {
        optionGroup: optionForm.optionGroup,
        optionKey: optionForm.optionKey.trim().toUpperCase(),
        label: optionForm.label.trim(),
        hint: optionForm.hint.trim() || null,
        iconKey: optionForm.iconKey.trim() || null,
        code: optionForm.code.trim() || null,
        sortOrder: Number(optionForm.sortOrder) || 0,
        active: Boolean(optionForm.active),
      };
      if (optionModal.option?.uuid) {
        await adminDiscoverService.updateQuizOption(optionModal.option.uuid, payload);
        notificationService.success('Đã cập nhật lựa chọn');
      } else {
        await adminDiscoverService.createQuizOption(payload);
        notificationService.success('Đã tạo lựa chọn');
      }
      setOptionModal({ open: false, option: null });
      await loadConfig();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể lưu lựa chọn');
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteOption = async (option) => {
    const ok = await confirm({
      title: 'Xóa lựa chọn quiz',
      message: 'Lựa chọn sẽ bị xóa khỏi cấu hình Matchmaker.',
      highlight: option.label || option.key,
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminDiscoverService.deleteQuizOption(option.uuid);
      notificationService.success('Đã xóa lựa chọn');
      await loadConfig();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xóa lựa chọn');
    }
  };

  if (loading && !config) {
    return (
      <div className="matchmaker-analytics__loading">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        <span>Đang tải cấu hình quiz...</span>
      </div>
    );
  }

  const options = config?.options || [];
  const moodOptions = (options || []).filter((item) => item.optionGroup === 'MOOD');

  return (
    <div className="mma-manage">
      <section className="mma-manage__panel">
        <div className="mma-manage__panel-head">
          <h2 className="mma-manage__title">Giới hạn quiz</h2>
          <p className="mma-manage__sub">Số phim gợi ý, số thể loại và số câu hỏi theo trạng thái đăng nhập.</p>
        </div>
        <form className="mma-manage__settings-grid" onSubmit={handleSaveSettings}>
          <label className={adminLabelClass}>
            Số phim gợi ý tối đa
            <input
              className={adminInputClass}
              type="number"
              min={1}
              max={10}
              value={settings.maxMatches}
              onChange={(e) => setSettings((prev) => ({ ...prev, maxMatches: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Số thể loại tối đa
            <input
              className={adminInputClass}
              type="number"
              min={1}
              max={5}
              value={settings.maxGenreSelections}
              onChange={(e) => setSettings((prev) => ({ ...prev, maxGenreSelections: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Số câu hỏi (đã đăng nhập)
            <input
              className={adminInputClass}
              type="number"
              min={3}
              max={5}
              value={settings.authenticatedQuestionCount}
              onChange={(e) => setSettings((prev) => ({ ...prev, authenticatedQuestionCount: e.target.value }))}
            />
            <span className="mma-manage__field-hint">3 = mood/thời lượng/nơi xem · 4 + thể loại · 5 + lịch sử</span>
          </label>
          <label className={adminLabelClass}>
            Số câu hỏi (khách — dự phòng)
            <input
              className={adminInputClass}
              type="number"
              min={3}
              max={5}
              value={settings.guestQuestionCount}
              onChange={(e) => setSettings((prev) => ({ ...prev, guestQuestionCount: e.target.value }))}
            />
            <span className="mma-manage__field-hint">Matchmaker hiện bắt buộc đăng nhập; giá trị này chưa áp dụng trên widget.</span>
          </label>
          <div className="mma-manage__settings-actions">
            <PrimaryButton type="submit" loading={savingSettings}>
              Lưu cấu hình
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className="mma-manage__panel">
        <div className="mma-manage__panel-head mma-manage__panel-head--row">
          <div>
            <h2 className="mma-manage__title">Lựa chọn quiz</h2>
            <p className="mma-manage__sub">Mood, thời lượng và nơi xem hiển thị trên trang chủ.</p>
          </div>
          <PrimaryButton type="button" onClick={openCreateOption}>
            <Plus className="w-3.5 h-3.5" />
            Thêm lựa chọn
          </PrimaryButton>
        </div>

        <div className="mma-manage__table-wrap">
          <table className="mma-manage__table">
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Key</th>
                <th>Nhãn</th>
                <th>Gợi ý</th>
                <th>Icon</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {options.length === 0 ? (
                <tr>
                  <td colSpan={8} className="mma-manage__empty">Chưa có lựa chọn.</td>
                </tr>
              ) : (
                options.map((option) => (
                  <tr key={option.uuid}>
                    <td>{GROUP_LABELS[option.optionGroup] || option.optionGroup}</td>
                    <td><code>{option.key}</code></td>
                    <td>{option.label}</td>
                    <td className="mma-manage__muted">{option.hint || '—'}</td>
                    <td>{option.iconKey || option.code || '—'}</td>
                    <td>{option.sortOrder}</td>
                    <td>
                      <span className={`mma-manage__badge ${option.active ? 'is-active' : 'is-off'}`}>
                        {option.active ? 'Bật' : 'Tắt'}
                      </span>
                    </td>
                    <td className="mma-manage__row-actions">
                      <button type="button" className="mma-manage__icon-btn" onClick={() => openEditOption(option)} title="Sửa">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" className="mma-manage__icon-btn is-danger" onClick={() => handleDeleteOption(option)} title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <MatchmakerSuggestionsTab moodOptions={moodOptions} />

      <AdminModal
        open={optionModal.open}
        onClose={() => setOptionModal({ open: false, option: null })}
        title={optionModal.option ? 'Sửa lựa chọn quiz' : 'Thêm lựa chọn quiz'}
        subtitle="Nhãn và hint sẽ hiện trên widget gợi ý phim."
        size="md"
        footer={(
          <>
            <GhostButton type="button" onClick={() => setOptionModal({ open: false, option: null })}>
              Hủy
            </GhostButton>
            <PrimaryButton type="submit" form="mma-option-form" loading={savingOption}>
              Lưu
            </PrimaryButton>
          </>
        )}
      >
        <form id="mma-option-form" className="mma-manage__form" onSubmit={handleSaveOption}>
          <AdminSelectDropdown
            label="Nhóm"
            value={optionForm.optionGroup}
            options={GROUP_OPTIONS}
            onChange={(value) => setOptionForm((prev) => ({ ...prev, optionGroup: value }))}
            disabled={Boolean(optionModal.option)}
          />
          <label className={adminLabelClass}>
            Key (vd. RELAX)
            <input
              className={adminInputClass}
              value={optionForm.optionKey}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, optionKey: e.target.value }))}
              required
              disabled={Boolean(optionModal.option)}
            />
          </label>
          <label className={adminLabelClass}>
            Nhãn
            <input
              className={adminInputClass}
              value={optionForm.label}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, label: e.target.value }))}
              required
            />
          </label>
          <label className={adminLabelClass}>
            Gợi ý (hint)
            <input
              className={adminInputClass}
              value={optionForm.hint}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, hint: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Icon Lucide (vd. Moon, Flame)
            <input
              className={adminInputClass}
              value={optionForm.iconKey}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, iconKey: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Mã hiển thị (vd. &lt;100p)
            <input
              className={adminInputClass}
              value={optionForm.code}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, code: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Thứ tự
            <input
              className={adminInputClass}
              type="number"
              value={optionForm.sortOrder}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            />
          </label>
          <label className="mma-manage__check">
            <input
              type="checkbox"
              checked={optionForm.active}
              onChange={(e) => setOptionForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Đang bật
          </label>
        </form>
      </AdminModal>
    </div>
  );
};

export default MatchmakerQuizTab;
