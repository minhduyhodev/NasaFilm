import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_SYSTEM_CONFIG } from '../../../shared/constants/systemConfig';
import { writeCachedSystemConfig } from '../../../shared/utils/systemConfig';
import {
  AdminPage,
  PageHeader,
  Section,
  GhostButton,
} from '../components';

const TABS = [
  { id: 'showtime', label: 'Suat chieu tu dong' },
  { id: 'pricing', label: 'Dinh gia ve' },
  { id: 'operations', label: 'Van hanh & bao mat' },
];

const fieldClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const hintClass = 'text-xs text-gray-600 mt-1';

const ConfigPage = () => {
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
      notificationService.success('Da luu cau hinh he thong.');
    } catch (error) {
      notificationService.error(error?.message || 'Khong the luu cau hinh.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Khoi phuc tat ca cau hinh ve mac dinh?')) return;
    setIsSaving(true);
    try {
      const restored = await systemConfigService.saveConfig(DEFAULT_SYSTEM_CONFIG);
      setConfig(restored);
      notificationService.info('Da khoi phuc cau hinh mac dinh.');
    } catch {
      setConfig(DEFAULT_SYSTEM_CONFIG);
      writeCachedSystemConfig(DEFAULT_SYSTEM_CONFIG);
      notificationService.info('Da khoi phuc cau hinh mac dinh tren trinh duyet.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        Dang tai cau hinh...
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Cau hinh he thong"
        description="Tham so van hanh, dinh gia ve mac dinh va trong so thuat toan suat chieu."
        primaryAction={{
          label: 'Luu cau hinh',
          onClick: handleSave,
          loading: isSaving,
          disabled: isSaving,
        }}
        menuItems={[
          {
            label: 'Khoi phuc mac dinh',
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
          <Section title="Khung gio suat chieu">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gio mo cua</label>
                <input type="time" className={fieldClass} value={config.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
                <p className={hintClass}>Khung gio som nhat thuat toan co the phan bo suat.</p>
              </div>
              <div>
                <label className={labelClass}>Gio dong cua</label>
                <input type="time" className={fieldClass} value={config.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
                <p className={hintClass}>Thoi gian muon nhat suat phai ket thuc.</p>
              </div>
              <div>
                <label className={labelClass}>Thoi gian don dep (phut)</label>
                <input type="number" min="0" max="120" className={fieldClass} value={config.intervalMinutes} onChange={(e) => updateField('intervalMinutes', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Trailer buffer (phut)</label>
                <input type="number" min="0" max="60" className={fieldClass} value={config.trailerBuffer} onChange={(e) => updateField('trailerBuffer', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </Section>

          <Section title="Trong so uu tien" divided>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'goldenHourWeight', label: 'Gio vang' },
                { key: 'weekendWeight', label: 'Cuoi tuan' },
                { key: 'ratingWeight', label: 'Danh gia phim' },
                { key: 'genreWeight', label: 'Do hot the loai' },
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
        <>
          <Section title="Gia ve rap">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Ve thuong (VND)</label>
                <input type="number" min="0" step="5000" className={fieldClass} value={config.basePrice} onChange={(e) => updateField('basePrice', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Ve VIP (VND)</label>
                <input type="number" min="0" step="5000" className={fieldClass} value={config.vipPrice} onChange={(e) => updateField('vipPrice', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Ve doi (VND)</label>
                <input type="number" min="0" step="5000" className={fieldClass} value={config.couplePrice} onChange={(e) => updateField('couplePrice', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <p className={hintClass}>Gia goi y khi tao suat chieu tu dong hoac thu cong.</p>
          </Section>

          <Section title="Gia ve streaming (VOD)" divided>
            <div className="max-w-sm">
              <label className={labelClass}>Gia mac dinh (VND)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className={fieldClass}
                value={config.onlineStreamingPrice}
                onChange={(e) => updateField('onlineStreamingPrice', parseInt(e.target.value) || 0)}
              />
              <p className={hintClass}>
                Ap dung khi phim chua co gia VOD rieng. Hien tai:{' '}
                {Number(config.onlineStreamingPrice || 0).toLocaleString('vi-VN')}d / ve.
              </p>
            </div>
          </Section>
        </>
      )}

      {activeTab === 'operations' && (
        <Section title="Van hanh & bao mat">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tam giu ghe (phut)</label>
              <input type="number" min="1" max="30" className={fieldClass} value={config.seatLockMinutes} onChange={(e) => updateField('seatLockMinutes', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Session timeout (gio)</label>
              <input type="number" min="1" className={fieldClass} value={config.sessionTimeoutHours} onChange={(e) => updateField('sessionTimeoutHours', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Ty le tich diem (%)</label>
              <input type="number" min="0" max="100" className={fieldClass} value={config.pointsEarningRatio} onChange={(e) => updateField('pointsEarningRatio', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Gia tri 1 diem (VND)</label>
              <input type="number" min="0" step="100" className={fieldClass} value={config.pointsToCashValue} onChange={(e) => updateField('pointsToCashValue', parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </Section>
      )}
    </AdminPage>
  );
};

export default ConfigPage;
