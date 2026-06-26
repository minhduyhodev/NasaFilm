import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mail, Plus, Trash2, Eye } from 'lucide-react';
import { adminEmailTemplateService } from '../api/adminEmailTemplateService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, PrimaryButton, GhostButton } from '../components';
import {
  SYSTEM_TEMPLATE_CODES,
  TEMPLATE_PRESETS,
  applyTemplateVariables,
  buildEmailHtml,
  getVariableList,
  htmlToEditableText,
  isSystemTemplate,
} from '../utils/emailTemplateUtils';
import './EmailTemplatesPage.css';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const emptyForm = {
  code: '',
  name: '',
  purpose: '',
  subject: '',
  textBody: '',
  active: true,
};

const CODE_OPTIONS = [
  ...SYSTEM_TEMPLATE_CODES.map((code) => ({
    value: code,
    label: TEMPLATE_PRESETS[code]?.name || code,
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
  const textBodyRef = useRef(null);

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

  const applyPreset = (code) => {
    const preset = TEMPLATE_PRESETS[code];
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      code,
      name: preset.name,
      purpose: preset.purpose,
      subject: preset.subject,
      textBody: preset.textBody,
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
      textBody: htmlToEditableText(template.htmlBody || ''),
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

  const insertVariable = (varName) => {
    const token = `{{${varName}}}`;
    const el = textBodyRef.current;
    if (!el) {
      setForm((prev) => ({ ...prev, textBody: `${prev.textBody}${prev.textBody ? '\n' : ''}${token}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = `${form.textBody.slice(0, start)}${token}${form.textBody.slice(end)}`;
    setForm((prev) => ({ ...prev, textBody: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    const code = resolvedCode;
    if (!code || !form.name.trim() || !form.subject.trim() || !form.textBody.trim()) {
      notificationService.error('Vui lòng điền đủ loại mẫu, tên, tiêu đề và nội dung email');
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
        htmlBody: buildEmailHtml(form.textBody, code),
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

  const variableList = getVariableList(resolvedCode);
  const previewSubject = useMemo(() => applyTemplateVariables(form.subject), [form.subject]);
  const previewBody = useMemo(() => applyTemplateVariables(form.textBody), [form.textBody]);

  return (
    <AdminPage className="et-page">
      <PageHeader
        eyebrow="Cấu hình & Bảo mật"
        title="Cấu hình mẫu email"
        description="Soạn nội dung email dạng văn bản với biến {{TÊN_BIẾN}}. Hệ thống tự bọc khung HTML NASA FILM khi gửi."
        variant="display"
        primaryAction={{
          label: 'Thêm mẫu',
          onClick: startCreate,
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <div className="et-layout">
        <div className="et-panel">
          <div className="et-panel__head">
            <h2 className="et-panel__title">Danh sách mẫu ({templates.length})</h2>
          </div>
          <div className="et-panel__body">
            {isLoading ? (
              <div className="flex justify-center py-10 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="et-empty">Chưa có mẫu email.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => {
                  const isActive = editingId === template.id;
                  const system = isSystemTemplate(template.code);
                  return (
                    <div key={template.id} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(template)}
                        className={`et-template-item ${isActive ? 'et-template-item--active' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                            <p className="text-sm font-semibold text-white truncate">{template.name}</p>
                            {system && <span className="et-badge et-badge--system">Hệ thống</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 font-mono">{template.code}</p>
                          {template.purpose && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.purpose}</p>
                          )}
                          <span className={`et-badge ${template.active ? 'et-badge--on' : 'et-badge--off'}`}>
                            {template.active ? 'Đang dùng' : 'Đã tắt'}
                          </span>
                        </div>
                      </button>
                      {!system && (
                        <GhostButton type="button" onClick={() => handleDelete(template.id, template.code)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </GhostButton>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="et-panel">
          <div className="et-panel__head flex items-center justify-between gap-3">
            <h2 className="et-panel__title">
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
          <div className="et-panel__body">
            {!editingId ? (
              <p className="et-empty">
                Chọn một mẫu bên trái hoặc bấm &quot;Thêm mẫu&quot; để cấu hình nội dung email.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {codeMode === '__CUSTOM__' && editingId === 'new' && (
                    <div className="et-field">
                      <label className="et-label" htmlFor="custom-code">Mã tùy chỉnh</label>
                      <input
                        id="custom-code"
                        className="et-input font-mono"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                        placeholder="MY_CUSTOM_TEMPLATE"
                      />
                    </div>
                  )}

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
                </div>

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
                    className="et-input"
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="NASA FILM - Mã vé {{MOVIE_TITLE}}"
                  />
                  <p className="et-hint">Dùng biến trong tiêu đề, ví dụ: {'{{MOVIE_TITLE}}'}</p>
                </div>

                <div className="et-field">
                  <label className="et-label" htmlFor="template-body">Nội dung email (định dạng text)</label>
                  <textarea
                    id="template-body"
                    ref={textBodyRef}
                    className="et-textarea"
                    value={form.textBody}
                    onChange={(e) => setForm((prev) => ({ ...prev, textBody: e.target.value }))}
                    placeholder={'Xin chào {{CUSTOMER_NAME}},\n\nNội dung email...\n\n{{TICKET_CODE}}'}
                  />
                  <p className="et-hint">
                    Mỗi đoạn cách nhau một dòng trống. Dòng chỉ chứa biến (vd: {'{{OTP_CODE}}'}) sẽ hiển thị nổi bật trong email.
                    Dòng URL/biến liên kết sẽ tạo nút bấm tự động.
                  </p>
                  <div className="et-vars">
                    {variableList.map((varName) => (
                      <button
                        key={varName}
                        type="button"
                        className="et-var-chip"
                        onClick={() => insertVariable(varName)}
                      >
                        {`{{${varName}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {showPreview && (
                  <div className="et-preview">
                    <p className="et-label mb-2">Xem trước (dữ liệu mẫu)</p>
                    <div className="et-preview__subject">{previewSubject || '—'}</div>
                    <div className="et-preview__body">{previewBody || '—'}</div>
                  </div>
                )}

                <label className="et-toggle">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Kích hoạt mẫu này khi gửi email
                </label>

                <div className="flex gap-2 pt-2">
                  <PrimaryButton type="button" onClick={handleSave} loading={isSaving} disabled={isSaving}>
                    Lưu cấu hình
                  </PrimaryButton>
                  <GhostButton type="button" onClick={cancelEdit} disabled={isSaving}>
                    Hủy
                  </GhostButton>
                  {editingId !== 'new' && SYSTEM_TEMPLATE_CODES.includes(resolvedCode) && (
                    <GhostButton
                      type="button"
                      onClick={() => applyPreset(resolvedCode)}
                      disabled={isSaving}
                    >
                      Khôi phục mặc định
                    </GhostButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPage>
  );
};

export default EmailTemplatesPage;
