import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  BrainCircuit,
  Database,
  Image as ImageIcon,
  Lightbulb,
  MessageCircleMore,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Table2,
  Trash2,
  Variable,
} from 'lucide-react';
import { AdminPage } from '../components';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_NASA_BOT_CONFIG } from '../../../shared/constants/systemConfig';
import './NasaBotConfigPage.css';

const cloneBotConfig = (config) => JSON.parse(JSON.stringify(config || DEFAULT_NASA_BOT_CONFIG));

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
        setBotConfig(cloneBotConfig(data?.nasaBot || DEFAULT_NASA_BOT_CONFIG));
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

  const updateShortcut = (index, field, value) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addShortcut = () => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: [
        ...prev.shortcuts,
        {
          buttonName: 'Shortcut mới',
          shortcutName: `custom_${prev.shortcuts.length + 1}`,
          description: 'Mô tả ngắn cho shortcut mới',
          queryContent: 'Tôi cần được hỗ trợ.',
        },
      ],
    }));
  };

  const removeShortcut = (index) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.filter((_, idx) => idx !== index),
    }));
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(fullConfig || {}),
        nasaBot: botConfig,
      };
      const saved = await systemConfigService.saveConfig(payload);
      setFullConfig(saved);
      setBotConfig(cloneBotConfig(saved?.nasaBot || botConfig));
      notificationService.success('Đã lưu cấu hình NASA Bot.');
    } catch (error) {
      notificationService.error(error?.message || 'Không thể lưu cấu hình NASA Bot.');
    } finally {
      setSaving(false);
    }
  };

  const previewOpening = useMemo(
    () => botConfig.openingQuestions.filter(Boolean).slice(0, 4),
    [botConfig.openingQuestions],
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
          <h1 className="nasabot-config__title">Trung tâm cấu hình trợ lý hỗ trợ</h1>
          <p className="nasabot-config__desc">
            Bố cục mô phỏng Coze: chỉnh prompt, opening questions, auto-suggestion, shortcuts và vùng preview ngay trong admin.
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
            Persona & Prompt
          </div>
          <input
            className="nasabot-config__input"
            value={botConfig.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Tên bot"
          />
          <textarea
            className="nasabot-config__textarea nasabot-config__textarea--prompt"
            value={botConfig.personaPrompt}
            onChange={(e) => updateField('personaPrompt', e.target.value)}
            placeholder="Nhập prompt hệ thống của NASA Bot..."
          />
        </section>

        <section className="nasabot-config__panel nasabot-config__panel--arrangement">
          <div className="nasabot-config__panel-title">
            <Settings2 className="w-4 h-4" />
            Arrangement
          </div>

          <div className="nasabot-config__group">
            <div className="nasabot-config__group-title">
              <BrainCircuit className="w-4 h-4" />
              Model settings
            </div>
            <div className="nasabot-config__grid nasabot-config__grid--2">
              <label className="nasabot-config__field">
                <span>Provider</span>
                <input className="nasabot-config__input" value={botConfig.provider} onChange={(e) => updateField('provider', e.target.value)} />
              </label>
              <label className="nasabot-config__field">
                <span>Model</span>
                <input className="nasabot-config__input" value={botConfig.model} onChange={(e) => updateField('model', e.target.value)} />
              </label>
              <label className="nasabot-config__field">
                <span>Temperature</span>
                <input type="number" step="0.1" className="nasabot-config__input" value={botConfig.temperature} onChange={(e) => updateField('temperature', Number(e.target.value) || 0)} />
              </label>
              <label className="nasabot-config__field">
                <span>Top P</span>
                <input type="number" step="0.1" className="nasabot-config__input" value={botConfig.topP} onChange={(e) => updateField('topP', Number(e.target.value) || 0)} />
              </label>
              <label className="nasabot-config__field">
                <span>Context rounds</span>
                <input type="number" className="nasabot-config__input" value={botConfig.contextRounds} onChange={(e) => updateField('contextRounds', Number(e.target.value) || 0)} />
              </label>
              <label className="nasabot-config__field">
                <span>Response max length</span>
                <input type="number" className="nasabot-config__input" value={botConfig.responseMaxLength} onChange={(e) => updateField('responseMaxLength', Number(e.target.value) || 0)} />
              </label>
            </div>
          </div>

          <div className="nasabot-config__group">
            <div className="nasabot-config__group-title">Skills</div>
            <div className="nasabot-config__switches">
              <label className="nasabot-config__toggle">
                <input type="checkbox" checked={botConfig.pluginsEnabled} onChange={(e) => updateField('pluginsEnabled', e.target.checked)} />
                <span>Plugins</span>
              </label>
              <label className="nasabot-config__toggle">
                <input type="checkbox" checked={botConfig.workflowsEnabled} onChange={(e) => updateField('workflowsEnabled', e.target.checked)} />
                <span>Workflows</span>
              </label>
            </div>
          </div>

          <div className="nasabot-config__group">
            <div className="nasabot-config__group-title">
              <Database className="w-4 h-4" />
              Knowledge
            </div>
            <label className="nasabot-config__field">
              <span>Text</span>
              <textarea className="nasabot-config__textarea" value={botConfig.knowledgeTextSummary} onChange={(e) => updateField('knowledgeTextSummary', e.target.value)} />
            </label>
            <label className="nasabot-config__field">
              <span>Table</span>
              <textarea className="nasabot-config__textarea" value={botConfig.knowledgeTableSummary} onChange={(e) => updateField('knowledgeTableSummary', e.target.value)} />
            </label>
            <label className="nasabot-config__field">
              <span>Images</span>
              <textarea className="nasabot-config__textarea" value={botConfig.knowledgeImageSummary} onChange={(e) => updateField('knowledgeImageSummary', e.target.value)} />
            </label>
          </div>

          <div className="nasabot-config__group">
            <div className="nasabot-config__group-title">
              <Variable className="w-4 h-4" />
              Memory
            </div>
            <label className="nasabot-config__field">
              <span>Variables</span>
              <input className="nasabot-config__input" value={botConfig.memoryVariablesSummary} onChange={(e) => updateField('memoryVariablesSummary', e.target.value)} />
            </label>
            <label className="nasabot-config__field">
              <span>Database</span>
              <input className="nasabot-config__input" value={botConfig.memoryDatabaseSummary} onChange={(e) => updateField('memoryDatabaseSummary', e.target.value)} />
            </label>
          </div>

          <div className="nasabot-config__group">
            <div className="nasabot-config__group-title">
              <MessageCircleMore className="w-4 h-4" />
              Chat experience
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
                  <div key={`${question}-${index}`} className="nasabot-config__list-item">
                    <input
                      className="nasabot-config__input"
                      value={question}
                      onChange={(e) => updateOpeningQuestion(index, e.target.value)}
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
                <span>Auto-suggestion</span>
              </div>
              <label className="nasabot-config__toggle">
                <input type="checkbox" checked={botConfig.autoSuggestionEnabled} onChange={(e) => updateField('autoSuggestionEnabled', e.target.checked)} />
                <span>Bật gợi ý tự động</span>
              </label>
              <textarea
                className="nasabot-config__textarea"
                value={botConfig.autoSuggestionPrompt}
                onChange={(e) => updateField('autoSuggestionPrompt', e.target.value)}
              />
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
                  <div key={`${shortcut.id}-${index}`} className="nasabot-config__shortcut-card">
                    <input
                      className="nasabot-config__input"
                      value={shortcut.buttonName}
                      onChange={(e) => updateShortcut(index, 'buttonName', e.target.value)}
                      placeholder="Button name"
                    />
                    <input
                      className="nasabot-config__input"
                      value={shortcut.shortcutName}
                      onChange={(e) => updateShortcut(index, 'shortcutName', e.target.value)}
                      placeholder="Shortcut name"
                    />
                    <textarea
                      className="nasabot-config__textarea nasabot-config__textarea--compact"
                      value={shortcut.description}
                      onChange={(e) => updateShortcut(index, 'description', e.target.value)}
                      placeholder="Mô tả hiển thị"
                    />
                    <textarea
                      className="nasabot-config__textarea nasabot-config__textarea--compact"
                      value={shortcut.queryContent}
                      onChange={(e) => updateShortcut(index, 'queryContent', e.target.value)}
                      placeholder="Nội dung gửi vào bot khi bấm shortcut"
                    />
                    <div className="nasabot-config__shortcut-foot">
                      <span className="nasabot-config__shortcut-id">{shortcut.shortcutName}</span>
                      <button type="button" className="nasabot-config__icon-btn" onClick={() => removeShortcut(index)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nasabot-config__subgroup">
              <div className="nasabot-config__subgroup-head">
                <span>Background image</span>
              </div>
              <label className="nasabot-config__field">
                <span>Image URL</span>
                <input className="nasabot-config__input" value={botConfig.backgroundImageUrl} onChange={(e) => updateField('backgroundImageUrl', e.target.value)} placeholder="https://..." />
              </label>
            </div>
          </div>
        </section>

        <section className="nasabot-config__panel nasabot-config__panel--preview">
          <div className="nasabot-config__panel-title">
            <Sparkles className="w-4 h-4" />
            Preview & Debug
          </div>
          <div className="nasabot-preview">
            <div className="nasabot-preview__header">
              <img src="" alt="" />
              <div>
                <div className="nasabot-preview__title">{botConfig.title}</div>
                <div className="nasabot-preview__mode">{botConfig.mode}</div>
              </div>
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--bot">
              {previewOpening.map((question, index) => (
                <div key={`${question}-${index}`}>{index + 1}. {question}</div>
              ))}
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--user">
              Tôi cần hỗ trợ về vé hoặc suất chiếu.
            </div>

            <div className="nasabot-preview__bubble nasabot-preview__bubble--bot">
              {botConfig.personaPrompt.split('\n')[0]}
            </div>

            <div className="nasabot-preview__shortcuts">
              {botConfig.shortcuts.slice(0, 4).map((shortcut) => (
                <div key={shortcut.shortcutName} className="nasabot-preview__shortcut">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{shortcut.buttonName}</span>
                </div>
              ))}
            </div>

            <div className="nasabot-preview__meta">
              <span><Table2 className="w-3.5 h-3.5" /> {botConfig.knowledgeAutoCall ? 'Knowledge auto-call On' : 'Knowledge auto-call Off'}</span>
              <span><ImageIcon className="w-3.5 h-3.5" /> {botConfig.backgroundImageUrl ? 'Có background' : 'Chưa có background'}</span>
            </div>
          </div>
        </section>
      </div>
    </AdminPage>
  );
};

export default NasaBotConfigPage;
