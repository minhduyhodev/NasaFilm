import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Loader2, Lock, Pencil, QrCode, ScanLine, X } from 'lucide-react';
import QRCode from 'qrcode';
import { AdminPage, AdminModal, PageHeader, PrimaryButton, StatusBadge, AdminTableShell, AdminDatePicker, AdminDateTimePicker } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import {
  APPROVAL_STATUS_META,
  ATTENDANCE_STATUS_META,
  formatClock,
  formatDate,
  formatMinutes,
  monthRangeIso,
  statusBadge,
  statusVariant,
} from './hrUtils';
import './hr.css';

const now = new Date();
const DEFAULT_RANGE = monthRangeIso(now.getFullYear(), now.getMonth() + 1);

// Hiển thị/nhập giờ chấm công luôn theo múi giờ nghiệp vụ (VN, +07:00) bất kể máy admin đang ở đâu.
const VN_OFFSET_MS = 7 * 60 * 60000;

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Cộng offset VN rồi đọc theo UTC -> ra "giờ treo tường" VN cho input datetime-local.
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  // Chuỗi từ input là giờ VN -> gắn offset +07:00 để ra đúng mốc tuyệt đối.
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái duyệt' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const HrAttendancePage = () => {
  const [from, setFrom] = useState(DEFAULT_RANGE.from);
  const [to, setTo] = useState(DEFAULT_RANGE.to);
  const [userFilter, setUserFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const confirm = useConfirm();

  const loadStaff = useCallback(async () => {
    try {
      const data = await hrService.getStaffDirectory();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      setStaff([]);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.searchAttendance({
        from,
        to,
        userId: userFilter || undefined,
        approvalStatus: approvalFilter || undefined,
      });
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải chấm công.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, userFilter, approvalFilter]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleApprove = async (rec) => {
    const ok = await confirm({
      title: 'Duyệt chấm công',
      message: 'Sau khi duyệt, bản ghi sẽ được khóa (không thể sửa/đổi trạng thái) và được dùng để tính lương. Tiếp tục?',
      highlight: `${rec.fullName || rec.email} · ${rec.shiftName} · ${formatDate(rec.workDate)}`,
      confirmLabel: 'Duyệt',
      variant: 'warning',
    });
    if (!ok) return;
    setActionId(rec.uuid);
    try {
      await hrService.approveAttendance(rec.uuid);
      notificationService.success('Đã duyệt chấm công.');
      await loadRecords();
    } catch (err) {
      notificationService.error(err?.message || 'Duyệt thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (rec) => {
    const ok = await confirm({
      title: 'Từ chối chấm công',
      message: 'Bản ghi sẽ bị đánh dấu từ chối và không được tính lương (OT duyệt về 0). Tiếp tục?',
      highlight: `${rec.fullName || rec.email} · ${rec.shiftName} · ${formatDate(rec.workDate)}`,
      confirmLabel: 'Từ chối',
      variant: 'danger',
    });
    if (!ok) return;
    setActionId(rec.uuid);
    try {
      await hrService.rejectAttendance(rec.uuid);
      notificationService.success('Đã từ chối chấm công.');
      await loadRecords();
    } catch (err) {
      notificationService.error(err?.message || 'Từ chối thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingCount = records.filter(
      (r) => r.approvalStatus === 'PENDING' && r.checkOutAt,
    ).length;
    if (pendingCount === 0) {
      notificationService.info('Không có chấm công chờ duyệt (đã check-out) trong khoảng đang xem.');
      return;
    }
    const ok = await confirm({
      title: 'Duyệt chấm công hàng loạt',
      message: 'Duyệt toàn bộ chấm công đang CHỜ DUYỆT (đã check-out) trong khoảng ngày đang xem. Sau khi duyệt sẽ bị khóa và dùng để tính lương.',
      highlight: `${formatDate(from)} → ${formatDate(to)} · khoảng ${pendingCount} bản ghi`,
      detail: 'Bản ghi chưa check-out sẽ được bỏ qua. Hành động này không thể hoàn tác.',
      confirmLabel: 'Duyệt hàng loạt',
      variant: 'warning',
    });
    if (!ok) return;
    setBulkApproving(true);
    try {
      const res = await hrService.bulkApproveAttendance(from, to);
      notificationService.success(`Đã duyệt ${res?.approved ?? 0} chấm công.`);
      await loadRecords();
    } catch (err) {
      notificationService.error(err?.message || 'Duyệt hàng loạt thất bại.');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleScanAbsent = async () => {
    const ok = await confirm({
      title: 'Quét ca vắng',
      message: 'Hệ thống sẽ đánh dấu VẮNG cho tất cả ca đã qua mà nhân viên không check-in. Tiếp tục?',
      detail: 'Các bản ghi vắng được duyệt tự động và tính 0 công.',
      confirmLabel: 'Quét ca vắng',
      variant: 'warning',
    });
    if (!ok) return;
    setScanning(true);
    try {
      const res = await hrService.scanAbsent();
      notificationService.success(`Đã đánh dấu vắng ${res?.created ?? 0} ca.`);
      await loadRecords();
    } catch (err) {
      notificationService.error(err?.message || 'Quét vắng thất bại.');
    } finally {
      setScanning(false);
    }
  };

  const staffOptions = [
    { value: '', label: 'Tất cả nhân viên' },
    ...staff.map((s) => ({ value: s.userId, label: s.fullName || s.email })),
  ];

  const summary = useMemo(() => {
    const pending = records.filter((r) => r.approvalStatus === 'PENDING').length;
    const otPending = records.reduce(
      (sum, r) => sum + Math.max(0, (r.otMinutes || 0) - (r.otMinutesApproved || 0)),
      0,
    );
    return { pending, otPending };
  }, [records]);

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Duyệt chấm công"
        description="Xem, chỉnh sửa và duyệt bản ghi chấm công. Chỉ công đã duyệt mới được tính lương."
        variant="default"
        primaryAction={{
          label: 'Mã điểm danh QR',
          onClick: () => setCheckpointOpen(true),
          icon: <QrCode className="h-4 w-4" />,
        }}
        secondaryActions={[
          {
            label: bulkApproving ? 'Đang duyệt...' : 'Duyệt hàng loạt',
            onClick: handleBulkApprove,
            disabled: bulkApproving,
            icon: <CheckCheck className={`h-4 w-4 ${bulkApproving ? 'animate-pulse' : ''}`} />,
          },
          {
            label: scanning ? 'Đang quét...' : 'Quét ca vắng',
            onClick: handleScanAbsent,
            disabled: scanning,
            icon: <ScanLine className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      <div className="hr-filters">
        <div className="hr-field" style={{ minWidth: 170 }}>
          <AdminDatePicker label="Từ ngày" value={from} onChange={setFrom} size="sm" max={to || undefined} />
        </div>
        <div className="hr-field" style={{ minWidth: 170 }}>
          <AdminDatePicker label="Đến ngày" value={to} onChange={setTo} size="sm" min={from || undefined} />
        </div>
        <div className="hr-field" style={{ minWidth: 200 }}>
          <AdminSelectDropdown label="Nhân viên" value={userFilter} options={staffOptions} onChange={setUserFilter} size="sm" />
        </div>
        <div className="hr-field" style={{ minWidth: 200 }}>
          <AdminSelectDropdown label="Trạng thái duyệt" value={approvalFilter} options={STATUS_OPTIONS} onChange={setApprovalFilter} size="sm" />
        </div>
      </div>

      <div className="hr-inline" style={{ marginBottom: 14 }}>
        <StatusBadge variant="warning">{summary.pending} chờ duyệt</StatusBadge>
        <StatusBadge variant="info">OT chưa duyệt: {formatMinutes(summary.otPending)}</StatusBadge>
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="hr-state">
          <ScanLine className="h-9 w-9 text-slate-500" />
          <p>Không có bản ghi chấm công phù hợp bộ lọc.</p>
        </div>
      ) : (
        <AdminTableShell>
          <table className="adm-table hr-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Ngày</th>
                <th>Ca</th>
                <th>Vào</th>
                <th>Ra</th>
                <th>Giờ công</th>
                <th>OT (duyệt/tổng)</th>
                <th>Muộn</th>
                <th>Về sớm</th>
                <th>Trạng thái</th>
                <th>Duyệt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const busy = actionId === r.uuid;
                return (
                  <tr key={r.uuid}>
                    <td>
                      <div className="hr-strong">{r.fullName || '—'}</div>
                      <div className="hr-muted" style={{ fontSize: 11 }}>{r.email}</div>
                    </td>
                    <td className="hr-num">{formatDate(r.workDate)}</td>
                    <td>{r.shiftName}</td>
                    <td className="hr-num">{formatClock(r.checkInAt)}</td>
                    <td className="hr-num">{formatClock(r.checkOutAt)}</td>
                    <td className="hr-num">{formatMinutes(r.regularMinutes)}</td>
                    <td className="hr-num">
                      {formatMinutes(r.otMinutesApproved)} / {formatMinutes(r.otMinutes)}
                    </td>
                    <td className="hr-num">{r.lateMinutes > 0 ? formatMinutes(r.lateMinutes) : '—'}</td>
                    <td className="hr-num">{r.earlyLeaveMinutes > 0 ? formatMinutes(r.earlyLeaveMinutes) : '—'}</td>
                    <td>
                      <StatusBadge variant={statusVariant(ATTENDANCE_STATUS_META, r.attendanceStatus)}>
                        {statusBadge(ATTENDANCE_STATUS_META, r.attendanceStatus).label}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge variant={statusVariant(APPROVAL_STATUS_META, r.approvalStatus)}>
                        {statusBadge(APPROVAL_STATUS_META, r.approvalStatus).label}
                      </StatusBadge>
                    </td>
                    <td>
                      {r.approvalStatus === 'APPROVED' ? (
                        <div className="hr-row-actions">
                          <span
                            className="hr-lock-note"
                            title="Chấm công đã duyệt — không thể chỉnh sửa hoặc thay đổi"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Đã khóa
                          </span>
                        </div>
                      ) : (
                        <div className="hr-row-actions">
                          <button
                            type="button"
                            className="cursor-pointer"
                            style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 4 }}
                            title="Chỉnh sửa"
                            onClick={() => setEditing(r)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer"
                            style={{ background: 'none', border: 'none', color: '#34d399', padding: 4 }}
                            title="Duyệt"
                            disabled={busy}
                            onClick={() => handleApprove(r)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          {r.approvalStatus !== 'REJECTED' && (
                            <button
                              type="button"
                              className="cursor-pointer"
                              style={{ background: 'none', border: 'none', color: '#f87171', padding: 4 }}
                              title="Từ chối"
                              disabled={busy}
                              onClick={() => handleReject(r)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableShell>
      )}

      {editing && (
        <EditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadRecords();
          }}
        />
      )}

      {checkpointOpen && <CheckpointCodeModal onClose={() => setCheckpointOpen(false)} />}
    </AdminPage>
  );
};

function CheckpointCodeModal({ onClose }) {
  const [data, setData] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const periodRef = useRef(60);

  const fetchCode = useCallback(async () => {
    try {
      const res = await hrService.getCheckpointCode();
      setData(res);
      setRemaining(res?.validForSeconds ?? 0);
      periodRef.current = res?.periodSeconds || 60;
      setError('');
      if (res?.qrContent) {
        const url = await QRCode.toDataURL(String(res.qrContent), {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0b1020', light: '#ffffff' },
        });
        setQrUrl(url);
      }
    } catch (err) {
      setError(err?.message || 'Không tải được mã điểm danh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          fetchCode();
          return periodRef.current;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchCode]);

  const code = data?.code || '';
  const prettyCode = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  const pct = periodRef.current > 0 ? Math.round((remaining / periodRef.current) * 100) : 0;

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Mã điểm danh QR"
      subtitle="Hiển thị màn hình này tại quầy. Nhân viên quét mã để check-in / check-out."
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-medium"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tạo mã...</p>
        </div>
      ) : error ? (
        <div className="hr-state">
          <QrCode className="h-9 w-9 text-slate-500" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="hr-checkpoint">
          {qrUrl && <img src={qrUrl} alt="Mã QR điểm danh" className="hr-checkpoint__qr" />}
          <div className="hr-checkpoint__code">{prettyCode}</div>
          <div className="hr-checkpoint__bar">
            <span className="hr-checkpoint__bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="hr-muted" style={{ fontSize: 12, textAlign: 'center' }}>
            Mã tự đổi sau <span className="hr-strong">{remaining}s</span>. Nhân viên có thể quét QR hoặc
            nhập mã 6 số này khi chấm công.
          </p>
        </div>
      )}
    </AdminModal>
  );
}

function EditModal({ record, onClose, onSaved }) {
  const [checkIn, setCheckIn] = useState(toDatetimeLocal(record.checkInAt));
  const [checkOut, setCheckOut] = useState(toDatetimeLocal(record.checkOutAt));
  const [otApproved, setOtApproved] = useState(String(record.otMinutesApproved ?? 0));
  const [note, setNote] = useState(record.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await hrService.updateAttendance(record.uuid, {
        checkInAt: fromDatetimeLocal(checkIn),
        checkOutAt: fromDatetimeLocal(checkOut),
        otMinutesApproved: Number(otApproved) || 0,
        note: note.trim() || null,
      });
      notificationService.success('Đã cập nhật chấm công.');
      await onSaved();
    } catch (err) {
      notificationService.error(err?.message || 'Cập nhật thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Chỉnh sửa chấm công"
      subtitle={`${record.fullName || record.email} · ${record.shiftName} · ${formatDate(record.workDate)}`}
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-medium"
            onClick={onClose}
          >
            Hủy
          </button>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Lưu</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <AdminDateTimePicker
          label="Giờ vào"
          value={checkIn}
          onChange={setCheckIn}
          size="sm"
        />
        <AdminDateTimePicker
          label="Giờ ra"
          value={checkOut}
          onChange={setCheckOut}
          size="sm"
        />
        <div className="hr-field">
          <label className="hr-field__label">Số phút OT được duyệt</label>
          <input
            type="number"
            min="0"
            className={adminInputClass}
            value={otApproved}
            onChange={(e) => setOtApproved(e.target.value)}
          />
          <span className="hr-muted" style={{ fontSize: 11 }}>
            OT hệ thống tính: {formatMinutes(record.otMinutes)}
          </span>
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Ghi chú</label>
          <textarea className={adminTextareaClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </AdminModal>
  );
}

export default HrAttendancePage;
