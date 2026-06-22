import React, { useState } from 'react';
import { adminUserService } from '../../api/adminUserService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const emptyStaffForm = {
  email: '',
  fullName: '',
  password: '',
};

const emptyCustomerForm = {
  email: '',
  fullName: '',
};

const AdminUserFormPanel = ({ mode = 'STAFF', onSuccess, onCancel }) => {
  const isStaff = mode === 'STAFF';
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(isStaff ? emptyStaffForm : emptyCustomerForm);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.fullName.trim()) {
      notificationService.error('Vui lòng điền email và tên tài khoản');
      return;
    }
    if (isStaff && !form.password.trim()) {
      notificationService.error('Vui lòng nhập mật khẩu cho nhân viên');
      return;
    }
    if (isStaff && form.password.length < 8) {
      notificationService.error('Mật khẩu nhân viên phải có ít nhất 8 ký tự');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        roleName: mode,
      };
      if (isStaff) {
        payload.password = form.password;
      }

      const result = await adminUserService.createUser(payload);
      notificationService.success(result?.message || 'Tạo tài khoản thành công');
      onSuccess?.(result);
    } catch (err) {
      notificationService.error(err.message || 'Không thể tạo tài khoản');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-500">
        {isStaff
          ? 'Tạo tài khoản nhân viên mới — đăng nhập bằng email, có thể sử dụng ngay sau khi tạo.'
          : 'Tạo tài khoản khách hàng — đăng nhập bằng email. Hệ thống gửi mật khẩu ngẫu nhiên và link kích hoạt qua email.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Email *</label>
          <input
            type="email"
            className={adminInputClass}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Tên tài khoản (họ tên) *</label>
          <input
            className={adminInputClass}
            value={form.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Nguyễn Văn A"
            required
          />
        </div>
        {isStaff && (
          <div className="sm:col-span-2">
            <label className={adminLabelClass}>Mật khẩu *</label>
            <input
              type="password"
              className={adminInputClass}
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              required
            />
          </div>
        )}
      </div>

      {!isStaff && (
        <p className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          Mật khẩu sẽ được hệ thống tạo ngẫu nhiên và gửi kèm trong email kích hoạt. Khách hàng cần bấm link để đặt mật khẩu mới.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
          {isStaff ? 'Tạo nhân viên' : 'Tạo & gửi email'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default AdminUserFormPanel;
