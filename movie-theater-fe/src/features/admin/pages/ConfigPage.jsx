import React, { useState, useEffect } from 'react';
import { RotateCcw, Plus, Trash2 } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import {
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_ROOM_TYPES,
  DEFAULT_SCREENING_FORMATS,
} from '../../../shared/constants/systemConfig';
import { writeCachedSystemConfig } from '../../../shared/utils/systemConfig';
import {
  AdminPage,
  PageHeader,
  Section,
  GhostButton,
  PrimaryButton,
} from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const TABS = [
  { id: 'showtime', label: 'Suất chiếu tự động' },
  { id: 'pricing', label: 'Định giá vé' },
  { id: 'limits', label: 'Giới hạn' },
  { id: 'online', label: 'Phim online' },
  { id: 'cinema', label: 'Rạp & phòng' },
  { id: 'operations', label: 'Vận hành & bảo mật' },
];

const fieldClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const hintClass = 'text-xs text-gray-600 mt-1';

const emptyTypeEntry = () => ({ value: '', label: '', enabled: true });

const ConfigTypeList = ({ title, description, items, onChange, valuePlaceholder, labelPlaceholder }) => {
  const updateItem = (index, field, value) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => onChange([...items, emptyTypeEntry()]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <Section title={title} divided>
      {description && <p className={hintClass + ' mb-4'}>{description}</p>}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.value}-${index}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto_auto] gap-3 items-end p-3 rounded-lg bg-white/[0.02] border border-white/5"
          >
            <div>
              <label className={labelClass}>Mã</label>
              <input
                type="text"
                className={fieldClass}
                value={item.value}
                placeholder={valuePlaceholder}
                onChange={(e) => updateItem(index, 'value', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              />
            </div>
            <div>
              <label className={labelClass}>Nhãn hiển thị</label>
              <input
                type="text"
                className={fieldClass}
                value={item.label}
                placeholder={labelPlaceholder}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.enabled !== false}
                onChange={(e) => updateItem(index, 'enabled', e.target.checked)}
                className="rounded border-white/20 bg-white/5"
              />
              Kích hoạt
            </label>
            <GhostButton
              type="button"
              onClick={() => removeItem(index)}
              className="text-red-400 hover:text-red-300 pb-2"
              disabled={items.length <= 1}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </GhostButton>
          </div>
        ))}
      </div>
      <PrimaryButton type="button" onClick={addItem} className="mt-4 text-xs">
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Thêm mục
      </PrimaryButton>
    </Section>
  );
};

const ConfigPage = () => {
  const confirm = useConfirm();
  const [config, setConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [activeTab, setActiveTab] = useState('showtime');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    systemConfigService.getConfig()
      .then((data) => { if (isMounted) setConfig(data); })
      .catch((error) => console.error('Failed to load system configuration', error))
      .finally(() => { if (isMounted) setIsLoading(false); });
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

  const lockPreviewMinutes = (multiplier) => {
    const m = Number(multiplier) || 2;
    return `Phim 120 phút → khóa xem ${Math.round(120 * m)} phút (~${(120 * m / 60).toFixed(1)} giờ)`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        Đang tải cấu hình...
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Cấu hình hệ thống"
        description="Tham số vận hành, giới hạn đặt vé, phim online và kiểu phòng chiếu."
        primaryAction={{
          label: 'Lưu cấu hình',
          onClick: handleSave,
          loading: isSaving,
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

      <nav className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <GhostButton
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'text-white bg-white/[0.06]' : ''}
          >
            {tab.label}
          </GhostButton>
        ))}
      </nav>

      {activeTab === 'showtime' && (
        <>
          <Section title="Khung giờ suất chiếu">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Giờ mở cửa</label>
                <input type="time" className={fieldClass} value={config.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
                <p className={hintClass}>Khung giờ sớm nhất thuật toán có thể phân bổ suất.</p>
              </div>
              <div>
                <label className={labelClass}>Giờ đóng cửa</label>
                <input type="time" className={fieldClass} value={config.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
                <p className={hintClass}>Thời gian muộn nhất suất phải kết thúc.</p>
              </div>
              <div>
                <label className={labelClass}>Thời gian dọn dẹp (phút)</label>
                <input type="number" min="0" max="120" className={fieldClass} value={config.intervalMinutes} onChange={(e) => updateField('intervalMinutes', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Trailer buffer (phút)</label>
                <input type="number" min="0" max="60" className={fieldClass} value={config.trailerBuffer} onChange={(e) => updateField('trailerBuffer', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </Section>

          <Section title="Trọng số ưu tiên" divided>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'goldenHourWeight', label: 'Giờ vàng' },
                { key: 'weekendWeight', label: 'Cuối tuần' },
                { key: 'ratingWeight', label: 'Đánh giá phim' },
                { key: 'genreWeight', label: 'Độ hot thể loại' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-300">{config[key]}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    className="w-full accent-white cursor-pointer"
                    value={config[key]}
                    onChange={(e) => updateField(key, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {activeTab === 'pricing' && (
        <Section title="Giá vé rạp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Vé thường (VND)</label>
              <input type="number" min="0" step="5000" className={fieldClass} value={config.basePrice} onChange={(e) => updateField('basePrice', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Vé VIP (VND)</label>
              <input type="number" min="0" step="5000" className={fieldClass} value={config.vipPrice} onChange={(e) => updateField('vipPrice', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Vé đôi (VND)</label>
              <input type="number" min="0" step="5000" className={fieldClass} value={config.couplePrice} onChange={(e) => updateField('couplePrice', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <p className={hintClass}>Giá gợi ý khi tạo suất chiếu tự động hoặc thủ công.</p>
        </Section>
      )}

      {activeTab === 'limits' && (
        <Section title="Giới hạn đặt vé">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Số ghế tối đa / lần đặt</label>
              <input
                type="number"
                min="1"
                max="20"
                className={fieldClass}
                value={config.maxSeatsPerBooking}
                onChange={(e) => updateField('maxSeatsPerBooking', parseInt(e.target.value) || 1)}
              />
              <p className={hintClass}>Áp dụng khi khách chọn ghế và xác nhận đặt vé trực tuyến.</p>
            </div>
            <div>
              <label className={labelClass}>Thời gian giữ ghế (phút)</label>
              <input
                type="number"
                min="1"
                max="30"
                className={fieldClass}
                value={config.seatLockMinutes}
                onChange={(e) => updateField('seatLockMinutes', parseInt(e.target.value) || 1)}
              />
              <p className={hintClass}>Thời gian đếm ngược trên trang chọn ghế trước khi ghế được giải phóng.</p>
            </div>
          </div>
        </Section>
      )}

      {activeTab === 'online' && (
        <>
          <Section title="Giá vé streaming (VOD)">
            <div className="max-w-sm">
              <label className={labelClass}>Giá mặc định (VND)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={fieldClass}
                value={config.onlineStreamingPrice}
                onChange={(e) => updateField('onlineStreamingPrice', parseInt(e.target.value) || 0)}
              />
              <p className={hintClass}>
                Áp dụng khi phim chưa có giá VOD riêng. Hiện tại:{' '}
                {Number(config.onlineStreamingPrice || 0).toLocaleString('vi-VN')}đ / vé.
              </p>
            </div>
          </Section>

          <Section title="Đồng hồ thời gian đếm ngược" divided>
            <div className="max-w-md space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.onlineCountdownEnabled !== false}
                  onChange={(e) => updateField('onlineCountdownEnabled', e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                Hiển thị đồng hồ đếm ngược trên trang xem phim trực tuyến
              </label>

              <div>
                <label className={labelClass}>Thời lượng xem (× thời lượng phim)</label>
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  className={fieldClass}
                  value={config.onlineWatchLockMultiplier}
                  onChange={(e) => updateField('onlineWatchLockMultiplier', parseFloat(e.target.value) || 2)}
                />
                <p className={hintClass}>
                  Sau khi bấm phát, đồng hồ đếm ngược = thời lượng phim × hệ số.
                  {' '}{lockPreviewMinutes(config.onlineWatchLockMultiplier)}
                </p>
              </div>

              <div>
                <label className={labelClass}>Cảnh báo sắp hết hạn (phút)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className={fieldClass}
                  value={config.onlineCountdownWarningMinutes ?? 10}
                  onChange={(e) => updateField('onlineCountdownWarningMinutes', parseInt(e.target.value) || 10)}
                />
                <p className={hintClass}>
                  Khi thời gian còn lại dưới ngưỡng này, đồng hồ chuyển sang trạng thái cảnh báo.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Hệ số thời lượng</span>
                  <span className="text-gray-300">{config.onlineWatchLockMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  className="w-full accent-white cursor-pointer"
                  value={config.onlineWatchLockMultiplier}
                  onChange={(e) => updateField('onlineWatchLockMultiplier', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </Section>
        </>
      )}

      {activeTab === 'cinema' && (
        <>
          <ConfigTypeList
            title="Kiểu phòng chiếu"
            description="Danh sách kiểu phòng hiển thị khi tạo phòng mới. Mã phải khớp enum backend (STANDARD, IMAX, VIP, ...)."
            items={config.roomTypes || DEFAULT_ROOM_TYPES}
            onChange={(roomTypes) => updateField('roomTypes', roomTypes)}
            valuePlaceholder="STANDARD"
            labelPlaceholder="Standard 2D/3D"
          />
          <ConfigTypeList
            title="Kiểu rạp chiếu / định dạng"
            description="Định dạng chiếu phim (2D, 3D, IMAX...) dùng cho hiển thị và quản lý suất chiếu."
            items={config.screeningFormats || DEFAULT_SCREENING_FORMATS}
            onChange={(screeningFormats) => updateField('screeningFormats', screeningFormats)}
            valuePlaceholder="2D"
            labelPlaceholder="2D Phụ đề"
          />
        </>
      )}

      {activeTab === 'operations' && (
        <>
          <Section title="Hủy vé & hoàn tiền">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Chặn hủy trước giờ chiếu (phút)</label>
                <input
                  type="number"
                  min="0"
                  className={fieldClass}
                  value={config.cancellationCutoffMinutes}
                  onChange={(e) => updateField('cancellationCutoffMinutes', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Phí hủy vé (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={fieldClass}
                  value={config.cancellationFeePercent}
                  onChange={(e) => updateField('cancellationFeePercent', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.customerRefundEnabled !== false}
                  onChange={(e) => updateField('customerRefundEnabled', e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                Cho phép hoàn tiền khi khách hủy vé
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.fullRefundOnShowtimeCancel !== false}
                  onChange={(e) => updateField('fullRefundOnShowtimeCancel', e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                Hoàn 100% khi suất chiếu bị hủy
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.refundManualApprovalRequired !== false}
                  onChange={(e) => updateField('refundManualApprovalRequired', e.target.checked)}
                  className="rounded border-white/20 bg-white/5"
                />
                Bắt buộc admin duyệt hoàn tiền (hiển thị tại trang Duyệt hoàn tiền)
              </label>
            </div>
            <p className={hintClass + ' mt-3'}>
              Khi bật duyệt thủ công: khách hủy vé → đơn chờ hoàn tiền → admin duyệt tại /admin/refunds → tiền về ví hoặc Mock Gateway.
            </p>
          </Section>
          <Section title="Vận hành & bảo mật" divided>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Session timeout (giờ)</label>
              <input type="number" min="1" className={fieldClass} value={config.sessionTimeoutHours} onChange={(e) => updateField('sessionTimeoutHours', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Tỷ lệ tích điểm (%)</label>
              <input type="number" min="0" max="100" className={fieldClass} value={config.pointsEarningRatio} onChange={(e) => updateField('pointsEarningRatio', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Giá trị 1 điểm (VND)</label>
              <input type="number" min="0" step="100" className={fieldClass} value={config.pointsToCashValue} onChange={(e) => updateField('pointsToCashValue', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </Section>
        </>
      )}
    </AdminPage>
  );
};

export default ConfigPage;
