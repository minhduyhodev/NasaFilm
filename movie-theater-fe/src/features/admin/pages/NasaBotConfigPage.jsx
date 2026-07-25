import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageCircleMore, Save, Sparkles } from 'lucide-react';
import { AdminPage, PageHeader } from '../components';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { DEFAULT_NASA_BOT_CONFIG, DEFAULT_NASA_BOT_SUPPORT_FAQS } from '../../../shared/constants/systemConfig';
import { normalizeNasaBotConfig, normalizeNasaBotShortcut } from '../../../shared/utils/systemConfig';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './NasaBotConfigPage.css';

const cloneBotConfig = (config) => JSON.parse(JSON.stringify(normalizeNasaBotConfig(config || DEFAULT_NASA_BOT_CONFIG)));

const CATEGORY_KEYWORD_LABELS = {
  ticket: 'Vé / suất chiếu',
  payment: 'Thanh toán',
  account: 'Tài khoản',
  promo: 'Khuyến mãi',
  membership: 'Hội viên',
};
const createShortcut = (index) => ({
  buttonName: `Shortcut ${index + 1}`,
  shortcutName: `custom_${index + 1}_support`,
  description: 'Mô tả ngắn cho shortcut này',
  queryContent: 'Tôi cần hỗ trợ thêm về vấn đề này.',
});

const NasaBotConfigPage = () => {
  const confirm = useConfirm();
  const [fullConfig, setFullConfig] = useState(null);
  const [botConfig, setBotConfig] = useState(cloneBotConfig(DEFAULT_NASA_BOT_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    systemConfigService.getAdminConfig()
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

  const _updateOpeningQuestion = (index, value) => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: prev.openingQuestions.map((item, idx) => (idx === index ? value : item)),
    }));
  };

  const _addOpeningQuestion = () => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: [...prev.openingQuestions, 'Câu hỏi mở mới'],
    }));
  };

  const _removeOpeningQuestion = (index) => {
    setBotConfig((prev) => ({
      ...prev,
      openingQuestions: prev.openingQuestions.filter((_, idx) => idx !== index),
    }));
  };

  const _updateShortcut = (index, field, value) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const _addShortcut = () => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: [...prev.shortcuts, createShortcut(prev.shortcuts.length)],
    }));
  };


  const updateCategoryKeywords = (category, value) => {
    setBotConfig((prev) => ({
      ...prev,
      categoryKeywords: {
        ...(prev.categoryKeywords || {}),
        [category]: value.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      },
    }));
  };

  const updateBannedWords = (value) => {
    setBotConfig((prev) => ({
      ...prev,
      bannedWords: value.split(',').map((word) => word.trim()).filter(Boolean),
    }));
  };
  const _removeShortcut = (index) => {
    setBotConfig((prev) => ({
      ...prev,
      shortcuts: prev.shortcuts.filter((_, idx) => idx !== index),
    }));
  };

  const handleSave = async () => {
    const ok = await confirm({
      title: 'Lưu cấu hình NASA Bot',
      message: 'Thay đổi sẽ áp dụng ngay cho widget và luồng chat AI. Tiếp tục?',
      confirmLabel: 'Lưu cấu hình',
      variant: 'warning',
    });
    if (!ok) return;

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
      <PageHeader
        eyebrow="AI Agent · NASA Bot"
        title="Cấu hình NASA Bot"
        description="Prompt, câu mở đầu và shortcut hỗ trợ đang áp dụng cho widget chat AI."
        primaryAction={{
          label: saving ? 'Đang lưu...' : 'Lưu NASA Bot',
          icon: <Save className="w-4 h-4" />,
          onClick: handleSave,
          disabled: saving,
          loading: saving,
        }}
      />

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
            <Bot className="w-4 h-4" />
            NASA Bot Keyword
          </div>
          <p className="nasabot-config__desc">
            Keyword nối thẳng tới backend để bot hiểu nhóm hỗ trợ. Nhập các keyword cách nhau bằng dấu phẩy.
          </p>

          <div className="nasabot-config__list">
            {Object.entries(CATEGORY_KEYWORD_LABELS).map(([category, label]) => (
              <label key={category} className="nasabot-config__field">
                <span>{label}</span>
                <textarea
                  className="nasabot-config__textarea nasabot-config__textarea--compact"
                  value={(botConfig.categoryKeywords?.[category] || []).join(', ')}
                  onChange={(e) => updateCategoryKeywords(category, e.target.value)}
                  placeholder="Ví dụ: vé, đặt vé, mã vé"
                />
              </label>
            ))}
          </div>

          <div className="nasabot-config__subgroup">
            <div className="nasabot-config__subgroup-head">
              <span>Keyword từ cấm / chửi tục</span>
            </div>
            <textarea
              className="nasabot-config__textarea nasabot-config__textarea--compact"
              value={(botConfig.bannedWords || []).join(', ')}
              onChange={(e) => updateBannedWords(e.target.value)}
              placeholder="Ví dụ: từ tục 1, từ tục 2"
            />
            <p className="nasabot-config__desc">
              Nếu khách nhắn chứa từ trong danh sách này, bot trả về: Vui lòng nhắn nội dung phù hợp.
            </p>
          </div>
        </section>

        <section className="nasabot-config__panel nasabot-config__panel--faq">
          <div className="nasabot-config__panel-title">
            <MessageCircleMore className="w-4 h-4" />
            FAQ tham chiếu (Tài khoản · Khuyến mãi · Hội viên)
          </div>
          <p className="nasabot-config__desc">
            Nội dung mặc định đã gắn vào personaPrompt. Admin có thể chỉnh trong ô Prompt phía trên.
            Kịch bản chi tiết cho staff: <code>docs/05_SUPPORT_SCRIPTS.md</code>
          </p>
          <div className="nasabot-faq-list">
            {DEFAULT_NASA_BOT_SUPPORT_FAQS.map((group) => (
              <article key={group.key} className="nasabot-faq-card">
                <header className="nasabot-faq-card__head">
                  <strong>{group.label}</strong>
                  <span>{group.summary}</span>
                </header>
                <ul className="nasabot-faq-card__items">
                  {group.items.map((item) => (
                    <li key={item.q}>
                      <strong>{item.q}</strong>
                      <p>{item.a}</p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
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
