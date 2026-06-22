import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Plus, Pencil, Trash2 } from 'lucide-react';
import { adminEmailTemplateService } from '../api/adminEmailTemplateService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';

const TEMPLATE_VARIABLES = {
  VOD_TICKET: ['{{TICKET_CODE}}', '{{MOVIE_TITLE}}', '{{CUSTOMER_NAME}}', '{{ACTIVATION_URL}}', '{{BOOKING_UUID}}'],
  THEATER_TICKET: [
    '{{TICKET_CODE}}',
    '{{TICKET_CODES}}',
    '{{MOVIE_TITLE}}',
    '{{CUSTOMER_NAME}}',
    '{{CINEMA_NAME}}',
    '{{SHOWTIME}}',
    '{{SEATS}}',
    '{{COMBOS}}',
    '{{TOTAL_PRICE}}',
    '{{BOOKING_UUID}}',
    '{{PROFILE_URL}}',
  ],
  OTP_REGISTER: ['{{OTP_CODE}}'],
  PASSWORD_RESET: ['{{RESET_LINK}}'],
};

const emptyForm = {
  code: '',
  name: '',
  purpose: '',
  subject: '',
  htmlBody: '',
  active: true,
};

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const EmailTemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

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

  const startCreate = () => {
    setEditingId('new');
    setForm(emptyForm);
  };

  const startEdit = (template) => {
    setEditingId(template.id);
    setForm({
      code: template.code || '',
      name: template.name || '',
      purpose: template.purpose || '',
      subject: template.subject || '',
      htmlBody: template.htmlBody || '',
      active: template.active !== false,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      notificationService.error('Vui lòng điền đầy đủ mã, tên, tiêu đề và nội dung HTML');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        purpose: form.purpose.trim(),
        subject: form.subject.trim(),
        htmlBody: form.htmlBody,
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
    if (!window.confirm(`Xóa mẫu email "${code}"?`)) return;
    try {
      await adminEmailTemplateService.deleteTemplate(id);
      notificationService.success('Đã xóa mẫu email');
      if (editingId === id) cancelEdit();
      await loadTemplates();
    } catch (error) {
      notificationService.error(error?.message || 'Không thể xóa mẫu email');
    }
  };

  const variableHints = TEMPLATE_VARIABLES[form.code?.toUpperCase()] || ['{{CUSTOM_FIELD}}'];

  return (
    <AdminPage>
      <PageHeader
        title="Mẫu email HTML"
        description="Quản lý nội dung email theo mục đích: vé rạp, VOD, OTP, đặt lại mật khẩu và các mẫu tùy chỉnh."
        primaryAction={{
          label: 'Thêm mẫu',
          onClick: startCreate,
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5">
          <Section title="Danh sách mẫu" divided>
            {isLoading ? (
              <div className="flex justify-center py-10 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Chưa có mẫu email.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`rounded-lg border px-4 py-3 flex items-start justify-between gap-3 ${
                      editingId === template.id
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-sm font-semibold text-white truncate">{template.name}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 font-mono">{template.code}</p>
                      {template.purpose && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.purpose}</p>
                      )}
                      <span
                        className={`inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          template.active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {template.active ? 'Đang dùng' : 'Tắt'}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <GhostButton type="button" onClick={() => startEdit(template)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </GhostButton>
                      <GhostButton type="button" onClick={() => handleDelete(template.id, template.code)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </GhostButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="xl:col-span-7">
          <Section
            title={editingId ? (editingId === 'new' ? 'Tạo mẫu mới' : 'Chỉnh sửa mẫu') : 'Biểu mẫu'}
            divided
          >
            {!editingId ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Chọn một mẫu để chỉnh sửa hoặc bấm &quot;Thêm mẫu&quot;.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Mã mẫu</label>
                    <input
                      className={inputClass}
                      value={form.code}
                      onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="VOD_TICKET"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tên hiển thị</label>
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Vé xem phim online"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Mục đích sử dụng</label>
                  <input
                    className={inputClass}
                    value={form.purpose}
                    onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Gửi mã vé sau khi mua xem online"
                  />
                </div>

                <div>
                  <label className={labelClass}>Tiêu đề email</label>
                  <input
                    className={inputClass}
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="NASA FILM - Mã vé xem phim online {{MOVIE_TITLE}}"
                  />
                </div>

                <div>
                  <label className={labelClass}>Nội dung HTML</label>
                  <textarea
                    className={`${inputClass} min-h-[320px] font-mono text-xs leading-5`}
                    value={form.htmlBody}
                    onChange={(e) => setForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
                    placeholder="<!DOCTYPE html>..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Biến gợi ý: {variableHints.join(', ')}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Kích hoạt mẫu này
                </label>

                <div className="flex gap-2 pt-2">
                  <PrimaryButton type="button" onClick={handleSave} loading={isSaving} disabled={isSaving}>
                    Lưu mẫu
                  </PrimaryButton>
                  <GhostButton type="button" onClick={cancelEdit} disabled={isSaving}>
                    Hủy
                  </GhostButton>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default EmailTemplatesPage;
