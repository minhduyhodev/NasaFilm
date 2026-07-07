import React, { useEffect, useMemo, useState } from 'react';
import { Bot, MessageCircleMore, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { AdminPage } from '../components';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_NASA_BOT_CONFIG } from '../../../shared/constants/systemConfig';
import { normalizeNasaBotConfig, normalizeNasaBotShortcut } from '../../../shared/utils/systemConfig';
import './NasaBotConfigPage.css';

const cloneBotConfig = (config) => JSON.parse(JSON.stringify(normalizeNasaBotConfig(config || DEFAULT_NASA_BOT_CONFIG)));

const createShortcut = (index) => ({
  buttonName: `Shortcut ${index + 1}`,
  shortcutName: `custom_${index + 1}_support`,
  description: 'Mô tả ngắn cho shortcut này',
  queryContent: 'Tôi cần hỗ trợ thêm về vấn đề này.',
});

const NasaBotConfigPage = () => {
  const [fullConfig, setFullConfig] = useState(null);
  const [botConfig, setBotConfig] = useState(cloneBotConfig(DEFAULT_NASA_BOT_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    systemConfigService.getConfig()
      .then((data) => {
        if (!active) return;
        setFullConfig(data);
        setBotConfig(cloneBotConfig(data?.nasaBot));
      })
      .catch(() => {
        if (!active) return;
        setFullConfig({ nasaBot: DEFAULT_NASA_BOT_CONFIG });
        setBotConfig(cloneBotConfig(DEFAULT_NASA_BOT_CONFIG));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setBotConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateOpeningQuestion = (index, value) => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: prev.openingQuestions.map((item, idx) => (idx === index ? value : item)),
    }));
  };

  const addOpeningQuestion = () => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: [...prev.openingQuestions, 'Câu hỏi mở mới'],
    }));
  };

  const removeOpeningQuestion = (index) => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: prev.openingQuestions.filter((_, idx) => idx !== index),
    }));
  };

  const updateShortcut = (index, field, value) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addShortcut = () => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: [...prev.shortcuts, createShortcut(prev.shortcuts.length)],
    }));
  };

  const removeShortcut = (index) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedBotConfig = normalizeNasaBotConfig(botConfig);
      const payload = {
        ...(fullConfig || {}),
        nasaBot: normalizedBotConfig,
      };
      const saved = await systemConfigService.saveConfig(payload);
      setFullConfig(saved);
      setBotConfig(cloneBotConfig(saved?.nasaBot));
      notificationService.success('Đã lưu cấu hình NASA Bot đang được áp dụng thực tế.');
    } catch (error) {
      notificationService.error(error?.message || 'Không thể lưu cấu hình NASA Bot.');
    } finally {
      setSaving(false);
    }
  };

  const previewOpening = useMemo(
    () => botConfig.openingQuestions.map((item) => `${item || ''}`.trim()).filter(Boolean).slice(0, 4),
    [botConfig.openingQuestions],
  );

  const previewShortcuts = useMemo(
    () => botConfig.shortcuts
      .map((item) => normalizeNasaBotShortcut(item))
      .filter((item) => item?.buttonName)
      .slice(0, 4),
    [botConfig.shortcuts],
  );

  if (loading) {
    return (
      <AdminPage className="nasabot-config">
        <div className="nasabot-config__loading">Đang tải cấu hình NASA Bot...</div>
      </AdminPage>
    );
  }

  return (
    <AdminPage className="nasabot-config">
      <header className="nasabot-config__top">
        <div>
          <p className="nasabot-config__eyebrow">AI Agent · NASA Bot</p>
          <h1 className="nasabot-config__title">Cấu hình đang áp dụng cho NASA Bot</h1>
          <p className="nasabot-config__desc">
            Trang này chỉ giữ lại các mục đang được dùng thật trong widget và luồng chat AI:
            prompt, câu mở đầu và shortcut hỗ trợ.
          </p>
        </div>
        <button type="button" className="nasabot-config__save" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu NASA Bot'}
        </button>
      </header>

      <div className="nasabot-config__shell">
        <section className="nasabot-config__panel nasabot-config__panel--prompt">
          <div className="nasabot-config__panel-title">
            <Bot className="w-4 h-4" />
            Prompt đang dùng cho AI
          </div>
          <p className="nasabot-config__desc">
            Prompt này được backend dùng cho `/api/support-ai/chat`.
          </p>
          <textarea
            className="nasabot-config__textarea nasabot-config__textarea--prompt"
            value={botConfig.personaPrompt}
            onChange={(e) => updateField('personaPrompt', e.target.value)}
            placeholder="Nhập prompt hệ thống của NASA Bot..."
          />
        </section>

        <section className="nasabot-config__panel nasabot-config__panel--arrangement">
          <div className="nasabot-config__panel-title">
            <MessageCircleMore className="w-4 h-4" />
            Trải nghiệm trong widget
          </div>

          <div className="nasabot-config__subgroup">
            <div className="nasabot-config__subgroup-head">
              <span>Opening questions</span>
              <button type="button" className="nasabot-config__icon-btn" onClick={addOpeningQuestion}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="nasabot-config__list">
              {botConfig.openingQuestions.map((question, index) => (
                <div key={`opening-${index}`} className="nasabot-config__list-item">
                  <input
                    className="nasabot-config__input"
                    value={question}
                    onChange={(e) => updateOpeningQuestion(index, e.target.value)}
                    placeholder="Ví dụ: Thanh toán bị lỗi"
                  />
                  <button type="button" className="nasabot-config__icon-btn" onClick={() => removeOpeningQuestion(index)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="nasabot-config__subgroup">
            <div className="nasabot-config__subgroup-head">
              <span>Shortcuts</span>
              <button type="button" className="nasabot-config__icon-btn" onClick={addShortcut}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="nasabot-config__list">
              {botConfig.shortcuts.map((shortcut, index) => (
                <div key={`${shortcut.shortcutName || 'shortcut'}-${index}`} className="nasabot-config__shortcut-card">
                  <label className="nasabot-config__field">
                    <span>Nhãn hiển thị</span>
                    <input
                      className="nasabot-config__input"
                      value={shortcut.buttonName}
                      onChange={(e) => updateShortcut(index, 'buttonName', e.target.value)}
                      placeholder="Ví dụ: Thanh toán"
                    />
                  </label>
                  <label className="nasabot-config__field">
                    <span>Mô tả ngắn</span>
                    <textarea
                      className="nasabot-config__textarea nasabot-config__textarea--compact"
                      value={shortcut.description}
                      onChange={(e) => updateShortcut(index, 'description', e.target.value)}
                      placeholder="Hiển thị dưới nút shortcut"
                    />
                  </label>
                  <label className="nasabot-config__field">
                    <span>Nội dung bot hiểu khi bấm shortcut</span>
                    <textarea
                      className="nasabot-config__textarea nasabot-config__textarea--compact"
                      value={shortcut.queryContent}
                      onChange={(e) => updateShortcut(index, 'queryContent', e.target.value)}
                      placeholder="Ví dụ: Tôi cần hỗ trợ về thanh toán."
                    />
                  </label>
                  <label className="nasabot-config__field">
                    <span>Khóa nội bộ</span>
                    <input
                      className="nasabot-config__input"
                      value={shortcut.shortcutName}
                      onChange={(e) => updateShortcut(index, 'shortcutName', e.target.value)}
                      placeholder="payment_support"
                    />
                  </label>
                  <div className="nasabot-config__shortcut-foot">
                    <span className="nasabot-config__shortcut-id">
                      Áp dụng trực tiếp vào widget sau khi lưu
                    </span>
                    <button type="button" className="nasabot-config__icon-btn" onClick={() => removeShortcut(index)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="nasabot-config__panel nasabot-config__panel--preview">
          <div className="nasabot-config__panel-title">
            <Sparkles className="w-4 h-4" />
            Preview nhanh
          </div>
          <div className="nasabot-preview">
            <div className="nasabot-preview__header">
              <div>
                <div className="nasabot-preview__title">NASA BOT</div>
                <div className="nasabot-preview__mode">Widget + Support AI</div>
              </div>
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--bot">
              {previewOpening.map((question, index) => (
                <div key={`preview-opening-${index}`}>{index + 1}. {question}</div>
              ))}
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--user">
              Tôi cần hỗ trợ về thanh toán.
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--bot">
              {botConfig.personaPrompt.split('\n').find((line) => line.trim()) || 'NASA BOT đang sẵn sàng hỗ trợ.'}
            </div>

            <div className="nasabot-preview__shortcuts">
              {previewShortcuts.map((shortcut) => (
                <div key={shortcut.shortcutName} className="nasabot-preview__shortcut">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{shortcut.buttonName}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminPage>
  );
};

export default NasaBotConfigPage;
