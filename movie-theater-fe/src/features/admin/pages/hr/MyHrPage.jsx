import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  Timer,
  Wallet,
} from 'lucide-react';
import { AdminPage, AdminKpiGrid, AdminModal, PageHeader, PrimaryButton } from '../../components';
import { hrService } from '../../api/hrService';
import { userNotificationApi } from '../../../../shared/services/userNotificationApi';
import { notificationService } from '../../../../shared/services/notificationService';
import StaffQrScanner, { canUseQrScanner } from '../../../../shared/components/qr/StaffQrScanner';
import { adminInputClass } from '../../components/adminFormStyles';
import {
  APPROVAL_STATUS_META,
  ATTENDANCE_STATUS_META,
  PAYSLIP_STATUS_META,
  SHIFT_CATEGORY_META,
  SHIFT_CATEGORY_ORDER,
  addDaysIso,
  categorizeShift,
  formatClock,
  formatDate,
  formatMinutes,
  formatMoney,
  formatTime,
  monthRangeIso,
  shiftCheckInState,
  statusBadge,
  todayIso,
  weekdayLabel,
} from './hrUtils';
import './hr.css';

const TABS = [
  { id: 'shifts', label: 'Ca làm của tôi' },
  { id: 'attendance', label: 'Lịch sử chấm công' },
  { id: 'payslips', label: 'Phiếu lương' },
];

const now = new Date();
const CURRENT_MONTH_RANGE = monthRangeIso(now.getFullYear(), now.getMonth() + 1);

// Các loại thông báo HR sinh ra từ backend.
const HR_NOTIF_TYPES = new Set(['shift_assigned', 'shift_reminder', 'payslip_ready']);
const NOTIF_ICON = {
  shift_assigned: CalendarPlus,
  shift_reminder: CalendarClock,
  payslip_ready: Wallet,
};

const MyHrPage = () => {
  const [tab, setTab] = useState('shifts');
  const [overview, setOverview] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);

  const shiftRange = useMemo(
    () => ({ from: addDaysIso(todayIso(), -7), to: addDaysIso(todayIso(), 21) }),
    [],
  );

  const loadOverview = useCallback(async () => {
    try {
      const data = await hrService.getMyOverview();
      setOverview(data);
    } catch {
      setOverview(null);
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const data = await userNotificationApi.list();
      const list = Array.isArray(data) ? data : [];
      setNotifs(list.filter((n) => HR_NOTIF_TYPES.has(n.type)).slice(0, 6));
    } catch {
      setNotifs([]);
    }
  }, []);

  const handleMarkRead = useCallback(async () => {
    setMarkingRead(true);
    try {
      await userNotificationApi.markAllRead();
      await loadNotifs();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể đánh dấu đã đọc.');
    } finally {
      setMarkingRead(false);
    }
  }, [loadNotifs]);

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'shifts') {
        const data = await hrService.getMyShifts(shiftRange);
        setShifts(Array.isArray(data) ? data : []);
      } else if (tab === 'attendance') {
        const data = await hrService.getMyAttendance(CURRENT_MONTH_RANGE);
        setAttendance(Array.isArray(data) ? data : []);
      } else if (tab === 'payslips') {
        const data = await hrService.getMyPayslips();
        setPayslips(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [tab, shiftRange]);

  useEffect(() => {
    loadOverview();
    loadNotifs();
  }, [loadOverview, loadNotifs]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const openCheckpoint = (shift, action) => setCheckpoint({ shift, action });

  // Được gọi từ modal sau khi nhân viên quét/nhập mã điểm danh.
  const confirmCheckpoint = async (code) => {
    if (!checkpoint) return;
    const { shift, action } = checkpoint;
    if (action === 'in') {
      await hrService.checkIn(shift.uuid, code);
    } else {
      await hrService.checkOut(shift.uuid, code);
    }
    notificationService.success(action === 'in' ? 'Check-in thành công.' : 'Check-out thành công.');
    await Promise.all([loadTab(), loadOverview()]);
    setCheckpoint(null);
  };

  const kpis = overview
    ? [
        {
          label: 'Ca sắp tới',
          value: overview.upcomingShiftCount ?? 0,
          icon: CalendarClock,
          color: 'text-sky-400',
          badge: 'Trong 3 tuần tới',
        },
        {
          label: 'Giờ công tháng này',
          value: `${formatMinutes(overview.monthRegularMinutes)}`,
          icon: Clock,
          color: 'text-emerald-400',
          badge: `${overview.monthShiftCount ?? 0} ca đã làm`,
        },
        {
          label: 'Giờ OT tháng này',
          value: formatMinutes(overview.monthOtMinutes),
          icon: Timer,
          color: 'text-amber-400',
          badge: `${overview.monthPendingCount ?? 0} chờ duyệt`,
        },
        {
          label: 'Lương kỳ gần nhất',
          value: formatMoney(overview.latestNetPay),
          icon: Wallet,
          color: 'text-violet-400',
          badge: overview.latestPayslipLabel || 'Chưa có',
        },
      ]
    : [];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Bảng công của tôi"
        description="Xem lịch ca được phân, check-in / check-out và tra cứu phiếu lương của bạn."
        variant="default"
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: () => {
              loadTab();
              loadOverview();
              loadNotifs();
            },
            disabled: loading,
            icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      {kpis.length > 0 && <AdminKpiGrid items={kpis} columns={4} className="mb-6" />}

      {notifs.length > 0 && (
        <NotificationPanel notifs={notifs} onMarkRead={handleMarkRead} marking={markingRead} />
      )}

      {overview?.activeShift && (
        <div className="hr-card mb-6" style={{ borderColor: 'rgba(239,68,68,0.35)' }}>
          <div className="hr-shift-card__head">
            <div>
              <p className="hr-card__title">Ca đang diễn ra</p>
              <p className="hr-strong" style={{ fontSize: 15 }}>
                {overview.activeShift.shiftName} · {formatTime(overview.activeShift.startTime)}–
                {formatTime(overview.activeShift.endTime)}
              </p>
              <p className="hr-muted" style={{ fontSize: 12 }}>
                {overview.activeShift.checkInAt
                  ? `Vào lúc ${formatClock(overview.activeShift.checkInAt)}`
                  : 'Chưa check-in'}
              </p>
            </div>
            {overview.activeShift.checkInAt ? (
              <button
                type="button"
                className="adm-btn adm-btn--primary px-3.5 py-2 inline-flex items-center gap-2 rounded-md text-sm font-medium border-none cursor-pointer"
                onClick={() => openCheckpoint(overview.activeShift, 'out')}
              >
                <LogOut className="w-4 h-4" />
                Check-out ngay
              </button>
            ) : (
              <button
                type="button"
                className="adm-btn adm-btn--primary px-3.5 py-2 inline-flex items-center gap-2 rounded-md text-sm font-medium border-none cursor-pointer"
                onClick={() => openCheckpoint(overview.activeShift, 'in')}
              >
                <LogIn className="w-4 h-4" />
                Check-in ngay
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hr-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hr-tab${tab === t.id ? ' hr-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải...</p>
        </div>
      ) : tab === 'shifts' ? (
        <ShiftList
          shifts={shifts}
          onCheckIn={(s) => openCheckpoint(s, 'in')}
          onCheckOut={(s) => openCheckpoint(s, 'out')}
        />
      ) : tab === 'attendance' ? (
        <AttendanceList attendance={attendance} />
      ) : (
        <PayslipList payslips={payslips} />
      )}

      {checkpoint && (
        <CheckpointActionModal
          action={checkpoint.action}
          shift={checkpoint.shift}
          onClose={() => setCheckpoint(null)}
          onConfirm={confirmCheckpoint}
        />
      )}
    </AdminPage>
  );
};

function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(value);
}

function NotificationPanel({ notifs, onMarkRead, marking }) {
  const unread = notifs.filter((n) => !n.read).length;
  return (
    <div className="hr-card mb-6">
      <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <p className="hr-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <BellRing className="h-4 w-4 text-sky-400" />
          Thông báo
          {unread > 0 && <span className="hr-badge hr-badge--info">{unread} mới</span>}
        </p>
        {unread > 0 && (
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3 py-1.5 rounded-md cursor-pointer text-xs font-semibold"
            onClick={onMarkRead}
            disabled={marking}
          >
            {marking ? 'Đang lưu...' : 'Đánh dấu đã đọc'}
          </button>
        )}
      </div>
      <ul className="hr-notif-list">
        {notifs.map((n) => {
          const Icon = NOTIF_ICON[n.type] || BellRing;
          return (
            <li key={n.uuid} className={`hr-notif${n.read ? '' : ' hr-notif--unread'}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <div className="hr-notif__body">
                <p className="hr-notif__title">{n.title}</p>
                {n.content && <p className="hr-notif__content">{n.content}</p>}
                <p className="hr-notif__time">{relativeTime(n.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShiftList({ shifts, onCheckIn, onCheckOut }) {
  const today = todayIso();

  const groups = useMemo(() => {
    return shifts.reduce((acc, s) => {
      (acc[s.workDate] = acc[s.workDate] || []).push(s);
      return acc;
    }, {});
  }, [shifts]);

  const dates = useMemo(() => Object.keys(groups).sort(), [groups]);

  // Ngày ưu tiên mở sẵn: hôm nay -> ngày gần nhất sắp tới -> ngày gần nhất đã qua.
  const primaryDate = useMemo(() => {
    if (dates.length === 0) return null;
    if (dates.includes(today)) return today;
    const upcoming = dates.find((d) => d >= today);
    return upcoming || dates[dates.length - 1];
  }, [dates, today]);

  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    setExpanded(new Set(primaryDate ? [primaryDate] : []));
  }, [primaryDate]);

  if (shifts.length === 0) {
    return (
      <div className="hr-state">
        <CalendarClock className="h-9 w-9 text-slate-500" />
        <p>Bạn chưa được phân ca nào trong khoảng thời gian này.</p>
      </div>
    );
  }

  const toggle = (date) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <div className="hr-day-list">
      {dates.map((date) => {
        const dayShifts = groups[date];
        const isOpen = expanded.has(date);
        const counts = dayShifts.reduce((acc, s) => {
          const key = categorizeShift(s);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        const needsAction = (counts.open || 0) > 0 || (counts.inProgress || 0) > 0;
        const isPast = date < today;
        return (
          <div
            key={date}
            className={`hr-day${isOpen ? ' hr-day--open' : ''}${needsAction ? ' hr-day--action' : ''}`}
          >
            <button
              type="button"
              className="hr-day__header"
              onClick={() => toggle(date)}
              aria-expanded={isOpen}
            >
              <span className="hr-day__title">
                <ChevronRight className={`hr-day__chevron${isOpen ? ' is-open' : ''}`} />
                <span className="hr-strong">{formatDate(date)}</span>
                <span className="hr-day__weekday">{weekdayLabel(date)}</span>
                {date === today && <span className="hr-badge hr-badge--info">Hôm nay</span>}
                {isPast && !isOpen && <span className="hr-badge">Đã qua</span>}
              </span>
              <span className="hr-day__summary">
                {SHIFT_CATEGORY_ORDER.filter((key) => counts[key]).map((key) => (
                  <span key={key} className="hr-day__chip" title={SHIFT_CATEGORY_META[key].label}>
                    <span
                      className="hr-day__dot"
                      style={{ background: SHIFT_CATEGORY_META[key].color }}
                    />
                    {counts[key]} {SHIFT_CATEGORY_META[key].label}
                  </span>
                ))}
                <span className="hr-day__count">{dayShifts.length} ca</span>
              </span>
            </button>

            {isOpen && (
              <div className="hr-day__body">
                {dayShifts.map((s) => (
                  <ShiftCard
                    key={s.uuid}
                    shift={s}
                    onCheckIn={onCheckIn}
                    onCheckOut={onCheckOut}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShiftCard({ shift, onCheckIn, onCheckOut }) {
  const cancelled = shift.status === 'CANCELLED';
  const hasCheckIn = Boolean(shift.checkInAt);
  const hasCheckOut = Boolean(shift.checkOutAt);
  const windowState = !hasCheckIn
    ? shiftCheckInState(shift.workDate, shift.startTime, shift.endTime)
    : 'OPEN';

  return (
    <div className="hr-shift-card">
      <div className="hr-shift-card__head">
        <div>
          <p className="hr-strong">{shift.shiftName}</p>
          <p className="hr-muted" style={{ fontSize: 12 }}>
            {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
          </p>
        </div>
        {cancelled ? (
          <span className="hr-badge hr-badge--danger">Đã hủy</span>
        ) : shift.attendanceStatus ? (
          <span className={statusBadge(ATTENDANCE_STATUS_META, shift.attendanceStatus).className}>
            {statusBadge(ATTENDANCE_STATUS_META, shift.attendanceStatus).label}
          </span>
        ) : windowState === 'MISSED' ? (
          <span className="hr-badge hr-badge--danger">Đã lỡ ca</span>
        ) : windowState === 'UPCOMING' ? (
          <span className="hr-badge hr-badge--info">Chưa tới giờ</span>
        ) : (
          <span className="hr-badge hr-badge--warning">Chờ vào ca</span>
        )}
      </div>

      {(hasCheckIn || hasCheckOut) && (
        <div className="hr-inline" style={{ fontSize: 12 }}>
          <span className="hr-muted">Vào: {formatClock(shift.checkInAt)}</span>
          <span className="hr-muted">Ra: {formatClock(shift.checkOutAt)}</span>
        </div>
      )}

      {!cancelled && (
        <div className="hr-row-actions">
          {!hasCheckIn && windowState === 'OPEN' && (
            <button
              type="button"
              className="adm-btn adm-btn--primary px-3 py-1.5 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold border-none cursor-pointer"
              onClick={() => onCheckIn(shift)}
            >
              <LogIn className="w-3.5 h-3.5" />
              Check-in
            </button>
          )}
          {!hasCheckIn && windowState === 'UPCOMING' && (
            <span className="hr-muted" style={{ fontSize: 11 }}>
              Mở check-in trước giờ vào ca 60 phút
            </span>
          )}
          {!hasCheckIn && windowState === 'MISSED' && (
            <span className="hr-muted" style={{ fontSize: 11 }}>
              Đã quá giờ check-in
            </span>
          )}
          {hasCheckIn && !hasCheckOut && (
            <button
              type="button"
              className="adm-btn adm-btn--ghost px-3 py-1.5 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold cursor-pointer"
              onClick={() => onCheckOut(shift)}
            >
              <LogOut className="w-3.5 h-3.5" />
              Check-out
            </button>
          )}
          {hasCheckOut && <span className="hr-badge hr-badge--success">Hoàn tất</span>}
        </div>
      )}
    </div>
  );
}

function AttendanceList({ attendance }) {
  if (attendance.length === 0) {
    return (
      <div className="hr-state">
        <Clock className="h-9 w-9 text-slate-500" />
        <p>Chưa có bản ghi chấm công trong tháng này.</p>
      </div>
    );
  }
  return (
    <div className="hr-table-wrap">
      <table className="hr-table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Ca</th>
            <th>Vào</th>
            <th>Ra</th>
            <th>Giờ công</th>
            <th>OT</th>
            <th>Trạng thái</th>
            <th>Duyệt</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((a) => (
            <tr key={a.uuid}>
              <td className="hr-num">{formatDate(a.workDate)}</td>
              <td>{a.shiftName}</td>
              <td className="hr-num">{formatClock(a.checkInAt)}</td>
              <td className="hr-num">{formatClock(a.checkOutAt)}</td>
              <td className="hr-num">{formatMinutes(a.regularMinutes)}</td>
              <td className="hr-num">
                {formatMinutes(a.otMinutesApproved)}
                {a.otMinutes > a.otMinutesApproved && (
                  <span className="hr-muted"> / {formatMinutes(a.otMinutes)}</span>
                )}
              </td>
              <td>
                <span className={statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus).className}>
                  {statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus).label}
                </span>
              </td>
              <td>
                <span className={statusBadge(APPROVAL_STATUS_META, a.approvalStatus).className}>
                  {statusBadge(APPROVAL_STATUS_META, a.approvalStatus).label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayslipList({ payslips }) {
  if (payslips.length === 0) {
    return (
      <div className="hr-state">
        <Wallet className="h-9 w-9 text-slate-500" />
        <p>Bạn chưa có phiếu lương nào được phát hành.</p>
      </div>
    );
  }
  return (
    <div className="hr-table-wrap">
      <table className="hr-table">
        <thead>
          <tr>
            <th>Kỳ lương</th>
            <th>Giờ công</th>
            <th>OT</th>
            <th>Lương cơ bản</th>
            <th>OT</th>
            <th>Thưởng</th>
            <th>Khấu trừ</th>
            <th>Thực nhận</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {payslips.map((p) => (
            <tr key={p.uuid}>
              <td className="hr-strong">{p.periodLabel}</td>
              <td className="hr-num">{formatMinutes(p.regularMinutes)}</td>
              <td className="hr-num">{formatMinutes(p.otMinutes)}</td>
              <td className="hr-num">{formatMoney(p.regularPay)}</td>
              <td className="hr-num">{formatMoney(p.otPay)}</td>
              <td className="hr-num" style={{ color: '#34d399' }}>{formatMoney(p.bonusTotal)}</td>
              <td className="hr-num" style={{ color: '#f87171' }}>{formatMoney(p.deductionTotal)}</td>
              <td className="hr-num hr-strong">{formatMoney(p.netPay)}</td>
              <td>
                <span className={statusBadge(PAYSLIP_STATUS_META, p.status).className}>
                  {statusBadge(PAYSLIP_STATUS_META, p.status).label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckpointActionModal({ action, shift, onClose, onConfirm }) {
  const [code, setCode] = useState('');
  const [scanActive, setScanActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanError, setScanError] = useState('');
  const scannerSupported = canUseQrScanner();

  const submit = async (value) => {
    const normalized = String(value ?? code).replace(/\D/g, '');
    if (normalized.length !== 6) {
      setError('Mã điểm danh gồm 6 chữ số. Vui lòng quét QR hoặc nhập lại.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onConfirm(normalized);
      // Thành công: component cha sẽ đóng modal (unmount).
    } catch (err) {
      setError(err?.message || 'Chấm công thất bại. Vui lòng thử lại.');
      setSaving(false);
    }
  };

  const handleScan = (scanned) => {
    const normalized = String(scanned || '').replace(/\D/g, '').slice(0, 6);
    setScanActive(false);
    if (normalized.length === 6) {
      setCode(normalized);
      submit(normalized);
    } else {
      setScanError('Mã QR không hợp lệ. Hãy quét đúng mã điểm danh tại quầy.');
    }
  };

  return (
    <AdminModal
      open
      onClose={() => { if (!saving) onClose(); }}
      title={action === 'in' ? 'Xác nhận check-in' : 'Xác nhận check-out'}
      subtitle={`${shift.shiftName} · ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`}
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-medium"
            disabled={saving}
            onClick={onClose}
          >
            Hủy
          </button>
          <PrimaryButton onClick={() => submit()} loading={saving} disabled={code.length !== 6}>
            {action === 'in' ? 'Check-in' : 'Check-out'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="hr-muted" style={{ fontSize: 13 }}>
          Quét mã QR điểm danh hiển thị tại quầy, hoặc nhập mã 6 số đang hiển thị để xác nhận bạn có
          mặt tại nơi làm việc.
        </p>

        {scannerSupported ? (
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-semibold inline-flex items-center gap-2"
            onClick={() => {
              setScanError('');
              setScanActive((v) => !v);
            }}
          >
            <QrCode className="h-4 w-4" />
            {scanActive ? 'Tắt camera quét' : 'Quét mã QR'}
          </button>
        ) : (
          <p className="hr-muted" style={{ fontSize: 12 }}>
            Thiết bị không bật được camera (cần HTTPS). Vui lòng nhập mã thủ công.
          </p>
        )}

        {scanActive && (
          <StaffQrScanner active={scanActive} onScan={handleScan} onError={(m) => setScanError(m)} />
        )}
        {scanError && <p className="hr-field__error">{scanError}</p>}

        <div className="hr-field">
          <label className="hr-field__label">Mã điểm danh (6 số)</label>
          <input
            className={adminInputClass}
            inputMode="numeric"
            maxLength={6}
            placeholder="Ví dụ: 482913"
            value={code}
            autoFocus
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          {error && <p className="hr-field__error">{error}</p>}
        </div>
      </div>
    </AdminModal>
  );
}

export default MyHrPage;
