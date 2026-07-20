import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  BellRing,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  ChevronRight,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Timer,
  Trash2,
  Wallet,
} from 'lucide-react';
import { AdminPage, AdminKpiGrid, AdminModal, PageHeader, PrimaryButton, FilterPills, StatusBadge, AdminTableShell, AdminDatePicker } from '../../components';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { userNotificationApi } from '../../../../shared/services/userNotificationApi';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import StaffQrScanner, { canUseQrScanner } from '../../../../shared/components/qr/StaffQrScanner';
import { adminInputClass } from '../../components/adminFormStyles';
import {
  APPROVAL_STATUS_META,
  ATTENDANCE_STATUS_META,
  PAYSLIP_STATUS_META,
  REQUEST_STATUS_META,
  SHIFT_CATEGORY_META,
  SHIFT_CATEGORY_ORDER,
  addDaysIso,
  categorizeShift,
  formatClock,
  formatDate,
  formatMinutes,
  formatMoney,
  formatTime,
  leaveTypeLabel,
  monthRangeIso,
  shiftCheckInState,
  statusBadge,
  statusVariant,
  todayIso,
  weekdayLabel,
} from './hrUtils';
import './hr.css';

const TABS = [
  { id: 'shifts', label: 'Ca làm của tôi' },
  { id: 'attendance', label: 'Lịch sử chấm công' },
  { id: 'payslips', label: 'Phiếu lương' },
  { id: 'leave', label: 'Nghỉ phép' },
  { id: 'swap', label: 'Đổi ca' },
];

const LEAVE_TYPE_OPTIONS = [
  { value: 'ANNUAL', label: 'Phép năm' },
  { value: 'UNPAID', label: 'Không lương' },
  { value: 'SICK', label: 'Nghỉ ốm' },
  { value: 'OTHER', label: 'Khác' },
];

// Các loại thông báo HR sinh ra từ backend.
const HR_NOTIF_TYPES = new Set([
  'shift_assigned',
  'shift_reminder',
  'payslip_ready',
  'leave_request',
  'shift_swap',
]);
const NOTIF_ICON = {
  shift_assigned: CalendarPlus,
  shift_reminder: CalendarClock,
  payslip_ready: Wallet,
  leave_request: CalendarX,
  shift_swap: ArrowLeftRight,
};

const MyHrPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'shifts';
  const tab = TABS.some((t) => t.id === rawTab) ? rawTab : 'shifts';
  const setTab = useCallback((id) => {
    setSearchParams(id === 'shifts' ? {} : { tab: id }, { replace: true });
  }, [setSearchParams]);

  const [overview, setOverview] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState(null);
  const [swapModalShift, setSwapModalShift] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [markingRead, setMarkingRead] = useState(false);
  const confirm = useConfirm();
  const today = todayIso();
  const initialMonthRange = useMemo(() => {
    const now = new Date();
    return monthRangeIso(now.getFullYear(), now.getMonth() + 1);
  }, []);
  const [shiftRange, setShiftRange] = useState(() => ({
    from: addDaysIso(today, -7),
    to: addDaysIso(today, 21),
  }));
  const [focusedShiftDate, setFocusedShiftDate] = useState(today);
  const [attendanceRange, setAttendanceRange] = useState(initialMonthRange);

  const loadRequestCounts = useCallback(async () => {
    try {
      const [leaveData, swapData] = await Promise.all([
        hrService.getMyLeaveRequests(),
        hrService.getMySwapRequests(),
      ]);
      const leaveList = Array.isArray(leaveData) ? leaveData : [];
      const swapList = Array.isArray(swapData) ? swapData : [];
      setPendingLeaveCount(leaveList.filter((l) => l.status === 'PENDING').length);
      setPendingSwapCount(swapList.filter((s) => s.status === 'PENDING').length);
      if (tab === 'leave') setLeaves(leaveList);
      if (tab === 'swap') setSwaps(swapList);
    } catch {
      setPendingLeaveCount(0);
      setPendingSwapCount(0);
    }
  }, [tab]);

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
        const data = await hrService.getMyAttendance(attendanceRange);
        setAttendance(Array.isArray(data) ? data : []);
      } else if (tab === 'payslips') {
        const data = await hrService.getMyPayslips();
        setPayslips(Array.isArray(data) ? data : []);
      } else if (tab === 'leave') {
        const data = await hrService.getMyLeaveRequests();
        setLeaves(Array.isArray(data) ? data : []);
      } else if (tab === 'swap') {
        const data = await hrService.getMySwapRequests();
        setSwaps(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [attendanceRange, shiftRange, tab]);

  useEffect(() => {
    loadOverview();
    loadNotifs();
    loadRequestCounts();
  }, [loadOverview, loadNotifs, loadRequestCounts]);

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
          kpiClass: 'kpi-total',
          badge: 'Trong 3 tuần tới',
        },
        {
          label: 'Giờ công tháng này',
          value: `${formatMinutes(overview.monthRegularMinutes)}`,
          icon: Clock,
          kpiClass: 'kpi-active',
          badge: `${overview.monthShiftCount ?? 0} ca đã làm`,
        },
        {
          label: 'Giờ OT tháng này',
          value: formatMinutes(overview.monthOtMinutes),
          icon: Timer,
          kpiClass: 'kpi-showing',
          badge: `${overview.monthPendingCount ?? 0} chờ duyệt`,
        },
        {
          label: 'Lương kỳ gần nhất',
          value: formatMoney(overview.latestNetPay),
          icon: Wallet,
          kpiClass: 'kpi-upcoming',
          badge: overview.latestPayslipLabel || 'Chưa có',
        },
      ]
    : [];

  const tabItems = useMemo(
    () => TABS.map((t) => ({
      ...t,
      count:
        t.id === 'leave' && pendingLeaveCount > 0
          ? pendingLeaveCount
          : t.id === 'swap' && pendingSwapCount > 0
            ? pendingSwapCount
            : undefined,
    })),
    [pendingLeaveCount, pendingSwapCount],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTab(), loadOverview(), loadRequestCounts()]);
  }, [loadTab, loadOverview, loadRequestCounts]);

  const openSwapForShift = useCallback((shift) => {
    setSwapModalShift(shift);
  }, []);

  const handleFocusDateChange = useCallback((value) => {
    const nextDate = value || todayIso();
    setFocusedShiftDate(nextDate);
    if (nextDate < shiftRange.from || nextDate > shiftRange.to) {
      setShiftRange({
        from: addDaysIso(nextDate, -3),
        to: addDaysIso(nextDate, 7),
      });
    }
  }, [shiftRange.from, shiftRange.to]);

  const focusedDateShifts = useMemo(
    () => shifts.filter((shift) => shift.workDate === focusedShiftDate),
    [focusedShiftDate, shifts],
  );

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Bảng công của tôi"
        description="Xem lịch ca, chấm công, gửi đơn nghỉ phép / đổi ca và tra cứu phiếu lương."
        variant="default"
        primaryAction={{
          label: 'Gửi yêu cầu đổi ca',
          onClick: () => setTab('swap'),
          icon: <ArrowLeftRight className="h-4 w-4" />,
        }}
        secondaryActions={[
          {
            label: 'Xin nghỉ phép',
            onClick: () => setTab('leave'),
            icon: <CalendarX className="h-4 w-4" />,
          },
          {
            label: 'Làm mới',
            onClick: () => {
              refreshAll();
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

      <FilterPills
        value={tab}
        onChange={setTab}
        items={tabItems}
        ariaLabel="Tab HR cá nhân"
        className="mb-4"
      />

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải...</p>
        </div>
      ) : tab === 'shifts' ? (
        <>
          <div className="hr-toolbar-split">
            <div className="hr-inline" style={{ gap: 12, alignItems: 'flex-end' }}>
              <div className="hr-field">
                <span className="hr-field__label">Xem nhanh ngày</span>
                <AdminDatePicker
                  value={focusedShiftDate}
                  onChange={handleFocusDateChange}
                  size="sm"
                />
              </div>
              <div className="hr-field">
                <span className="hr-field__label">Từ ngày</span>
                <AdminDatePicker
                  value={shiftRange.from}
                  onChange={(value) => setShiftRange((prev) => ({ ...prev, from: value || prev.from }))}
                  max={shiftRange.to || undefined}
                  size="sm"
                />
              </div>
              <div className="hr-field">
                <span className="hr-field__label">Đến ngày</span>
                <AdminDatePicker
                  value={shiftRange.to}
                  onChange={(value) => setShiftRange((prev) => ({ ...prev, to: value || prev.to }))}
                  min={shiftRange.from || undefined}
                  size="sm"
                />
              </div>
            </div>
            <button
              type="button"
              className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-sm font-medium"
              onClick={() => {
                const current = todayIso();
                setFocusedShiftDate(current);
                setShiftRange({ from: addDaysIso(current, -7), to: addDaysIso(current, 21) });
              }}
            >
              Về hôm nay
            </button>
          </div>

          <QuickCheckpointPanel
            date={focusedShiftDate}
            shifts={focusedDateShifts}
            onCheckIn={(s) => openCheckpoint(s, 'in')}
            onCheckOut={(s) => openCheckpoint(s, 'out')}
          />

          <ShiftList
            shifts={shifts}
            focusDate={focusedShiftDate}
            onCheckIn={(s) => openCheckpoint(s, 'in')}
            onCheckOut={(s) => openCheckpoint(s, 'out')}
            onRequestSwap={openSwapForShift}
          />
        </>
      ) : tab === 'attendance' ? (
        <>
          <div className="hr-toolbar-split">
            <div className="hr-inline" style={{ gap: 12, alignItems: 'flex-end' }}>
              <div className="hr-field">
                <span className="hr-field__label">Từ ngày</span>
                <AdminDatePicker
                  value={attendanceRange.from}
                  onChange={(value) => setAttendanceRange((prev) => ({ ...prev, from: value || prev.from }))}
                  max={attendanceRange.to || undefined}
                  size="sm"
                />
              </div>
              <div className="hr-field">
                <span className="hr-field__label">Đến ngày</span>
                <AdminDatePicker
                  value={attendanceRange.to}
                  onChange={(value) => setAttendanceRange((prev) => ({ ...prev, to: value || prev.to }))}
                  min={attendanceRange.from || undefined}
                  size="sm"
                />
              </div>
            </div>
            <button
              type="button"
              className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-sm font-medium"
              onClick={() => {
                const now = new Date();
                setAttendanceRange(monthRangeIso(now.getFullYear(), now.getMonth() + 1));
              }}
            >
              Tháng này
            </button>
          </div>
          <AttendanceList attendance={attendance} />
        </>
      ) : tab === 'payslips' ? (
        <PayslipList payslips={payslips} />
      ) : tab === 'leave' ? (
        <LeaveTab leaves={leaves} onChanged={refreshAll} confirm={confirm} />
      ) : (
        <SwapTab swaps={swaps} onChanged={refreshAll} confirm={confirm} />
      )}

      {swapModalShift && (
        <SwapRequestModal
          shift={swapModalShift}
          onClose={() => setSwapModalShift(null)}
          onSubmitted={refreshAll}
          confirm={confirm}
        />
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

function ShiftList({ shifts, focusDate, onCheckIn, onCheckOut, onRequestSwap }) {
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
    if (focusDate && dates.includes(focusDate)) return focusDate;
    if (dates.includes(today)) return today;
    const upcoming = dates.find((d) => d >= today);
    return upcoming || dates[dates.length - 1];
  }, [dates, focusDate, today]);

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
                    onRequestSwap={onRequestSwap}
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

function QuickCheckpointPanel({ date, shifts, onCheckIn, onCheckOut }) {
  const actionableShifts = useMemo(() => (
    shifts.filter((shift) => {
      if (shift.status === 'CANCELLED') return false;
      if (shift.checkInAt && !shift.checkOutAt) return true;
      if (!shift.checkInAt) {
        return shiftCheckInState(shift.workDate, shift.startTime, shift.endTime) === 'OPEN';
      }
      return false;
    })
  ), [shifts]);

  if (actionableShifts.length === 0) {
    return (
      <div className="hr-alert hr-alert--info">
        <QrCode className="h-5 w-5 hr-alert__icon shrink-0" />
        <div className="hr-alert__body">
          <p className="hr-alert__title">Quét mã QR trên màn hình quầy</p>
          <p className="hr-alert__text">
            Mã điểm danh không nằm trên trang cá nhân. Nhờ đồng nghiệp tại quầy mở{' '}
            <Link to="/admin/hr/checkpoint" className="hr-link">Mã QR điểm danh quầy</Link>
            {' '}trên tablet/màn hình, rồi quét mã khi bấm Check-in/Check-out.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-checkpoint-card mb-4">
      <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p className="hr-card__title" style={{ marginBottom: 4 }}>Trạm chấm công nhân viên</p>
          <p className="hr-strong">
            {formatDate(date)} · Quét mã trên màn hình quầy
          </p>
          <p className="hr-muted" style={{ fontSize: 12, marginTop: 4 }}>
            Mở <Link to="/admin/hr/checkpoint" className="hr-link">Mã QR điểm danh quầy</Link> trên tablet tại quầy, không phải trên điện thoại cá nhân.
          </p>
        </div>
        <span className="hr-badge hr-badge--info">{actionableShifts.length} ca thao tác</span>
      </div>
      <div className="hr-day__body" style={{ padding: 0 }}>
        {actionableShifts.map((shift) => (
          <ShiftCard
            key={shift.uuid}
            shift={shift}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
          />
        ))}
      </div>
    </div>
  );
}

function ShiftCard({ shift, onCheckIn, onCheckOut, onRequestSwap }) {
  const cancelled = shift.status === 'CANCELLED';
  const hasCheckIn = Boolean(shift.checkInAt);
  const hasCheckOut = Boolean(shift.checkOutAt);
  const windowState = !hasCheckIn
    ? shiftCheckInState(shift.workDate, shift.startTime, shift.endTime)
    : 'OPEN';
  const canRequestSwap =
    !cancelled
    && shift.status === 'SCHEDULED'
    && shift.workDate >= todayIso()
    && !hasCheckIn
    && windowState !== 'MISSED';

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
          <StatusBadge variant={statusVariant(ATTENDANCE_STATUS_META, shift.attendanceStatus)}>
            {statusBadge(ATTENDANCE_STATUS_META, shift.attendanceStatus).label}
          </StatusBadge>
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
          {canRequestSwap && onRequestSwap && (
            <button
              type="button"
              className="adm-btn adm-btn--ghost px-3 py-1.5 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold cursor-pointer hr-swap-shift-btn"
              onClick={() => onRequestSwap(shift)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Đổi ca
            </button>
          )}
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
    <AdminTableShell>
      <table className="adm-table hr-table">
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
                <StatusBadge variant={statusVariant(ATTENDANCE_STATUS_META, a.attendanceStatus)}>
                  {statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus).label}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge variant={statusVariant(APPROVAL_STATUS_META, a.approvalStatus)}>
                  {statusBadge(APPROVAL_STATUS_META, a.approvalStatus).label}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableShell>
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
    <AdminTableShell>
      <table className="adm-table hr-table">
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
                <StatusBadge variant={statusVariant(PAYSLIP_STATUS_META, p.status)}>
                  {statusBadge(PAYSLIP_STATUS_META, p.status).label}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTableShell>
  );
}

function LeaveTab({ leaves, onChanged, confirm }) {
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  const submit = async () => {
    if (!fromDate || !toDate) {
      notificationService.error('Vui lòng chọn khoảng ngày nghỉ.');
      return;
    }
    if (toDate < fromDate) {
      notificationService.error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
      return;
    }
    const ok = await confirm({
      title: 'Gửi đơn nghỉ phép',
      message: 'Xác nhận gửi đơn nghỉ phép cho quản lý duyệt?',
      highlight: `${formatDate(fromDate)} → ${formatDate(toDate)}`,
      confirmLabel: 'Gửi đơn',
      variant: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      await hrService.createLeaveRequest({ leaveType, fromDate, toDate, reason: reason.trim() || null });
      notificationService.success('Đã gửi đơn nghỉ phép.');
      setReason('');
      await onChanged();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể gửi đơn nghỉ phép.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (rec) => {
    const ok = await confirm({
      title: 'Hủy đơn nghỉ phép',
      message: 'Bạn có chắc muốn hủy đơn nghỉ phép này không?',
      highlight: `${formatDate(rec.fromDate)} → ${formatDate(rec.toDate)}`,
      confirmLabel: 'Hủy đơn',
      variant: 'danger',
    });
    if (!ok) return;
    setCancelId(rec.uuid);
    try {
      await hrService.cancelLeaveRequest(rec.uuid);
      notificationService.success('Đã hủy đơn nghỉ phép.');
      await onChanged();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể hủy đơn.');
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div className="hr-req-layout">
      <div className="hr-card hr-req-form">
        <p className="hr-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Plus className="h-4 w-4 text-emerald-400" />
          Gửi đơn nghỉ phép
        </p>
        <div className="hr-field" style={{ marginTop: 12 }}>
          <AdminSelectDropdown label="Loại nghỉ" value={leaveType} options={LEAVE_TYPE_OPTIONS} onChange={setLeaveType} size="sm" />
        </div>
        <div className="hr-inline" style={{ gap: 12, marginTop: 12 }}>
          <div className="hr-field" style={{ flex: 1 }}>
            <AdminDatePicker
              label="Từ ngày"
              value={fromDate}
              onChange={setFromDate}
              min={todayIso()}
              size="sm"
            />
          </div>
          <div className="hr-field" style={{ flex: 1 }}>
            <AdminDatePicker
              label="Đến ngày"
              value={toDate}
              onChange={setToDate}
              min={fromDate || todayIso()}
              size="sm"
            />
          </div>
        </div>
        <div className="hr-field" style={{ marginTop: 12 }}>
          <label className="hr-field__label">Lý do (tùy chọn)</label>
          <textarea
            className={adminInputClass}
            rows={3}
            placeholder="Ví dụ: về quê, việc gia đình..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={submit} loading={saving}>
            <Send className="h-4 w-4" />
            Gửi đơn
          </PrimaryButton>
        </div>
      </div>

      <div className="hr-req-history">
        <p className="hr-card__title" style={{ marginBottom: 10 }}>Đơn của tôi</p>
        {leaves.length === 0 ? (
          <div className="hr-state">
            <CalendarX className="h-9 w-9 text-slate-500" />
            <p>Bạn chưa gửi đơn nghỉ phép nào.</p>
          </div>
        ) : (
          <div className="hr-req-list">
            {leaves.map((l) => (
              <div key={l.uuid} className="hr-card">
                <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="hr-strong">{leaveTypeLabel(l.leaveType)}</span>
                  <StatusBadge variant={statusVariant(REQUEST_STATUS_META, l.status)}>
                    {statusBadge(REQUEST_STATUS_META, l.status).label}
                  </StatusBadge>
                </div>
                <p className="hr-muted" style={{ fontSize: 13 }}>
                  {formatDate(l.fromDate)} → {formatDate(l.toDate)} · {l.days} ngày
                </p>
                {l.reason && <p className="hr-muted" style={{ fontSize: 12, marginTop: 4 }}>Lý do: {l.reason}</p>}
                {l.reviewNote && <p className="hr-muted" style={{ fontSize: 12, marginTop: 4 }}>Phản hồi: {l.reviewNote}</p>}
                {l.status === 'PENDING' && (
                  <button
                    type="button"
                    className="hr-req-btn hr-req-btn--reject"
                    style={{ marginTop: 10 }}
                    disabled={cancelId === l.uuid}
                    onClick={() => cancel(l)}
                  >
                    {cancelId === l.uuid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Hủy đơn
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SwapRequestForm({ prefillAssignmentId = '', onSubmitted, confirm, showSubmit = true }) {
  const [myShifts, setMyShifts] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [mine, setMine] = useState(prefillAssignmentId || '');
  const [theirs, setTheirs] = useState('');
  const [note, setNote] = useState('');
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => ({ from: todayIso(), to: addDaysIso(todayIso(), 28) }), []);

  const loadForm = useCallback(async () => {
    setLoadingForm(true);
    try {
      const [ms, cs] = await Promise.all([
        hrService.getMyShifts(range),
        hrService.getSwapCandidates(range.from, range.to),
      ]);
      const upcoming = (Array.isArray(ms) ? ms : []).filter(
        (s) => s.status === 'SCHEDULED' && s.workDate >= todayIso(),
      );
      setMyShifts(upcoming);
      setCandidates(Array.isArray(cs) ? cs : []);
    } catch {
      setMyShifts([]);
      setCandidates([]);
    } finally {
      setLoadingForm(false);
    }
  }, [range]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  useEffect(() => {
    if (prefillAssignmentId) setMine(prefillAssignmentId);
  }, [prefillAssignmentId]);

  const selectedMine = useMemo(
    () => myShifts.find((s) => s.uuid === mine) || null,
    [myShifts, mine],
  );

  const mineOptions = useMemo(
    () => [
      { value: '', label: 'Chọn ca của bạn...' },
      ...myShifts.map((s) => ({
        value: s.uuid,
        label: `${formatDate(s.workDate)} · ${s.shiftName} (${formatTime(s.startTime)}–${formatTime(s.endTime)})`,
      })),
    ],
    [myShifts],
  );

  const theirsOptions = useMemo(() => {
    const pool = selectedMine
      ? candidates.filter((s) => s.workDate === selectedMine.workDate)
      : candidates;
    const list = pool.length > 0 ? pool : candidates;
    return [
      { value: '', label: 'Chọn ca đồng nghiệp...' },
      ...list.map((s) => ({
        value: s.uuid,
        label: `${s.fullName || s.email} · ${formatDate(s.workDate)} · ${s.shiftName} (${formatTime(s.startTime)}–${formatTime(s.endTime)})`,
      })),
    ];
  }, [candidates, selectedMine]);

  useEffect(() => {
    setTheirs('');
  }, [mine]);

  const submit = async () => {
    if (!mine || !theirs) {
      notificationService.error('Vui lòng chọn ca của bạn và ca của đồng nghiệp.');
      return;
    }
    const ok = await confirm({
      title: 'Gửi yêu cầu đổi ca',
      message: 'Xác nhận gửi yêu cầu đổi ca cho quản lý duyệt?',
      confirmLabel: 'Gửi yêu cầu',
      variant: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      await hrService.createSwapRequest({
        requesterAssignmentUuid: mine,
        counterpartAssignmentUuid: theirs,
        note: note.trim() || null,
      });
      notificationService.success('Đã gửi yêu cầu đổi ca.');
      setMine('');
      setTheirs('');
      setNote('');
      await Promise.all([onSubmitted?.(), loadForm()]);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể gửi yêu cầu đổi ca.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="hr-state" style={{ padding: 20 }}>
        <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
      </div>
    );
  }

  if (myShifts.length === 0) {
    return (
      <p className="hr-muted" style={{ fontSize: 13 }}>
        Bạn chưa có ca sắp tới nào để đổi. Liên hệ quản lý nếu cần điều chỉnh lịch.
      </p>
    );
  }

  return (
    <>
      <div className="hr-field">
        <AdminSelectDropdown label="Ca của tôi" value={mine} options={mineOptions} onChange={setMine} size="sm" />
      </div>
      <div className="hr-field" style={{ marginTop: 12 }}>
        <AdminSelectDropdown label="Đổi lấy ca của đồng nghiệp" value={theirs} options={theirsOptions} onChange={setTheirs} size="sm" />
      </div>
      {selectedMine && candidates.filter((s) => s.workDate === selectedMine.workDate).length === 0 && (
        <p className="hr-muted" style={{ fontSize: 11, marginTop: 8 }}>
          Không có ca đồng nghiệp cùng ngày — hiển thị tất cả ca có thể đổi trong 4 tuần tới.
        </p>
      )}
      <div className="hr-field" style={{ marginTop: 12 }}>
        <label className="hr-field__label">Ghi chú (tùy chọn)</label>
        <textarea
          className={adminInputClass}
          rows={2}
          placeholder="Lý do đổi ca..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="hr-muted" style={{ fontSize: 11, marginTop: 8 }}>
        Yêu cầu cần quản lý duyệt. Hệ thống kiểm tra trùng giờ và nghỉ phép trước khi đổi.
      </p>
      {showSubmit && (
        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={submit} loading={saving} disabled={!mine || !theirs}>
            <Send className="h-4 w-4" />
            Gửi yêu cầu
          </PrimaryButton>
        </div>
      )}
    </>
  );
}

function SwapRequestModal({ shift, onClose, onSubmitted, confirm }) {
  return (
    <AdminModal
      open
      onClose={onClose}
      title="Gửi yêu cầu đổi ca"
      subtitle={`${shift.shiftName} · ${formatDate(shift.workDate)} · ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`}
      size="md"
      footer={(
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-medium"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      )}
    >
      <SwapRequestForm
        prefillAssignmentId={shift.uuid}
        onSubmitted={onSubmitted}
        confirm={confirm}
      />
    </AdminModal>
  );
}

function SwapTab({ swaps, onChanged, confirm }) {
  const [cancelId, setCancelId] = useState(null);

  const cancel = async (rec) => {
    const ok = await confirm({
      title: 'Hủy yêu cầu đổi ca',
      message: 'Bạn có chắc muốn hủy yêu cầu đổi ca này không?',
      confirmLabel: 'Hủy yêu cầu',
      variant: 'danger',
    });
    if (!ok) return;
    setCancelId(rec.uuid);
    try {
      await hrService.cancelSwapRequest(rec.uuid);
      notificationService.success('Đã hủy yêu cầu đổi ca.');
      await onChanged();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể hủy yêu cầu.');
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div className="hr-req-layout">
      <div className="hr-card hr-req-form">
        <p className="hr-card__title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight className="h-4 w-4 text-sky-400" />
          Gửi yêu cầu đổi ca
        </p>
        <div style={{ marginTop: 12 }}>
          <SwapRequestForm onSubmitted={onChanged} confirm={confirm} />
        </div>
      </div>

      <div className="hr-req-history">
        <p className="hr-card__title" style={{ marginBottom: 10 }}>Yêu cầu của tôi</p>
        {swaps.length === 0 ? (
          <div className="hr-state">
            <ArrowLeftRight className="h-9 w-9 text-slate-500" />
            <p>Bạn chưa có yêu cầu đổi ca nào.</p>
          </div>
        ) : (
          <div className="hr-req-list">
            {swaps.map((s) => (
              <div key={s.uuid} className="hr-card">
                <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <StatusBadge variant={statusVariant(REQUEST_STATUS_META, s.status)}>
                    {statusBadge(REQUEST_STATUS_META, s.status).label}
                  </StatusBadge>
                  <span className="hr-muted" style={{ fontSize: 11 }}>{formatDate(s.createdAt)}</span>
                </div>
                <SwapPartyLine label="Ca của bạn" party={s.requester} />
                <div className="hr-inline" style={{ justifyContent: 'center', margin: '4px 0' }}>
                  <ArrowLeftRight className="h-4 w-4 text-sky-400" />
                </div>
                <SwapPartyLine label="Đổi lấy" party={s.counterpart} />
                {s.reviewNote && <p className="hr-muted" style={{ fontSize: 12, marginTop: 6 }}>Phản hồi: {s.reviewNote}</p>}
                {s.status === 'PENDING' && (
                  <button
                    type="button"
                    className="hr-req-btn hr-req-btn--reject"
                    style={{ marginTop: 10 }}
                    disabled={cancelId === s.uuid}
                    onClick={() => cancel(s)}
                  >
                    {cancelId === s.uuid ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Hủy yêu cầu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SwapPartyLine({ label, party }) {
  if (!party) return null;
  return (
    <div>
      <span className="hr-muted" style={{ fontSize: 11 }}>{label}: </span>
      <span className="hr-strong" style={{ fontSize: 13 }}>{party.fullName || party.email}</span>
      <div className="hr-muted" style={{ fontSize: 12 }}>
        {party.shiftName} · {formatDate(party.workDate)} · {formatTime(party.startTime)}–{formatTime(party.endTime)}
      </div>
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
          Quét mã QR đang hiển thị trên màn hình/tablet tại quầy (
          <Link to="/admin/hr/checkpoint" className="hr-link">Mã QR điểm danh quầy</Link>
          ), hoặc nhập 6 số đang hiện trên màn hình đó.
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
