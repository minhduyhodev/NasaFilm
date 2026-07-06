import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mail, Plus, Trash2, Eye } from 'lucide-react';
import { adminEmailTemplateService } from '../api/adminEmailTemplateService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage } from '../components';
import EmailTemplateBlockEditor from '../components/EmailTemplateBlockEditor';
import {
  BLOCK_PRESETS,
  SYSTEM_TEMPLATE_CODES,
  applyTemplateVariables,
  createContentDocument,
  getFieldOptions,
  getPresetBlocks,
  isSystemTemplate,
  normalizeBlocks,
  previewBlocks,
  resolveTemplateBlocks,
  serializeContentDocument,
} from '../utils/emailTemplateUtils';
import './EmailTemplatesPage.css';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const emptyForm = {
  code: '',
  name: '',
  purpose: '',
  subject: '',
  blocks: [],
  active: true,
};

const CODE_OPTIONS = [
  ...SYSTEM_TEMPLATE_CODES.map((code) => ({
    value: code,
    label: BLOCK_PRESETS[code]?.name || code,
  })),
  { value: '__CUSTOM__', label: 'Mẫu tùy chỉnh (nhập mã riêng)' },
];

const EmailTemplatesPage = () => {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [codeMode, setCodeMode] = useState('VOD_TICKET');
  const [customCode, setCustomCode] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const subjectRef = useRef(null);

  const resolvedCode = codeMode === '__CUSTOM__'
    ? customCode.trim().toUpperCase()
    : codeMode;

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await adminEmailTemplateService.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      notificationService.error(error?.message || 'Không thể tải mẫu email');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const stats = useMemo(() => {
    const active = templates.filter((t) => t.active !== false).length;
    const system = templates.filter((t) => isSystemTemplate(t.code)).length;
    return {
      total: templates.length,
      active,
      system,
      custom: templates.length - system,
    };
  }, [templates]);

  const applyPreset = (code) => {
    const preset = BLOCK_PRESETS[code];
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      code,
      name: preset.name,
      purpose: preset.purpose,
      subject: preset.subject,
      blocks: getPresetBlocks(code),
    }));
  };

  const startCreate = () => {
    setEditingId('new');
    setCodeMode('VOD_TICKET');
    setCustomCode('');
    setForm(emptyForm);
    applyPreset('VOD_TICKET');
  };

  const startEdit = (template) => {
    const code = (template.code || '').toUpperCase();
    setEditingId(template.id);
    if (SYSTEM_TEMPLATE_CODES.includes(code)) {
      setCodeMode(code);
      setCustomCode('');
    } else {
      setCodeMode('__CUSTOM__');
      setCustomCode(code);
    }
    setForm({
      code,
      name: template.name || '',
      purpose: template.purpose || '',
      subject: template.subject || '',
      blocks: resolveTemplateBlocks(template, code),
      active: template.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCodeMode('VOD_TICKET');
    setCustomCode('');
  };

  const handleCodeModeChange = (value) => {
    setCodeMode(value);
    if (value !== '__CUSTOM__') {
      if (editingId === 'new') {
        applyPreset(value);
      } else {
        setForm((prev) => ({ ...prev, code: value }));
      }
    }
  };

  const insertSubjectField = (fieldKey) => {
    const token = `{{${fieldKey}}}`;
    const el = subjectRef.current;
    if (!el) {
      setForm((prev) => ({ ...prev, subject: `${prev.subject}${token}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = `${form.subject.slice(0, start)}${token}${form.subject.slice(end)}`;
    setForm((prev) => ({ ...prev, subject: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    const code = resolvedCode;
    if (!code || !form.name.trim() || !form.subject.trim() || !form.blocks.length) {
      notificationService.error('Vui lòng điền đủ loại mẫu, tên, tiêu đề và ít nhất một khối nội dung');
      return;
    }

    if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(code)) {
      notificationService.error('Mã mẫu chỉ gồm chữ in hoa, số và dấu gạch dưới (VD: VOD_TICKET)');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code,
        name: form.name.trim(),
        purpose: form.purpose.trim(),
        subject: form.subject.trim(),
        contentBlocks: serializeContentDocument(createContentDocument(form.blocks)),
        active: form.active,
      };

      if (editingId === 'new') {
        await adminEmailTemplateService.createTemplate(payload);
        notificationService.success('Đã tạo mẫu email');
      } else {
        await adminEmailTemplateService.updateTemplate(editingId, payload);
        notificationService.success('Đã cập nhật mẫu email');
      }
      cancelEdit();
      await loadTemplates();
    } catch (error) {
      notificationService.error(error?.message || 'Không thể lưu mẫu email');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (isSystemTemplate(code)) {
      notificationService.error('Không thể xóa mẫu email hệ thống. Bạn có thể tắt kích hoạt thay vì xóa.');
      return;
    }
    const ok = await confirm({
      title: 'Xóa mẫu email',
      message: `Xóa mẫu email "${code}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa mẫu',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminEmailTemplateService.deleteTemplate(id);
      notificationService.success('Đã xóa mẫu email');
      if (editingId === id) cancelEdit();
      await loadTemplates();
    } catch (error) {
      notificationService.error(error?.message || 'Không thể xóa mẫu email');
    }
  };

  const subjectFieldOptions = getFieldOptions(resolvedCode);
  const previewSubject = useMemo(() => applyTemplateVariables(form.subject), [form.subject]);
  const previewBody = useMemo(() => previewBlocks(form.blocks), [form.blocks]);

  return (
    <AdminPage className="et-page">
      <header>
        <div className="et-page__top-row">
          <div>
            <p className="et-page__eyebrow">Cấu hình hệ thống</p>
            <h1 className="et-page__title">Cấu hình mẫu email</h1>
            <p className="et-page__desc">
              Soạn nội dung bằng đoạn văn và chọn trường dữ liệu có sẵn. Hệ thống tự bọc khung HTML NASA FILM khi gửi.
            </p>
          </div>
          <button type="button" className="et-page__action" onClick={startCreate}>
            <Plus className="w-3.5 h-3.5" />
            Thêm mẫu
          </button>
        </div>
      </header>

      <div className="et-page__workspace">
        <div className="et-page__stats">
          <div className="et-page__stat">
            <span className="et-page__stat-label">Tổng mẫu</span>
            <span className="et-page__stat-value">{stats.total}</span>
          </div>
          <div className="et-page__stat">
            <span className="et-page__stat-label">Đang dùng</span>
            <span className="et-page__stat-value">{stats.active}</span>
          </div>
          <div className="et-page__stat">
            <span className="et-page__stat-label">Hệ thống</span>
            <span className="et-page__stat-value">{stats.system}</span>
          </div>
          <div className="et-page__stat">
            <span className="et-page__stat-label">Tùy chỉnh</span>
            <span className="et-page__stat-value">{stats.custom}</span>
          </div>
        </div>

        <div className="et-page__layout">
          <section className="et-page__section">
            <div className="et-page__section-head">
              <h2 className="et-page__section-title">Danh sách mẫu</h2>
            </div>
            <div className="et-page__section-body">
              {isLoading ? (
                <div className="et-page__loading">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <p className="et-empty">Chưa có mẫu email. Bấm &quot;Thêm mẫu&quot; để bắt đầu.</p>
              ) : (
                <div className="et-page__list">
                  {templates.map((template) => {
                    const isActive = editingId === template.id;
                    const system = isSystemTemplate(template.code);
                    return (
                      <div key={template.id} className="et-page__list-row">
                        <button
                          type="button"
                          onClick={() => startEdit(template)}
                          className={`et-template-item${isActive ? ' et-template-item--active' : ''}`}
                        >
                          <div className="et-template-item__name">
                            <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="truncate">{template.name}</span>
                            {system && <span className="et-badge et-badge--system">Hệ thống</span>}
                          </div>
                          <p className="et-template-item__code">{template.code}</p>
                          {template.purpose && (
                            <p className="et-template-item__purpose">{template.purpose}</p>
                          )}
                          <span className={`et-badge ${template.active ? 'et-badge--on' : 'et-badge--off'}`}>
                            {template.active ? 'Đang dùng' : 'Đã tắt'}
                          </span>
                        </button>
                        {!system && (
                          <button
                            type="button"
                            className="et-page__del"
                            onClick={() => handleDelete(template.id, template.code)}
                            aria-label="Xóa mẫu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="et-page__section">
            <div className="et-page__section-head">
              <h2 className="et-page__section-title">
                {editingId ? (editingId === 'new' ? 'Tạo mẫu mới' : 'Chỉnh sửa mẫu') : 'Biểu mẫu cấu hình'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="et-var-chip"
                >
                  <Eye className="w-3 h-3 inline mr-1" />
                  {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
                </button>
              )}
            </div>
            <div className="et-page__section-body">
              {!editingId ? (
                <p className="et-empty">
                  Chọn một mẫu bên trái hoặc bấm &quot;Thêm mẫu&quot; để cấu hình nội dung email.
                </p>
              ) : (
                <div className="et-page__form">
                  <div className="et-page__fields et-page__fields--2">
                    <div className="et-field">
                      <label className="et-label" htmlFor="template-code-select">Loại mẫu</label>
                      <select
                        id="template-code-select"
                        className="et-select"
                        value={codeMode}
                        onChange={(e) => handleCodeModeChange(e.target.value)}
                        disabled={editingId !== 'new'}
                      >
                        {CODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {editingId !== 'new' && (
                        <p className="et-hint">Mã mẫu không đổi sau khi tạo để tránh lỗi gửi mail.</p>
                      )}
                    </div>

                    {codeMode === '__CUSTOM__' && editingId === 'new' ? (
                      <div className="et-field">
                        <label className="et-label" htmlFor="custom-code">Mã tùy chỉnh</label>
                        <input
                          id="custom-code"
                          className="et-input"
                          style={{ fontFamily: 'var(--et-mono)' }}
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                          placeholder="MY_CUSTOM_TEMPLATE"
                        />
                      </div>
                    ) : (
                      <div className="et-field">
                        <label className="et-label" htmlFor="template-name">Tên hiển thị</label>
                        <input
                          id="template-name"
                          className="et-input"
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Vé xem phim online"
                        />
                      </div>
                    )}
                  </div>

                  {codeMode === '__CUSTOM__' && editingId === 'new' && (
                    <div className="et-field">
                      <label className="et-label" htmlFor="template-name-custom">Tên hiển thị</label>
                      <input
                        id="template-name-custom"
                        className="et-input"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Vé xem phim online"
                      />
                    </div>
                  )}

                  <div className="et-field">
                    <label className="et-label" htmlFor="template-purpose">Mục đích sử dụng</label>
                    <input
                      id="template-purpose"
                      className="et-input"
                      value={form.purpose}
                      onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                      placeholder="Gửi mã vé sau khi mua xem online"
                    />
                  </div>

                  <div className="et-field">
                    <label className="et-label" htmlFor="template-subject">Tiêu đề email</label>
                    <input
                      id="template-subject"
                      ref={subjectRef}
                      className="et-input"
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder="NASA FILM - Mã vé phim"
                    />
                    <p className="et-hint">Chèn trường dữ liệu vào tiêu đề bằng nút bên dưới.</p>
                    <div className="etb-subject-fields">
                      {subjectFieldOptions.map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          className="etb-subject-chip"
                          onClick={() => insertSubjectField(field.key)}
                        >
                          + {field.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <EmailTemplateBlockEditor
                    templateCode={resolvedCode}
                    blocks={form.blocks}
                    onChange={(blocks) => setForm((prev) => ({ ...prev, blocks: normalizeBlocks(blocks) }))}
                  />

                  {showPreview && (
                    <div className="et-preview">
                      <p className="et-label">Xem trước (dữ liệu mẫu)</p>
                      <div className="et-preview__subject">{previewSubject || '—'}</div>
                      <div className="et-preview__body">{previewBody || '—'}</div>
                    </div>
                  )}

                  <label className="et-switch">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    />
                    <span className="et-switch-track" aria-hidden="true" />
                    <span className="et-switch-text">Kích hoạt mẫu này khi gửi email</span>
                  </label>

                  <div className="et-page__form-actions">
                    <button
                      type="button"
                      className="et-page__save"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Đang lưu…' : 'Lưu cấu hình'}
                    </button>
                    <button type="button" className="et-page__ghost" onClick={cancelEdit} disabled={isSaving}>
                      Hủy
                    </button>
                    {editingId !== 'new' && SYSTEM_TEMPLATE_CODES.includes(resolvedCode) && (
                      <button
                        type="button"
                        className="et-page__ghost"
                        onClick={() => applyPreset(resolvedCode)}
                        disabled={isSaving}
                      >
                        Khôi phục mặc định
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminPage>
  );
};

export default EmailTemplatesPage;
