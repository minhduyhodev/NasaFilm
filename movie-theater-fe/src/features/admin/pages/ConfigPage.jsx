import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  Trash2,
  Bot,
  Clock,
  Banknote,
  Shield,
  MonitorPlay,
  Building2,
  Lock,
  Loader2,
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_ROOM_TYPES,
  DEFAULT_SCREENING_FORMATS,
} from '../../../shared/constants/systemConfig';
import { normalizeNasaBotConfig, writeCachedSystemConfig } from '../../../shared/utils/systemConfig';
import { AdminPage } from '../components';
import ActionMenu from '../components/ActionMenu';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { supportService } from '../../../shared/services/supportService';
import './ConfigPage.css';

const TABS = [
  { id: 'showtime', label: 'Suất chiếu', icon: Clock },
  { id: 'pricing', label: 'Định giá', icon: Banknote },
  { id: 'limits', label: 'Giới hạn', icon: Shield },
  { id: 'online', label: 'Phim online', icon: MonitorPlay },
  { id: 'cinema', label: 'Rạp & phòng', icon: Building2 },
  { id: 'operations', label: 'Vận hành', icon: Lock },
  { id: 'nasabot', label: 'NASA Bot', icon: Bot },
];

const emptyTypeEntry = () => ({ value: '', label: '', enabled: true });

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const ConfigSection = ({ title, description, children }) => (
  <section className="sys-config__section">
    <h2 className="sys-config__section-title">{title}</h2>
    {description && <p className="sys-config__section-desc">{description}</p>}
    {children}
  </section>
);

const ConfigField = ({ label, hint, children }) => (
  <div className="sys-config__field">
    <label className="sys-config__label">{label}</label>
    {children}
    {hint && <p className="sys-config__hint">{hint}</p>}
  </div>
);

const ConfigSlider = ({ label, value, min, max, step, suffix = 'x', onChange }) => (
  <div className="sys-config__slider">
    <div className="sys-config__slider-head">
      <span className="sys-config__slider-label">{label}</span>
      <span className="sys-config__slider-value">{value}{suffix}</span>
    </div>
    <input
      type="range"
      className="sys-config__range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

const ConfigSwitch = ({ checked, onChange, children }) => (
  <label className="sys-config__switch">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="sys-config__switch-track" aria-hidden="true" />
    <span className="sys-config__switch-text">{children}</span>
  </label>
);

const ConfigTypeList = ({ title, description, items, onChange, valuePlaceholder, labelPlaceholder }) => {
  const updateItem = (index, field, value) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => onChange([...items, emptyTypeEntry()]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <ConfigSection title={title} description={description}>
      <div className="sys-config__table-wrap">
        <table className="sys-config__table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Nhãn hiển thị</th>
            <th>Trạng thái</th>
            <th aria-label="Xóa" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.value}-${index}`}>
              <td className="sys-config__table-code">
                <input
                  type="text"
                  className="sys-config__input"
                  value={item.value}
                  placeholder={valuePlaceholder}
                  onChange={(e) => updateItem(index, 'value', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="sys-config__input"
                  value={item.label}
                  placeholder={labelPlaceholder}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                />
              </td>
              <td>
                <button
                  type="button"
                  className={`sys-config__table-enable${item.enabled !== false ? ' is-on' : ''}`}
                  onClick={() => updateItem(index, 'enabled', item.enabled === false)}
                >
                  {item.enabled !== false ? 'Bật' : 'Tắt'}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  className="sys-config__table-del"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  aria-label="Xóa mục"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <button type="button" className="sys-config__link-btn" onClick={addItem}>
        <Plus className="w-3.5 h-3.5" />
        Thêm mục
      </button>
    </ConfigSection>
  );
};

const NasaBotShortcutList = ({ items = [], onChange }) => {
  const updateItem = (index, field, value) => {
    onChange(items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        buttonName: 'Shortcut mới',
        shortcutName: `custom_${items.length + 1}`,
        description: 'Mô tả ngắn cho shortcut mới',
        queryContent: 'Tôi cần được hỗ trợ.',
      },
    ]);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <ConfigSection title="Shortcut nhanh" description="Mỗi shortcut có nhãn và mô tả ngắn hiển thị trong chatbox.">
      <div className="sys-config__bot-list">
        {items.map((item, index) => (
          <div key={`${item.shortcutName}-${index}`} className="sys-config__bot-card">
            <div className="sys-config__bot-card-head">
              <span className="sys-config__bot-card-id">{item.shortcutName}</span>
              <button type="button" className="sys-config__table-del" onClick={() => removeItem(index)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="sys-config__fields">
              <ConfigField label="Button name">
                <input
                  type="text"
                  className="sys-config__input"
                  value={item.buttonName}
                  onChange={(e) => updateItem(index, 'buttonName', e.target.value)}
                />
              </ConfigField>
              <ConfigField label="Shortcut name">
                <input
                  type="text"
                  className="sys-config__input"
                  value={item.shortcutName}
                  onChange={(e) => updateItem(index, 'shortcutName', e.target.value)}
                />
              </ConfigField>
              <ConfigField label="Mô tả shortcut">
                <textarea
                  className="sys-config__input sys-config__input--textarea"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
              </ConfigField>
              <ConfigField label="Query content">
                <textarea
                  className="sys-config__input sys-config__input--textarea"
                  value={item.queryContent}
                  onChange={(e) => updateItem(index, 'queryContent', e.target.value)}
                />
              </ConfigField>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="sys-config__link-btn" onClick={addItem}>
        <Plus className="w-3.5 h-3.5" />
        Thêm shortcut
      </button>
    </ConfigSection>
  );
};

const NasaBotQuestionList = ({ items = [], onChange }) => {
  const updateItem = (index, value) => {
    onChange(items.map((item, idx) => (idx === index ? value : item)));
  };

  const addItem = () => onChange([...items, 'Câu hỏi mở mới']);
  const removeItem = (index) => onChange(items.filter((_, idx) => idx !== index));

  return (
    <ConfigSection title="Opening questions" description="Các câu hỏi mở đầu hiển thị ngay khi user mở chatbot.">
      <div className="sys-config__bot-list">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="sys-config__bot-inline">
            <input
              type="text"
              className="sys-config__input"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
            />
            <button type="button" className="sys-config__table-del" onClick={() => removeItem(index)}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="sys-config__link-btn" onClick={addItem}>
        <Plus className="w-3.5 h-3.5" />
        Thêm opening question
      </button>
    </ConfigSection>
  );
};

const ConfigPage = () => {
  const confirm = useConfirm();
  const [config, setConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [activeTab, setActiveTab] = useState('showtime');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supportAiStatus, setSupportAiStatus] = useState({ configured: false, mode: 'FALLBACK' });

  useEffect(() => {
    let isMounted = true;
    systemConfigService.getConfig()
      .then((data) => { if (isMounted) setConfig(data); })
      .catch((error) => console.error('Failed to load system configuration', error))
      .finally(() => { if (isMounted) setIsLoading(false); });

    supportService.getSupportAiStatus()
      .then((data) => {
        if (isMounted) {
          setSupportAiStatus({
            configured: Boolean(data?.configured),
            mode: data?.mode || 'FALLBACK',
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSupportAiStatus({ configured: false, mode: 'FALLBACK' });
        }
      });

    return () => { isMounted = false; };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await systemConfigService.saveConfig(config);
      setConfig(saved);
      notificationService.success('Đã lưu cấu hình hệ thống.');
    } catch (error) {
      notificationService.error(error?.message || 'Không thể lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Khôi phục cấu hình',
      message: 'Khôi phục tất cả cấu hình về mặc định? Các thay đổi hiện tại sẽ bị ghi đè.',
      confirmLabel: 'Khôi phục',
      variant: 'warning',
    });
    if (!ok) return;
    setIsSaving(true);
    try {
      const restored = await systemConfigService.saveConfig(DEFAULT_SYSTEM_CONFIG);
      setConfig(restored);
      notificationService.info('Đã khôi phục cấu hình mặc định.');
    } catch {
      setConfig(DEFAULT_SYSTEM_CONFIG);
      writeCachedSystemConfig(DEFAULT_SYSTEM_CONFIG);
      notificationService.info('Đã khôi phục cấu hình mặc định trên trình duyệt.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateNasaBotField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      nasaBot: {
        ...(prev.nasaBot || {}),
        [field]: value,
      },
    }));
  };

  const lockPreviewMinutes = (multiplier) => {
    const m = Number(multiplier) || 2;
    return `Phim 120 phút → khóa xem ${Math.round(120 * m)} phút (~${(120 * m / 60).toFixed(1)} giờ)`;
  };

  const stats = useMemo(() => ([
    { label: 'Khung giờ', value: `${config.startTime} – ${config.endTime}` },
    { label: 'Vé thường', value: formatVnd(config.basePrice) },
    { label: 'Giữ ghế', value: `${config.seatLockMinutes} phút` },
    { label: 'Tối đa / đặt', value: `${config.maxSeatsPerBooking} ghế` },
  ]), [config]);

  const nasaBot = normalizeNasaBotConfig(config.nasaBot || DEFAULT_SYSTEM_CONFIG.nasaBot);
  const nasaBotPreviewQuestions = (nasaBot.openingQuestions || []).slice(0, 4);
  const nasaBotPreviewShortcuts = (nasaBot.shortcuts || []).slice(0, 4);
  const supportAiModeLabel = supportAiStatus.configured && supportAiStatus.mode === 'OPENAI'
    ? 'OPENAI'
    : 'FALLBACK';
  const supportAiModeDescription = supportAiStatus.configured && supportAiStatus.mode === 'OPENAI'
    ? 'Persona prompt đang tác động vào câu trả lời của /api/support-ai/chat.'
    : 'Backend đang chạy fallback nội bộ, nên persona prompt chưa tác động vào câu trả lời thực tế.';

  if (isLoading) {
    return (
      <div className="sys-config__loading">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Đang tải…
      </div>
    );
  }

  return (
    <AdminPage className="sys-config">
      <header className="sys-config__top">
        <div className="sys-config__top-row">
          <div>
            <p className="sys-config__eyebrow">Cấu hình hệ thống</p>
            <h1 className="sys-config__title">Trung tâm điều khiển vận hành</h1>
            <p className="sys-config__desc">
              Tham số suất chiếu, giá vé, giới hạn đặt chỗ và streaming — mọi thay đổi áp dụng toàn hệ thống.
            </p>
          </div>
          <div className="sys-config__actions">
            <ActionMenu
              items={[
                {
                  label: 'Khôi phục mặc định',
                  icon: <RotateCcw className="w-3.5 h-3.5" />,
                  onClick: handleReset,
                  destructive: true,
                  disabled: isSaving,
                },
              ]}
            />
            <button
              type="button"
              className="sys-config__save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </header>

      <div className="sys-config__workspace">
        <div className="sys-config__workspace-stats">
          {stats.map((item) => (
            <div key={item.label} className="sys-config__stat">
              <span className="sys-config__stat-label">{item.label}</span>
              <span className="sys-config__stat-value">{item.value}</span>
            </div>
          ))}
        </div>

        <nav className="sys-config__tabs" aria-label="Nhóm cấu hình">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`sys-config__tab${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="sys-config__body" key={activeTab}>
        {activeTab === 'showtime' && (
          <div className="sys-config__split">
            <ConfigSection title="Khung giờ suất chiếu">
              <div className="sys-config__fields sys-config__fields--2">
                <ConfigField label="Giờ mở cửa" hint="Khung giờ sớm nhất thuật toán có thể phân bổ suất.">
                  <input type="time" className="sys-config__input" value={config.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
                </ConfigField>
                <ConfigField label="Giờ đóng cửa" hint="Thời gian muộn nhất suất phải kết thúc.">
                  <input type="time" className="sys-config__input" value={config.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
                </ConfigField>
                <ConfigField label="Thời gian dọn dẹp (phút)">
                  <input type="number" min="0" max="120" className="sys-config__input" value={config.intervalMinutes} onChange={(e) => updateField('intervalMinutes', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Trailer buffer (phút)">
                  <input type="number" min="0" max="60" className="sys-config__input" value={config.trailerBuffer} onChange={(e) => updateField('trailerBuffer', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
              </div>
            </ConfigSection>

            <ConfigSection title="Trọng số ưu tiên">
              <div className="sys-config__fields sys-config__fields--2">
                <ConfigSlider label="Giờ vàng" value={config.goldenHourWeight} min={0.5} max={3} step={0.1} onChange={(v) => updateField('goldenHourWeight', v)} />
                <ConfigSlider label="Cuối tuần" value={config.weekendWeight} min={0.5} max={3} step={0.1} onChange={(v) => updateField('weekendWeight', v)} />
                <ConfigSlider label="Đánh giá phim" value={config.ratingWeight} min={0.5} max={3} step={0.1} onChange={(v) => updateField('ratingWeight', v)} />
                <ConfigSlider label="Độ hot thể loại" value={config.genreWeight} min={0.5} max={3} step={0.1} onChange={(v) => updateField('genreWeight', v)} />
              </div>
            </ConfigSection>
          </div>
        )}

        {activeTab === 'pricing' && (
          <ConfigSection title="Giá vé rạp" description="Giá gợi ý khi tạo suất chiếu tự động hoặc thủ công.">
            <div className="sys-config__fields sys-config__fields--3">
              <ConfigField label="Vé thường (VND)">
                <input type="number" min="0" step="5000" className="sys-config__input" value={config.basePrice} onChange={(e) => updateField('basePrice', parseInt(e.target.value, 10) || 0)} />
              </ConfigField>
              <ConfigField label="Vé VIP (VND)">
                <input type="number" min="0" step="5000" className="sys-config__input" value={config.vipPrice} onChange={(e) => updateField('vipPrice', parseInt(e.target.value, 10) || 0)} />
              </ConfigField>
              <ConfigField label="Vé đôi (VND)">
                <input type="number" min="0" step="5000" className="sys-config__input" value={config.couplePrice} onChange={(e) => updateField('couplePrice', parseInt(e.target.value, 10) || 0)} />
              </ConfigField>
            </div>
          </ConfigSection>
        )}

        {activeTab === 'limits' && (
          <ConfigSection title="Giới hạn đặt vé">
            <div className="sys-config__fields sys-config__fields--2">
              <ConfigField label="Số ghế tối đa / lần đặt" hint="Áp dụng khi khách chọn ghế và xác nhận đặt vé trực tuyến.">
                <input type="number" min="1" max="20" className="sys-config__input" value={config.maxSeatsPerBooking} onChange={(e) => updateField('maxSeatsPerBooking', parseInt(e.target.value, 10) || 1)} />
              </ConfigField>
              <ConfigField label="Thời gian giữ ghế (phút)" hint="Đếm ngược trên trang chọn ghế trước khi ghế được giải phóng.">
                <input type="number" min="1" max="30" className="sys-config__input" value={config.seatLockMinutes} onChange={(e) => updateField('seatLockMinutes', parseInt(e.target.value, 10) || 1)} />
              </ConfigField>
            </div>
          </ConfigSection>
        )}

        {activeTab === 'online' && (
          <div className="sys-config__split">
            <ConfigSection title="Giá vé streaming (VOD)">
              <ConfigField label="Giá mặc định (VND)" hint={`Hiện tại: ${formatVnd(config.onlineStreamingPrice)} / vé.`}>
                <input type="number" min="0" step="1000" className="sys-config__input" value={config.onlineStreamingPrice} onChange={(e) => updateField('onlineStreamingPrice', parseInt(e.target.value, 10) || 0)} />
              </ConfigField>
            </ConfigSection>

            <ConfigSection title="Đồng hồ đếm ngược">
              <div className="sys-config__switches">
                <ConfigSwitch checked={config.onlineCountdownEnabled !== false} onChange={(v) => updateField('onlineCountdownEnabled', v)}>
                  Hiển thị đồng hồ đếm ngược trên trang xem phim trực tuyến
                </ConfigSwitch>
              </div>
              <div className="sys-config__fields sys-config__fields--2" style={{ marginTop: '1rem' }}>
                <ConfigField label="Thời lượng xem (× thời lượng phim)" hint={lockPreviewMinutes(config.onlineWatchLockMultiplier)}>
                  <input type="number" min="0.5" max="10" step="0.5" className="sys-config__input" value={config.onlineWatchLockMultiplier} onChange={(e) => updateField('onlineWatchLockMultiplier', parseFloat(e.target.value) || 2)} />
                </ConfigField>
                <ConfigField label="Cảnh báo sắp hết hạn (phút)" hint="Đồng hồ chuyển sang trạng thái cảnh báo khi dưới ngưỡng này.">
                  <input type="number" min="1" max="120" className="sys-config__input" value={config.onlineCountdownWarningMinutes ?? 10} onChange={(e) => updateField('onlineCountdownWarningMinutes', parseInt(e.target.value, 10) || 10)} />
                </ConfigField>
                <ConfigSlider label="Hệ số thời lượng" value={config.onlineWatchLockMultiplier} min={0.5} max={10} step={0.5} onChange={(v) => updateField('onlineWatchLockMultiplier', v)} />
              </div>
            </ConfigSection>
          </div>
        )}

        {activeTab === 'cinema' && (
          <div className="sys-config__split">
            <ConfigTypeList
              title="Kiểu phòng chiếu"
              description="Mã phải khớp enum backend (STANDARD, IMAX, VIP, …)."
              items={config.roomTypes || DEFAULT_ROOM_TYPES}
              onChange={(roomTypes) => updateField('roomTypes', roomTypes)}
              valuePlaceholder="STANDARD"
              labelPlaceholder="Standard 2D/3D"
            />
            <ConfigTypeList
              title="Định dạng chiếu"
              description="2D, 3D, IMAX… dùng cho hiển thị và quản lý suất chiếu."
              items={config.screeningFormats || DEFAULT_SCREENING_FORMATS}
              onChange={(screeningFormats) => updateField('screeningFormats', screeningFormats)}
              valuePlaceholder="2D"
              labelPlaceholder="2D Phụ đề"
            />
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="sys-config__split">
            <ConfigSection title="Hủy vé & hoàn tiền">
              <div className="sys-config__fields sys-config__fields--2">
                <ConfigField label="Chặn hủy trước giờ chiếu (phút)">
                  <input type="number" min="0" className="sys-config__input" value={config.cancellationCutoffMinutes} onChange={(e) => updateField('cancellationCutoffMinutes', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Phí hủy vé (%)">
                  <input type="number" min="0" max="100" className="sys-config__input" value={config.cancellationFeePercent} onChange={(e) => updateField('cancellationFeePercent', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
              </div>
              <div className="sys-config__switches" style={{ marginTop: '0.75rem' }}>
                <ConfigSwitch checked={config.customerRefundEnabled !== false} onChange={(v) => updateField('customerRefundEnabled', v)}>
                  Cho phép hoàn tiền khi khách hủy vé
                </ConfigSwitch>
                <ConfigSwitch checked={config.fullRefundOnShowtimeCancel !== false} onChange={(v) => updateField('fullRefundOnShowtimeCancel', v)}>
                  Hoàn 100% khi suất chiếu bị hủy
                </ConfigSwitch>
                <ConfigSwitch checked={config.refundManualApprovalRequired !== false} onChange={(v) => updateField('refundManualApprovalRequired', v)}>
                  Bắt buộc admin duyệt hoàn tiền
                </ConfigSwitch>
              </div>
              <p className="sys-config__hint" style={{ marginTop: '0.5rem' }}>
                Khi bật duyệt thủ công: khách hủy vé → đơn chờ hoàn tiền → admin duyệt tại /admin/refunds.
              </p>
            </ConfigSection>

            <ConfigSection title="Vận hành & bảo mật">
              <div className="sys-config__fields sys-config__fields--3">
                <ConfigField label="Session timeout (giờ)">
                  <input type="number" min="1" className="sys-config__input" value={config.sessionTimeoutHours} onChange={(e) => updateField('sessionTimeoutHours', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Tỷ lệ tích điểm (%)">
                  <input type="number" min="0" max="100" className="sys-config__input" value={config.pointsEarningRatio} onChange={(e) => updateField('pointsEarningRatio', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Giá trị 1 điểm (VND)">
                  <input type="number" min="0" step="100" className="sys-config__input" value={config.pointsToCashValue} onChange={(e) => updateField('pointsToCashValue', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
              </div>
            </ConfigSection>
          </div>
        )}

        {activeTab === 'nasabot' && (
          <div className="sys-config__split">
            <div className="sys-config__bot-stack">
            <ConfigSection title="Persona & Prompt" description="Prompt này chỉ áp dụng cho /api/support-ai/chat. Opening questions và shortcuts áp dụng vào widget phía người dùng.">
                <ConfigField label="Prompt hệ thống">
                  <textarea
                    className="sys-config__input sys-config__input--textarea sys-config__input--textarea-lg"
                    value={nasaBot.personaPrompt || ''}
                    onChange={(e) => updateNasaBotField('personaPrompt', e.target.value)}
                  />
                </ConfigField>
                <p className="sys-config__hint" style={{ marginTop: '0.5rem' }}>
                  Runtime hiện tại: <strong>{supportAiModeLabel}</strong>. {supportAiModeDescription}
                </p>
              </ConfigSection>

              <ConfigSection title="Opening questions & Shortcuts" description="Chỉ giữ đúng các mục đang dùng: Opening questions và shortcuts hỗ trợ.">
                <NasaBotQuestionList
                  items={nasaBot.openingQuestions || []}
                  onChange={(openingQuestions) => updateNasaBotField('openingQuestions', openingQuestions)}
                />
                <NasaBotShortcutList
                  items={nasaBot.shortcuts || []}
                  onChange={(shortcuts) => updateNasaBotField('shortcuts', shortcuts)}
                />
              </ConfigSection>
            </div>

            <div className="sys-config__bot-stack">
              <ConfigSection title="Preview & Debug" description="Preview này mô phỏng logic widget thật. Nó không lấy raw personaPrompt để giả làm một câu trả lời chat.">
                <div className="sys-config__bot-preview">
                  <div className="sys-config__bot-preview-head">
                    <span className="sys-config__bot-preview-avatar" />
                    <div>
                      <strong>NASA Bot</strong>
                      <span>{supportAiModeLabel} · Widget + Support AI</span>
                    </div>
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    Chào bạn, mình là NASA BOT.
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    {nasaBotPreviewQuestions.map((question, index) => (
                      <div key={`${question}-${index}`}>{index + 1}. {question}</div>
                    ))}
                  </div>
                  <div className="sys-config__bot-preview-shortcuts">
                    {nasaBotPreviewShortcuts.map((shortcut) => (
                      <span key={shortcut.shortcutName} className="sys-config__bot-preview-chip">
                        {shortcut.buttonName}
                      </span>
                    ))}
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--user">
                    Tôi cần hỗ trợ về vé hoặc suất chiếu.
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    {supportAiStatus.configured && supportAiStatus.mode === 'OPENAI'
                      ? 'Khi người dùng chat thật, câu trả lời AI sẽ đi qua persona prompt bạn cấu hình ở trên.'
                      : 'Ở môi trường hiện tại, bot sẽ trả lời theo fallback cứng theo nhóm ticket/payment/account... chứ chưa bám theo persona prompt.'}
                  </div>
                </div>
              </ConfigSection>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminPage>
  );
};

export default ConfigPage;
