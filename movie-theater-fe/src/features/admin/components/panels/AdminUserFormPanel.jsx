import { useEffect, useMemo, useState } from 'react';
import { adminUserService } from '../../api/adminUserService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const emptyStaffForm = {
  email: '',
  fullName: '',
  staffPreset: '',
  permissions: [],
};

const emptyCustomerForm = {
  email: '',
  fullName: '',
};

const STAFF_PRESETS = [
  {
    value: 'COUNTER',
    label: 'Nhân viên quầy vé',
    permissions: ['COUNTER_BOOKING_CREATE', 'COUNTER_COMBO_CREATE', 'COUNTER_VOUCHER_APPLY', 'COUNTER_CUSTOMER_CREATE'],
  },
  { value: 'GATE', label: 'Nhân viên soát vé', permissions: ['TICKET_CHECKIN'] },
  { value: 'CONTENT', label: 'Quản lý nội dung', permissions: ['MOVIE_WRITE', 'SHOWTIME_WRITE', 'COMBO_WRITE', 'PROMOTION_WRITE'] },
  { value: 'GENERAL', label: 'Full quyền Staff', permissions: null },
];

const AdminUserFormPanel = ({ mode = 'STAFF', initialPermissions, onSuccess, onCancel }) => {
  const confirm = useConfirm();
  const isStaff = mode === 'STAFF';
  const [isSaving, setIsSaving] = useState(false);
  const [availablePermissions, setAvailablePermissions] = useState(initialPermissions || []);
  const [form, setForm] = useState(isStaff ? emptyStaffForm : emptyCustomerForm);

  useEffect(() => {
    if (!isStaff || initialPermissions?.length) return;
    adminUserService.getPermissions()
      .then((data) => setAvailablePermissions(Array.isArray(data) ? data : []))
      .catch(() => setAvailablePermissions([]));
  }, [initialPermissions, isStaff]);

  const permissionGroups = useMemo(() => {
    return availablePermissions.reduce((acc, permission) => {
      const group = permission.group || 'Khác';
      if (!acc[group]) acc[group] = [];
      acc[group].push(permission);
      return acc;
    }, {});
  }, [availablePermissions]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePermission = (permissionName) => {
    setForm((prev) => {
      const current = new Set(prev.permissions || []);
      if (current.has(permissionName)) current.delete(permissionName);
      else current.add(permissionName);
      return { ...prev, permissions: Array.from(current), staffPreset: '' };
    });
  };

  const handlePresetChange = (presetValue) => {
    const preset = STAFF_PRESETS.find((item) => item.value === presetValue);
    const presetPermissions = preset?.permissions ?? availablePermissions.map((permission) => permission.name);
    setForm((prev) => ({
      ...prev,
      staffPreset: presetValue,
      permissions: presetPermissions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.fullName.trim()) {
      notificationService.error('Vui lòng điền email và tên tài khoản');
      return;
    }

    const ok = await confirm({
      title: 'Tạo tài khoản',
      message: isStaff
        ? 'Tạo tài khoản nhân viên mới với quyền đã chọn?'
        : 'Tạo tài khoản khách hàng? Hệ thống sẽ gửi thông tin kích hoạt qua email.',
      highlight: `${form.fullName.trim()} · ${form.email.trim()}`,
      confirmLabel: 'Tạo tài khoản',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSaving(true);
    try {
      const payload = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        roleName: mode,
      };
      if (isStaff) {
        payload.staffPreset = form.staffPreset || null;
        payload.permissions = form.permissions || [];
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
          ? 'Tạo tài khoản nhân viên mới — chọn preset và quyền chi tiết để điều khiển chức năng nhân viên được dùng.'
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
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2">
              <span className="text-blue-400 mt-0.5">🔐</span>
              <p className="text-xs text-blue-300/80">
                Mật khẩu sẽ được <strong className="text-blue-300">tạo tự động</strong> và gửi kèm trong email kích hoạt. Nhân viên cần nhấn link để đặt mật khẩu mới.
              </p>
            </div>
          </div>
        )}
      </div>

      {isStaff && (
        <div className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div>
            <label className={adminLabelClass}>Chức vụ / Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STAFF_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetChange(preset.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${form.staffPreset === preset.value ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-black/20 text-gray-300 hover:border-white/20'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={adminLabelClass}>Phân quyền chi tiết</label>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {Object.entries(permissionGroups).map(([group, permissions]) => (
                <div key={group}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.name} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300 cursor-pointer hover:border-white/20">
                        <input
                          type="checkbox"
                          checked={(form.permissions || []).includes(permission.name)}
                          onChange={() => togglePermission(permission.name)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-bold text-white">{permission.description}</span>
                          <span className="block text-[10px] font-mono text-gray-500">{permission.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
