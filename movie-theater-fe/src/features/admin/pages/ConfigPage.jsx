import { useState, useEffect, useMemo } from 'react';
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
import { AdminPage, PageHeader, FilterPills, AdminKpiGrid } from '../components';
import { adminInputClass } from '../components/adminFormStyles';
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

const NASA_BOT_CATEGORY_LABELS = {
  ticket: 'Vé / suất chiếu',
  payment: 'Thanh toán',
  account: 'Tài khoản',
  promo: 'Khuyến mãi',
  membership: 'Hội viên',
};
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
                  className={`sys-config__input ${adminInputClass}`}
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

const _NasaBotShortcutList = ({ items = [], onChange }) => {
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

const _NasaBotQuestionList = ({ items = [], onChange }) => {
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
    systemConfigService.getAdminConfig()
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
    const ok = await confirm({
      title: 'Lưu cấu hình hệ thống',
      message: 'Xác nhận lưu các thay đổi cấu hình? Thay đổi sẽ có hiệu lực ngay trên toàn hệ thống.',
      confirmLabel: 'Lưu cấu hình',
      variant: 'warning',
    });
    if (!ok) return;

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


  const updateNasaBotCategoryKeywords = (category, value) => {
    updateNasaBotField('categoryKeywords', {
      ...(nasaBot.categoryKeywords || {}),
      [category]: value.split(',').map((keyword) => keyword.trim()).filter(Boolean),
    });
  };

  const updateNasaBotBannedWords = (value) => {
    updateNasaBotField('bannedWords', value.split(',').map((word) => word.trim()).filter(Boolean));
  };
  const lockPreviewMinutes = (multiplier) => {
    const m = Number(multiplier) || 2;
    return `Phim 120 phút → khóa xem ${Math.round(120 * m)} phút (~${(120 * m / 60).toFixed(1)} giờ)`;
  };

  const stats = useMemo(() => ([
    {
      id: 'hours',
      label: 'Khung giờ',
      value: `${config.startTime} – ${config.endTime}`,
      badge: 'suất chiếu',
      icon: Clock,
      color: 'text-red-400',
      kpiClass: 'kpi-total',
    },
    {
      id: 'price',
      label: 'Vé thường',
      value: formatVnd(config.basePrice),
      badge: 'giá cơ bản',
      icon: Banknote,
      color: 'text-amber-400',
      kpiClass: 'kpi-showing',
    },
    {
      id: 'lock',
      label: 'Giữ ghế',
      value: `${config.seatLockMinutes} phút`,
      badge: 'seat lock',
      icon: Shield,
      color: 'text-emerald-400',
      kpiClass: 'kpi-upcoming',
    },
    {
      id: 'orbit',
      label: 'Orbit checkout',
      value: `${Math.max(config.orbitCheckoutTtlMinutes || 15, config.seatLockMinutes || 5)} phút`,
      badge: 'TTL',
      icon: MonitorPlay,
      color: 'text-sky-400',
      kpiClass: 'kpi-hidden',
    },
  ]), [config]);

  const nasaBot = normalizeNasaBotConfig(config.nasaBot || DEFAULT_SYSTEM_CONFIG.nasaBot);
  const aiConfigured = Boolean(supportAiStatus.configured) && supportAiStatus.mode !== 'FALLBACK';
  const supportAiModeLabel = aiConfigured ? 'AI' : 'FALLBACK';
  const supportAiModeDescription = aiConfigured
    ? 'Persona prompt đang tác động vào /api/support-ai/chat.'
    : 'Backend đang chạy fallback nội bộ, nên persona prompt chưa tác động vào câu trả lời thực tế.';

  if (isLoading) {
    return (
      <AdminPage className="sys-config">
        <div className="sys-config__loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải cấu hình…
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage className="sys-config">
      <PageHeader
        eyebrow="Cấu hình hệ thống"
        title="Trung tâm điều khiển vận hành"
        description="Tham số suất chiếu, giá vé, giới hạn đặt chỗ và streaming — mọi thay đổi áp dụng toàn hệ thống."
        primaryAction={{
          label: isSaving ? 'Đang lưu…' : 'Lưu cấu hình',
          onClick: handleSave,
          disabled: isSaving,
        }}
        menuItems={[
          {
            label: 'Khôi phục mặc định',
            icon: <RotateCcw className="w-3.5 h-3.5" />,
            onClick: handleReset,
            destructive: true,
            disabled: isSaving,
          },
        ]}
      />

      <AdminKpiGrid items={stats} />

      <section className="sys-config__workspace">
        <div className="sys-config__workspace-toolbar">
          <FilterPills
            value={activeTab}
            onChange={setActiveTab}
            items={TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
            ariaLabel="Nhóm cấu hình"
          />
        </div>

        <div className="sys-config__body" key={activeTab}>
        {activeTab === 'showtime' && (
          <div className="sys-config__split sys-config__split--showtime">
            <div className="sys-config__split-stack">
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
                  <ConfigField
                    label="Cách hiện tại tối thiểu (phút)"
                    hint="Suất chiếu mới phải bắt đầu sau thời điểm hiện tại ít nhất khoảng này (thường 15–30 phút)."
                  >
                    <input
                      type="number"
                      min="0"
                      max="180"
                      className="sys-config__input"
                      value={config.minLeadMinutes}
                      onChange={(e) => updateField('minLeadMinutes', parseInt(e.target.value, 10) || 0)}
                    />
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

            <ConfigSection title="Thuật toán phân bổ" description="Các hằng số điều khiển cách sinh suất chiếu tự động.">
              <div className="sys-config__fields sys-config__fields--2">
                <ConfigField label="Bước nhảy slot (phút)" hint="Khoảng cách giữa các khung giờ thử khi sinh suất.">
                  <input type="number" min="15" max="120" className="sys-config__input" value={config.slotStepMinutes} onChange={(e) => updateField('slotStepMinutes', parseInt(e.target.value, 10) || 30)} />
                </ConfigField>
                <ConfigField label="Căn lưới giờ (phút)">
                  <input type="number" min="5" max="60" className="sys-config__input" value={config.gridAlignMinutes} onChange={(e) => updateField('gridAlignMinutes', parseInt(e.target.value, 10) || 15)} />
                </ConfigField>
                <ConfigField label="Phạt công bằng phim">
                  <input type="number" min="0" max="100" step="1" className="sys-config__input" value={config.fairnessPenalty} onChange={(e) => updateField('fairnessPenalty', parseInt(e.target.value, 10) || 25)} />
                </ConfigField>
                <ConfigField label="Khoảng cách cùng phim (phút)">
                  <input type="number" min="0" max="180" className="sys-config__input" value={config.sameMovieGapMinutes} onChange={(e) => updateField('sameMovieGapMinutes', parseInt(e.target.value, 10) || 30)} />
                </ConfigField>
                <ConfigField label="Điểm cuối tuần">
                  <input type="number" min="0" max="20" className="sys-config__input" value={config.weekendScore} onChange={(e) => updateField('weekendScore', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Điểm ngày thường">
                  <input type="number" min="0" max="20" className="sys-config__input" value={config.weekdayScore} onChange={(e) => updateField('weekdayScore', parseInt(e.target.value, 10) || 0)} />
                </ConfigField>
                <ConfigField label="Giờ vàng (bắt đầu)">
                  <input type="time" className="sys-config__input" value={config.goldenHourPeakStart} onChange={(e) => updateField('goldenHourPeakStart', e.target.value)} />
                </ConfigField>
                <ConfigField label="Giờ vàng (kết thúc)">
                  <input type="time" className="sys-config__input" value={config.goldenHourPeakEnd} onChange={(e) => updateField('goldenHourPeakEnd', e.target.value)} />
                </ConfigField>
                <ConfigField label="Điểm giờ vàng">
                  <input type="number" min="0" max="30" className="sys-config__input" value={config.goldenHourPeakScore} onChange={(e) => updateField('goldenHourPeakScore', parseInt(e.target.value, 10) || 15)} />
                </ConfigField>
                <ConfigField label="Điểm genre (hot / mid / base)">
                  <div className="sys-config__inline-triple">
                    <label className="sys-config__mini-field">
                      <span>Hot</span>
                      <input type="number" min="0" max="20" className="sys-config__input" value={config.genreTierHot} onChange={(e) => updateField('genreTierHot', parseInt(e.target.value, 10) || 10)} />
                    </label>
                    <label className="sys-config__mini-field">
                      <span>Mid</span>
                      <input type="number" min="0" max="20" className="sys-config__input" value={config.genreTierMid} onChange={(e) => updateField('genreTierMid', parseInt(e.target.value, 10) || 7)} />
                    </label>
                    <label className="sys-config__mini-field">
                      <span>Base</span>
                      <input type="number" min="0" max="20" className="sys-config__input" value={config.genreTierBase} onChange={(e) => updateField('genreTierBase', parseInt(e.target.value, 10) || 4)} />
                    </label>
                  </div>
                </ConfigField>
                <ConfigSwitch checked={config.includeFridayAsWeekend} onChange={(v) => updateField('includeFridayAsWeekend', v)}>
                  Tính thứ Sáu là cuối tuần
                </ConfigSwitch>
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
          <ConfigSection
            title="Giới hạn đặt vé & Orbit"
            description="Thời gian giữ ghế solo và giữ phòng Orbit được cấu hình cùng nơi. Khi host vào thanh toán nhóm, khóa ghế được gia hạn bằng thời gian Orbit checkout."
          >
            <div className="sys-config__fields sys-config__fields--2">
              <ConfigField label="Số ghế tối đa / lần đặt" hint="Áp dụng khi khách chọn ghế và xác nhận đặt vé trực tuyến.">
                <input type="number" min="1" max="20" className="sys-config__input" value={config.maxSeatsPerBooking} onChange={(e) => updateField('maxSeatsPerBooking', parseInt(e.target.value, 10) || 1)} />
              </ConfigField>
              <ConfigField label="Thời gian giữ ghế (phút)" hint="Đếm ngược trên trang chọn ghế trước khi ghế được giải phóng (đặt vé cá nhân).">
                <input type="number" min="1" max="30" className="sys-config__input" value={config.seatLockMinutes} onChange={(e) => updateField('seatLockMinutes', parseInt(e.target.value, 10) || 1)} />
              </ConfigField>
              <ConfigField label="Giữ phòng Orbit OPEN (phút)" hint="Thời gian phòng nhóm còn mở để chọn ghế trước khi hết hạn.">
                <input type="number" min="5" max="120" className="sys-config__input" value={config.orbitRoomTtlMinutes ?? 30} onChange={(e) => updateField('orbitRoomTtlMinutes', parseInt(e.target.value, 10) || 30)} />
              </ConfigField>
              <ConfigField
                label="Giữ phòng Orbit checkout (phút)"
                hint="Khi vào combo/thanh toán nhóm, ghế cũng được gia hạn đúng khoảng này (tối thiểu bằng thời gian giữ ghế)."
              >
                <input type="number" min="5" max="60" className="sys-config__input" value={config.orbitCheckoutTtlMinutes ?? 15} onChange={(e) => updateField('orbitCheckoutTtlMinutes', parseInt(e.target.value, 10) || 15)} />
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
              <ConfigSection title="Setting Prompt" description="Prompt hệ thống nối thẳng tới NASA Bot khi người dùng chat thật qua /api/support-ai/chat.">
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

              <ConfigSection title="NASA Bot Keyword" description="Nhập keyword cách nhau bằng dấu phẩy. Khi khách nhắn trúng keyword, bot tự hiểu nhóm cần hỗ trợ.">
                <div className="sys-config__fields">
                  {Object.entries(NASA_BOT_CATEGORY_LABELS).map(([category, label]) => (
                    <ConfigField key={category} label={label}>
                      <textarea
                        className="sys-config__input sys-config__input--textarea"
                        value={(nasaBot.categoryKeywords?.[category] || []).join(', ')}
                        onChange={(e) => updateNasaBotCategoryKeywords(category, e.target.value)}
                        placeholder="Ví dụ: vé, đặt vé, mã vé"
                      />
                    </ConfigField>
                  ))}
                </div>
              </ConfigSection>
            </div>

            <div className="sys-config__bot-stack">
              <ConfigSection title="Keyword từ cấm" description="Nếu khách nhắn chứa từ trong danh sách này, NASA Bot trả về: Vui lòng nhắn nội dung phù hợp.">
                <ConfigField label="Từ cấm / chửi tục">
                  <textarea
                    className="sys-config__input sys-config__input--textarea sys-config__input--textarea-lg"
                    value={(nasaBot.bannedWords || []).join(', ')}
                    onChange={(e) => updateNasaBotBannedWords(e.target.value)}
                    placeholder="Ví dụ: từ tục 1, từ tục 2"
                  />
                </ConfigField>
              </ConfigSection>

              <ConfigSection title="Kịch bản phản hồi" description="Các hành vi chính đang được backend áp dụng.">
                <div className="sys-config__bot-preview">
                  <div className="sys-config__bot-preview-head">
                    <span className="sys-config__bot-preview-avatar" />
                    <div>
                      <strong>NASA Bot</strong>
                      <span>{supportAiModeLabel} · Prompt + Keyword + Từ cấm</span>
                    </div>
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    Trong phạm vi website: hỗ trợ vé, thanh toán, tài khoản, khuyến mãi, hội viên và ticket.
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    Ngoài phạm vi: Xin lỗi bạn, mình không hỗ trợ câu hỏi ngoài website
                  </div>
                  <div className="sys-config__bot-preview-bubble sys-config__bot-preview-bubble--bot">
                    Có từ cấm: Vui lòng nhắn nội dung phù hợp
                  </div>
                </div>
              </ConfigSection>
            </div>
          </div>
        )}
        </div>
      </section>
    </AdminPage>
  );
};

export default ConfigPage;
