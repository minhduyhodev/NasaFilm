import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CopyPlus,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
  Users,
} from 'lucide-react';
import { AdminPage, AdminModal, PageHeader, PrimaryButton, AdminDatePicker, AdminMonthCalendar, FilterPills } from '../../components';
import { adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { toIsoDate, parseIsoDate } from '../../components/calendar/dateUtils';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import {
  ATTENDANCE_STATUS_META,
  addDaysIso,
  formatDate,
  formatTime,
  startOfWeekIso,
  statusBadge,
  todayIso,
  vnDateTime,
} from './hrUtils';
import './hr.css';

const WEEKDAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const ATTENDANCE_DOT = {
  IN_PROGRESS: '#38bdf8',
  ON_TIME: '#34d399',
  LATE: '#fbbf24',
  EARLY_LEAVE: '#fbbf24',
  ABSENT: '#f87171',
};

const SCHEDULE_LEGEND = [
  { label: 'Đúng giờ', color: '#34d399' },
  { label: 'Đang làm', color: '#38bdf8' },
  { label: 'Muộn / về sớm', color: '#fbbf24' },
  { label: 'Vắng', color: '#f87171' },
  { label: 'Chưa chấm', color: '#94a3b8' },
];

function monthBounds(year, monthIndex) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: toIsoDate(year, monthIndex, 1),
    to: toIsoDate(year, monthIndex, last),
  };
}

function datesBetween(fromIso, toIso) {
  const out = [];
  let cursor = fromIso;
  let guard = 0;
  while (cursor <= toIso && guard < 366) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
    guard += 1;
  }
  return out;
}

function weekdayOf(iso) {
  return new Date(`${iso}T00:00:00`).getDay();
}

// Ca đang diễn ra hoặc đã qua (đã tới giờ bắt đầu) thì khóa, không cho sửa/xóa.
function isAssignmentLocked(a) {
  if (!a?.workDate) return false;
  const start = vnDateTime(a.workDate, a.startTime || '00:00:00');
  if (!start) return false;
  return Date.now() >= start.getTime();
}

/**
 * Tính phủ quyền của một tập nhân viên so với bộ quyền vận hành yêu cầu.
 * Trả về danh sách quyền còn thiếu (kèm nhãn) và cờ ok.
 */
function coverageOf(userIds, staffById, required) {
  if (!required || required.length === 0) return null;
  const covered = new Set();
  userIds.forEach((id) => {
    const s = staffById.get(id);
    (s?.permissions || []).forEach((p) => covered.add(p));
  });
  const missing = required.filter((r) => !covered.has(r.name));
  return { missing, ok: missing.length === 0 };
}

// ----- Kiểm tra xung đột lịch (đồng bộ với backend) -----
const MIN_REST_MINUTES = 8 * 60; // nghỉ tối thiểu qua đêm
const DAILY_SOFT_MINUTES = 8 * 60; // >8h/ngày -> cảnh báo
const DAILY_HARD_MINUTES = 12 * 60; // >12h/ngày -> backend chặn

function toEpochDay(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}
function minutesOfTime(timeStr) {
  const [h, mm] = String(timeStr || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (mm || 0);
}
function shiftInterval(iso, startTime, endTime) {
  const day = toEpochDay(iso);
  const s = minutesOfTime(startTime);
  const e = minutesOfTime(endTime);
  const startAbs = day * 1440 + s;
  const endAbs = e > s ? day * 1440 + e : (day + 1) * 1440 + e;
  return { iso, startAbs, endAbs };
}
// Trả về 'overlap' | 'rest' | 'dailyHard' | 'dailySoft' | null
function scheduleViolation(existing, cand) {
  let sameDay = cand.endAbs - cand.startAbs;
  for (const iv of existing) {
    if (cand.startAbs < iv.endAbs && iv.startAbs < cand.endAbs) return 'overlap';
    if (iv.iso === cand.iso) {
      sameDay += iv.endAbs - iv.startAbs;
    } else {
      let earlierEnd;
      let laterStart;
      if (iv.startAbs <= cand.startAbs) {
        earlierEnd = iv.endAbs;
        laterStart = cand.startAbs;
      } else {
        earlierEnd = cand.endAbs;
        laterStart = iv.startAbs;
      }
      if (laterStart > earlierEnd && laterStart - earlierEnd < MIN_REST_MINUTES) return 'rest';
    }
  }
  if (sameDay > DAILY_HARD_MINUTES) return 'dailyHard';
  if (sameDay > DAILY_SOFT_MINUTES) return 'dailySoft';
  return null;
}

const HrSchedulePage = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), monthIndex: t.getMonth() };
  });
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [requiredPerms, setRequiredPerms] = useState([]);
  const [allPerms, setAllPerms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [permConfigOpen, setPermConfigOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const confirm = useConfirm();

  const weekEnd = useMemo(() => addDaysIso(weekStart, 6), [weekStart]);
  const monthRange = useMemo(
    () => monthBounds(calendarMonth.year, calendarMonth.monthIndex),
    [calendarMonth.year, calendarMonth.monthIndex],
  );
  const rangeFrom = viewMode === 'month' ? monthRange.from : weekStart;
  const rangeTo = viewMode === 'month' ? monthRange.to : weekEnd;

  const loadRefData = useCallback(async () => {
    try {
      const [staffList, shiftList, catalog] = await Promise.all([
        hrService.getStaffDirectory(),
        hrService.getShiftDefinitions(),
        hrService.getShiftPermissionCatalog(),
      ]);
      setStaff(Array.isArray(staffList) ? staffList : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);
      setRequiredPerms(Array.isArray(catalog?.required) ? catalog.required : []);
      setAllPerms(Array.isArray(catalog?.all) ? catalog.all : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh mục.');
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getAssignments({
        from: rangeFrom,
        to: rangeTo,
        userId: userFilter || undefined,
      });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải lịch ca.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo, userFilter]);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleDelete = async (assignment) => {
    if (isAssignmentLocked(assignment)) {
      notificationService.warning('Ca đang diễn ra hoặc đã qua — không thể xóa.');
      return;
    }
    const ok = await confirm({
      title: 'Xóa phân ca',
      message: 'Bạn có chắc muốn xóa phân ca này không?',
      highlight: `${assignment.shiftName} · ${assignment.fullName || assignment.email}`,
      detail: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(assignment.uuid);
    try {
      await hrService.deleteAssignment(assignment.uuid);
      notificationService.success('Đã xóa phân ca.');
      await loadAssignments();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xóa phân ca.');
    } finally {
      setDeletingId(null);
    }
  };

  const days = useMemo(() => datesBetween(weekStart, weekEnd), [weekStart, weekEnd]);
  const today = todayIso();

  const monthEvents = useMemo(() => {
    return assignments.map((a) => ({
      id: a.uuid,
      date: a.workDate,
      label: a.fullName || a.email || 'NV',
      color: ATTENDANCE_DOT[a.attendanceStatus] || '#94a3b8',
      meta: `${a.shiftName || 'Ca'} · ${formatTime(a.startTime)}–${formatTime(a.endTime)}`,
      raw: a,
    }));
  }, [assignments]);

  const staffById = useMemo(() => {
    const m = new Map();
    staff.forEach((s) => m.set(s.userId, s));
    return m;
  }, [staff]);

  const permLabel = useMemo(() => {
    const m = {};
    allPerms.forEach((p) => { m[p.name] = p.label; });
    return m;
  }, [allPerms]);

  const shiftById = useMemo(() => {
    const m = new Map();
    shifts.forEach((s) => m.set(s.uuid, s));
    return m;
  }, [shifts]);

  // Bộ quyền yêu cầu (kèm nhãn) cho một ca cụ thể; ưu tiên cấu hình riêng của ca, fallback bộ mặc định.
  const requiredForShift = useCallback((shiftUuid) => {
    const names = shiftById.get(shiftUuid)?.requiredPermissions;
    if (Array.isArray(names) && names.length > 0) {
      return names.map((n) => ({ name: n, label: permLabel[n] || n }));
    }
    return requiredPerms;
  }, [shiftById, permLabel, requiredPerms]);

  // Gom theo ngày -> theo ca, mỗi ca liệt kê danh sách nhân viên (không tách thẻ riêng từng người).
  const groupedByDay = useMemo(() => {
    const byDay = {};
    assignments.forEach((a) => {
      (byDay[a.workDate] = byDay[a.workDate] || []).push(a);
    });
    const result = {};
    Object.entries(byDay).forEach(([date, list]) => {
      const shiftMap = new Map();
      list.forEach((a) => {
        const key = a.shiftDefinitionUuid || a.shiftName;
        if (!shiftMap.has(key)) {
          shiftMap.set(key, {
            key,
            shiftDefinitionUuid: a.shiftDefinitionUuid,
            shiftName: a.shiftName,
            startTime: a.startTime,
            endTime: a.endTime,
            items: [],
          });
        }
        shiftMap.get(key).items.push(a);
      });
      const groups = Array.from(shiftMap.values());
      groups.sort((x, y) => (x.startTime || '').localeCompare(y.startTime || ''));
      groups.forEach((g) =>
        g.items.sort((x, y) =>
          (x.fullName || x.email || '').localeCompare(y.fullName || y.email || '')));
      result[date] = groups;
    });
    return result;
  }, [assignments]);

  const activeShifts = useMemo(
    () => shifts.filter((s) => s.active !== false).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    [shifts],
  );

  // Đánh giá đủ người vận hành cho hôm nay & các ngày tới: ca chưa xếp, thiếu người, thiếu quyền.
  const weekStaffing = useMemo(() => {
    const perDay = {};
    let unstaffed = 0;
    let understaffed = 0;
    let coverageGaps = 0;
    days.forEach((day) => {
      if (day < today) return;
      const groups = groupedByDay[day] || [];
      const countByShift = new Map();
      groups.forEach((g) => countByShift.set(g.shiftDefinitionUuid, g.items.length));
      const empty = [];
      activeShifts.forEach((s) => {
        const min = s.minStaff ?? 0;
        if (min <= 0) return;
        const count = countByShift.get(s.uuid) || 0;
        if (count === 0) {
          empty.push({ uuid: s.uuid, name: s.name, startTime: s.startTime, endTime: s.endTime, min });
          unstaffed += 1;
        } else if (count < min) {
          understaffed += 1;
        }
      });
      groups.forEach((g) => {
        const cov = coverageOf(g.items.map((i) => i.userId), staffById, requiredForShift(g.shiftDefinitionUuid));
        if (cov && !cov.ok) coverageGaps += 1;
      });
      if (empty.length) perDay[day] = empty;
    });
    return { perDay, unstaffed, understaffed, coverageGaps };
  }, [days, today, groupedByDay, activeShifts, staffById, requiredForShift]);

  const hasWeekWarnings =
    weekStaffing.unstaffed + weekStaffing.understaffed + weekStaffing.coverageGaps > 0;

  const [copying, setCopying] = useState(false);
  const handleCopyWeek = async () => {
    const sourceWeekStart = addDaysIso(weekStart, -7);
    const ok = await confirm({
      title: 'Nhân bản lịch tuần trước',
      message: 'Sao chép toàn bộ ca của tuần trước sang tuần đang xem (giữ nguyên thứ trong tuần).',
      highlight: `${formatDate(sourceWeekStart)} → ${formatDate(weekStart)}`,
      detail: 'Tự động bỏ qua ngày đã qua, ca trùng và ca xung đột lịch.',
      confirmLabel: 'Nhân bản',
    });
    if (!ok) return;
    setCopying(true);
    try {
      const created = await hrService.copyWeek(sourceWeekStart, weekStart);
      const n = Array.isArray(created) ? created.length : 0;
      if (n > 0) notificationService.success(`Đã nhân bản ${n} lượt ca từ tuần trước.`);
      else notificationService.info('Không có ca nào được nhân bản (tuần trước trống hoặc đã trùng/xung đột).');
      await loadAssignments();
    } catch (err) {
      notificationService.error(err?.message || 'Nhân bản lịch thất bại.');
    } finally {
      setCopying(false);
    }
  };

  const staffOptions = [
    { value: '', label: 'Tất cả nhân viên' },
    ...staff.map((s) => ({ value: s.userId, label: s.fullName || s.email })),
  ];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Xếp ca làm việc"
        description="Phân ca cho nhân viên theo tuần. Nhân viên sẽ check-in/out dựa trên ca được xếp."
        variant="default"
        primaryAction={{
          label: 'Xếp ca',
          onClick: () => setModalOpen(true),
          icon: <CalendarPlus className="h-4 w-4" />,
        }}
      />

      <div className="hr-filters">
        <FilterPills
          value={viewMode}
          onChange={(mode) => {
            setViewMode(mode);
            if (mode === 'month') {
              const p = parseIsoDate(weekStart) || parseIsoDate(todayIso());
              if (p) setCalendarMonth({ year: p.year, monthIndex: p.monthIndex });
            } else {
              const bounds = monthBounds(calendarMonth.year, calendarMonth.monthIndex);
              setWeekStart(startOfWeekIso(bounds.from));
            }
          }}
          items={[
            { id: 'week', label: 'Tuần' },
            { id: 'month', label: 'Tháng' },
          ]}
          ariaLabel="Chế độ lịch"
        />
        {viewMode === 'week' && (
        <div className="hr-inline">
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-2.5 py-2 rounded-md cursor-pointer inline-flex items-center"
            onClick={() => setWeekStart(addDaysIso(weekStart, -7))}
            aria-label="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="hr-strong" style={{ minWidth: 190, textAlign: 'center' }}>
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </span>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-2.5 py-2 rounded-md cursor-pointer inline-flex items-center"
            onClick={() => setWeekStart(addDaysIso(weekStart, 7))}
            aria-label="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-xs font-semibold"
            onClick={() => setWeekStart(startOfWeekIso())}
          >
            Tuần này
          </button>
        </div>
        )}
        <div className="hr-field" style={{ minWidth: 220 }}>
          <AdminSelectDropdown
            label="Nhân viên"
            value={userFilter}
            options={staffOptions}
            onChange={setUserFilter}
            size="sm"
          />
        </div>
        <button
          type="button"
          className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
          onClick={handleCopyWeek}
          disabled={copying || viewMode !== 'week'}
          title="Sao chép lịch của tuần trước sang tuần đang xem"
        >
          {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
          Nhân bản tuần trước
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
          onClick={() => setPermConfigOpen(true)}
          title="Cấu hình số nhân viên tối thiểu và bộ quyền vận hành cho từng ca"
        >
          <ShieldCheck className="h-4 w-4" />
          Cấu hình ca
        </button>
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải lịch ca...</p>
        </div>
      ) : viewMode === 'month' ? (
        <AdminMonthCalendar
          year={calendarMonth.year}
          monthIndex={calendarMonth.monthIndex}
          onMonthChange={setCalendarMonth}
          selectedDate={calendarSelectedDate}
          onSelectDate={setCalendarSelectedDate}
          events={monthEvents}
          legend={SCHEDULE_LEGEND}
          emptyTitle="Chọn một ngày"
          emptyDescription="Nhấp vào ô lịch để xem ca làm việc trong ngày."
          renderDetail={(_date, dayEvents) => {
            if (!dayEvents.length) {
              return (
                <div className="adm-month-cal__empty">
                  <Users className="adm-month-cal__empty-icon" />
                  <div className="adm-month-cal__empty-title">Chưa xếp ca</div>
                  <p className="adm-month-cal__empty-desc">Ngày này chưa có phân ca nào.</p>
                </div>
              );
            }
            return (
              <div className="adm-month-cal__list">
                {dayEvents.map((ev) => {
                  const a = ev.raw;
                  const meta = a.attendanceStatus
                    ? statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus)
                    : null;
                  const locked = isAssignmentLocked(a);
                  return (
                    <div key={ev.id} className="adm-month-cal__list-item">
                      <span className="adm-month-cal__dot mt-1.5" style={{ background: ev.color }} />
                      <div className="adm-month-cal__list-item-main">
                        <div className="adm-month-cal__list-item-title">{ev.label}</div>
                        <div className="adm-month-cal__list-item-meta">{ev.meta}</div>
                        {meta?.label ? (
                          <div className="adm-month-cal__list-item-meta mt-1">{meta.label}</div>
                        ) : null}
                      </div>
                      {!locked && (
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost p-1.5 rounded-md cursor-pointer"
                          disabled={deletingId === a.uuid}
                          onClick={() => handleDelete(a)}
                          title="Xóa phân ca"
                        >
                          {deletingId === a.uuid ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
      ) : (
        <>
          {hasWeekWarnings ? (
            <div className="hr-week-banner hr-week-banner--warn">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Tuần này cần bổ sung:
                {weekStaffing.unstaffed > 0 && (
                  <strong> {weekStaffing.unstaffed} ca chưa xếp người</strong>
                )}
                {weekStaffing.understaffed > 0 && (
                  <strong>
                    {weekStaffing.unstaffed > 0 ? ', ' : ' '}
                    {weekStaffing.understaffed} ca thiếu người
                  </strong>
                )}
                {weekStaffing.coverageGaps > 0 && (
                  <strong>
                    {weekStaffing.unstaffed + weekStaffing.understaffed > 0 ? ', ' : ' '}
                    {weekStaffing.coverageGaps} ca thiếu quyền vận hành
                  </strong>
                )}
                . Hãy xếp thêm nhân viên để đảm bảo vận hành.
              </span>
            </div>
          ) : (
            <div className="hr-week-banner hr-week-banner--ok">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Các ca từ hôm nay trở đi đã đủ người và đủ quyền vận hành.</span>
            </div>
          )}
          <div className="hr-week-scroll">
          <div
            className="hr-grid hr-week-grid"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', alignItems: 'start' }}
          >
            {days.map((day) => {
            const groups = groupedByDay[day] || [];
            const isToday = day === today;
            const isPast = day < today;
            const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);
            return (
              <div
                key={day}
                className={`hr-day-col${isToday ? ' hr-day-col--today' : ''}${
                  isPast ? ' hr-day-col--past' : ''
                }`}
              >
                <div className="hr-day-col__head">
                  <span className="hr-strong">
                    {WEEKDAY_LABEL[weekdayOf(day)]} · {formatDate(day).slice(0, 5)}
                  </span>
                  {isToday ? (
                    <span className="hr-badge hr-badge--info">Hôm nay</span>
                  ) : isPast ? (
                    <span className="hr-badge">Đã qua</span>
                  ) : totalCount > 0 ? (
                    <span className="hr-day-col__total">{totalCount}</span>
                  ) : null}
                </div>
                {groups.length === 0 && !(weekStaffing.perDay[day]?.length) ? (
                  <p className="hr-muted" style={{ fontSize: 12 }}>Chưa xếp ca</p>
                ) : (
                  <div className="hr-shift-groups">
                    {groups.map((g) => {
                      const cov = coverageOf(
                        g.items.map((i) => i.userId),
                        staffById,
                        requiredForShift(g.shiftDefinitionUuid),
                      );
                      const minStaff = shiftById.get(g.shiftDefinitionUuid)?.minStaff ?? 0;
                      const understaffed = minStaff > 0 && g.items.length < minStaff;
                      return (
                      <div key={g.key} className="hr-shift-group">
                        <div className="hr-shift-group__head">
                          <span className="hr-shift-group__name">{g.shiftName}</span>
                          <span
                            className={`hr-shift-group__count${understaffed ? ' hr-shift-group__count--bad' : ''}`}
                            title={understaffed ? `Thiếu người: cần tối thiểu ${minStaff}` : (minStaff > 0 ? `Tối thiểu ${minStaff} người` : undefined)}
                          >
                            {g.items.length}{minStaff > 0 ? `/${minStaff}` : ''}
                          </span>
                        </div>
                        <p className="hr-shift-group__time">
                          {formatTime(g.startTime)}–{formatTime(g.endTime)}
                        </p>
                        {cov && (
                          cov.ok ? (
                            <p className="hr-cover hr-cover--ok" title="Tổng quyền của nhân viên trong ca đã đủ để vận hành">
                              <ShieldCheck className="h-3 w-3" />
                              Đủ quyền vận hành
                            </p>
                          ) : (
                            <p
                              className="hr-cover hr-cover--bad"
                              title={`Ca thiếu quyền: ${cov.missing.map((m) => m.label).join(', ')}. Hãy xếp thêm nhân viên có các quyền này.`}
                            >
                              <ShieldAlert className="h-3 w-3" />
                              Thiếu quyền: {cov.missing.map((m) => m.label).join(', ')}
                            </p>
                          )
                        )}
                        <ul className="hr-emp-list">
                          {g.items.map((a) => {
                            const meta = a.attendanceStatus
                              ? statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus)
                              : null;
                            const locked = isAssignmentLocked(a);
                            const noProfile = staffById.get(a.userId)?.hasSalaryProfile === false;
                            return (
                              <li key={a.uuid} className="hr-emp-row">
                                {a.attendanceStatus && (
                                  <span
                                    className="hr-emp-row__dot"
                                    style={{ background: ATTENDANCE_DOT[a.attendanceStatus] || '#64748b' }}
                                    title={meta?.label}
                                  />
                                )}
                                <span
                                  className="hr-emp-row__name truncate"
                                  title={a.fullName || a.email}
                                >
                                  {a.fullName || a.email}
                                </span>
                                {noProfile && (
                                  <span
                                    className="hr-emp-row__warn"
                                    title="Chưa có hồ sơ lương (hoặc đang tạm ngưng) — sẽ không được tính lương"
                                    aria-label="Chưa có hồ sơ lương"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </span>
                                )}
                                {locked ? (
                                  <span
                                    className="hr-emp-row__lock"
                                    title="Ca đang diễn ra hoặc đã qua — không thể chỉnh sửa"
                                    aria-label="Ca đã khóa"
                                  >
                                    <Lock className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className="hr-emp-row__del"
                                    disabled={deletingId === a.uuid}
                                    onClick={() => handleDelete(a)}
                                    aria-label={`Xóa phân ca ${g.shiftName} của ${a.fullName || a.email}`}
                                    title="Xóa phân ca"
                                  >
                                    {deletingId === a.uuid ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      );
                    })}
                    {(weekStaffing.perDay[day] || []).map((gap) => (
                      <div key={`gap-${gap.uuid}`} className="hr-shift-gap" title={`Ca này cần tối thiểu ${gap.min} người`}>
                        <UserX className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>{gap.name}</strong> · {formatTime(gap.startTime)}–{formatTime(gap.endTime)} — chưa xếp người (cần {gap.min})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
        </>
      )}

      {modalOpen && (
        <AssignModal
          staff={staff}
          shifts={shifts}
          assignments={assignments}
          requiredForShift={requiredForShift}
          fallbackRequired={requiredPerms}
          permLabel={permLabel}
          defaultFrom={rangeFrom}
          defaultTo={rangeTo}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await loadAssignments();
          }}
        />
      )}

      {permConfigOpen && (
        <ShiftPermissionConfigModal
          shifts={shifts}
          allPerms={allPerms}
          onClose={() => setPermConfigOpen(false)}
          onSaved={async () => {
            setPermConfigOpen(false);
            await loadRefData();
          }}
        />
      )}
    </AdminPage>
  );
};

function AssignModal({ staff, shifts, assignments = [], requiredForShift, fallbackRequired, permLabel = {}, defaultFrom, defaultTo, onClose, onSaved }) {
  const confirm = useConfirm();
  const today = todayIso();
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [from, setFrom] = useState(defaultFrom < today ? today : defaultFrom);
  const [to, setTo] = useState(defaultTo < today ? today : defaultTo);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (list, setList, value) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.userId, s])), [staff]);
  const selectedNoProfile = selectedStaff.filter(
    (id) => staffMap.get(id)?.hasSalaryProfile === false,
  );
  // Bộ quyền cần phủ = hợp của bộ quyền các ca đang chọn (fallback bộ mặc định nếu chưa chọn ca).
  const previewRequired = useMemo(() => {
    if (selectedShifts.length === 0) return fallbackRequired;
    const map = new Map();
    selectedShifts.forEach((id) => {
      (requiredForShift(id) || []).forEach((r) => map.set(r.name, r));
    });
    return Array.from(map.values());
  }, [selectedShifts, requiredForShift, fallbackRequired]);
  // Bảng checklist: từng quyền yêu cầu + ai (trong nhóm đang chọn) đang đảm nhận.
  const coverageChecklist = useMemo(
    () => previewRequired.map((r) => {
      const providers = selectedStaff
        .map((id) => staffMap.get(id))
        .filter((s) => s && (s.permissions || []).includes(r.name));
      return { name: r.name, label: r.label, providers, ok: providers.length > 0 };
    }),
    [previewRequired, selectedStaff, staffMap],
  );
  const coveredCount = coverageChecklist.filter((c) => c.ok).length;
  const permTitle = (s) => {
    const perms = s?.permissions || [];
    if (perms.length === 0) return 'Không có quyền vận hành';
    return `Quyền: ${perms.map((p) => permLabel[p] || p).join(', ')}`;
  };

  // Chỉ xếp ca cho hôm nay trở đi — bỏ qua ngày đã qua.
  const validDates = from && to && from <= to
    ? datesBetween(from, to).filter((d) => d >= today)
    : [];
  const dateCount = validDates.length;
  const totalCombos = selectedStaff.length * selectedShifts.length * dateCount;

  // Phát hiện xung đột lịch cho lựa chọn hiện tại (đồng bộ backend): chồng giờ / thiếu nghỉ / vượt giờ.
  const conflictReport = useMemo(() => {
    const shiftByUuid = new Map(shifts.map((s) => [s.uuid, s]));
    const existingByUser = new Map();
    const dupByUser = new Map();
    assignments.forEach((a) => {
      if (!a.startTime) return;
      if (!existingByUser.has(a.userId)) existingByUser.set(a.userId, []);
      existingByUser.get(a.userId).push(shiftInterval(a.workDate, a.startTime, a.endTime));
      if (!dupByUser.has(a.userId)) dupByUser.set(a.userId, new Set());
      dupByUser.get(a.userId).add(`${a.workDate}|${a.shiftDefinitionUuid}`);
    });
    let overlap = 0;
    let rest = 0;
    let dailyHard = 0;
    let dailySoft = 0;
    selectedStaff.forEach((uid) => {
      const running = [...(existingByUser.get(uid) || [])];
      const dup = new Set(dupByUser.get(uid) || []);
      selectedShifts.forEach((sid) => {
        const sh = shiftByUuid.get(sid);
        if (!sh) return;
        validDates.forEach((dt) => {
          const key = `${dt}|${sid}`;
          if (dup.has(key)) return;
          const cand = shiftInterval(dt, sh.startTime, sh.endTime);
          const v = scheduleViolation(running, cand);
          if (v === 'overlap') overlap += 1;
          else if (v === 'rest') rest += 1;
          else if (v === 'dailyHard') dailyHard += 1;
          else {
            if (v === 'dailySoft') dailySoft += 1;
            running.push(cand);
            dup.add(key);
          }
        });
      });
    });
    const blocked = overlap + rest + dailyHard;
    return { overlap, rest, dailyHard, dailySoft, blocked };
  }, [assignments, shifts, selectedStaff, selectedShifts, validDates]);

  const willCreate = Math.max(0, totalCombos - conflictReport.blocked);

  const handleSubmit = async () => {
    if (selectedStaff.length === 0 || selectedShifts.length === 0 || dateCount === 0) {
      notificationService.warning('Vui lòng chọn nhân viên, ca và khoảng ngày hợp lệ (từ hôm nay trở đi).');
      return;
    }
    const ok = await confirm({
      title: 'Xếp ca hàng loạt',
      message: 'Xác nhận tạo lịch ca cho nhân viên đã chọn? Ca trùng lịch sẽ tự bỏ qua.',
      highlight: `${willCreate}/${totalCombos} lượt ca sẽ được tạo`,
      confirmLabel: 'Xếp ca',
      variant: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const created = await hrService.createAssignmentsBulk({
        userIds: selectedStaff,
        shiftDefinitionUuids: selectedShifts,
        workDates: validDates,
        note: note.trim() || undefined,
      });
      notificationService.success(`Đã xếp ${Array.isArray(created) ? created.length : 0} lượt ca.`);
      await onSaved();
    } catch (err) {
      notificationService.error(err?.message || 'Xếp ca thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Xếp ca hàng loạt"
      subtitle="Chọn nhân viên × ca × khoảng ngày. Ca trùng hoặc xung đột lịch (chồng giờ, thiếu nghỉ, quá giờ) sẽ tự bỏ qua."
      size="lg"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span className="hr-muted" style={{ fontSize: 12 }}>
            {totalCombos > 0
              ? (conflictReport.blocked > 0
                ? `${willCreate}/${totalCombos} lượt sẽ được tạo · ${conflictReport.blocked} bị bỏ qua do trùng lịch`
                : `${totalCombos} lượt ca sẽ được tạo`)
              : 'Chưa chọn đủ thông tin'}
          </span>
          <div className="hr-inline">
            <button
              type="button"
              className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm font-medium"
              onClick={onClose}
            >
              Hủy
            </button>
            <PrimaryButton onClick={handleSubmit} loading={saving} disabled={totalCombos === 0}>
              Xếp ca
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="hr-field__label" style={{ marginBottom: 8 }}>
            <Users className="inline h-3.5 w-3.5 mr-1" />
            Nhân viên ({selectedStaff.length})
          </p>
          <div className="hr-check-list">
            {staff.map((s) => {
              const active = selectedStaff.includes(s.userId);
              const noProfile = s.hasSalaryProfile === false;
              const opCount = previewRequired.filter((r) => (s.permissions || []).includes(r.name)).length;
              return (
                <label
                  key={s.userId}
                  className={`hr-check-item${active ? ' hr-check-item--active' : ''}`}
                  title={permTitle(s)}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(selectedStaff, setSelectedStaff, s.userId)}
                  />
                  <span className="truncate">{s.fullName || s.email}</span>
                  {previewRequired.length > 0 && (
                    <span
                      className="hr-perm-count"
                      title={`Đảm nhận ${opCount}/${previewRequired.length} quyền vận hành của ca`}
                    >
                      {opCount}/{previewRequired.length}
                    </span>
                  )}
                  {noProfile && (
                    <span
                      title="Chưa có hồ sơ lương — sẽ không được tính lương"
                      aria-label="Chưa có hồ sơ lương"
                      style={{ display: 'inline-flex', color: '#fbbf24', flexShrink: 0 }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </label>
              );
            })}
            {staff.length === 0 && <p className="hr-muted" style={{ fontSize: 12 }}>Không có nhân viên.</p>}
          </div>

          {(selectedNoProfile.length > 0 || conflictReport.blocked > 0 || conflictReport.dailySoft > 0) && (
            <div className="hr-assign-warn">
              {selectedNoProfile.length > 0 && (
                <p className="hr-cover hr-cover--warn">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {selectedNoProfile.length} nhân viên đã chọn chưa có hồ sơ lương — hãy tạo hồ sơ ở mục “Hồ sơ lương” để được tính lương.
                </p>
              )}
              {conflictReport.blocked > 0 && (
                <p className="hr-cover hr-cover--bad">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {conflictReport.blocked} lượt sẽ bị bỏ qua do trùng lịch:
                  {conflictReport.overlap > 0 && ` ${conflictReport.overlap} chồng giờ;`}
                  {conflictReport.rest > 0 && ` ${conflictReport.rest} chưa đủ nghỉ 8h giữa 2 ca;`}
                  {conflictReport.dailyHard > 0 && ` ${conflictReport.dailyHard} vượt 12h/ngày;`}
                </p>
              )}
              {conflictReport.dailySoft > 0 && (
                <p className="hr-cover hr-cover--warn">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {conflictReport.dailySoft} lượt khiến nhân viên làm trên 8h/ngày (vẫn tạo được, nên cân nhắc).
                </p>
              )}
            </div>
          )}
        </div>

        {previewRequired.length > 0 && (
          <div>
            <p className="hr-field__label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck className="inline h-3.5 w-3.5" />
              Phủ quyền vận hành ca
              <span
                className={`hr-cover-count${coveredCount === previewRequired.length ? ' hr-cover-count--ok' : ' hr-cover-count--miss'}`}
              >
                {coveredCount}/{previewRequired.length}
              </span>
              {selectedShifts.length > 0 && (
                <span className="hr-muted" style={{ fontWeight: 400 }}>· theo ca đang chọn</span>
              )}
            </p>
            <div className="hr-cover-grid">
              {coverageChecklist.map((c) => (
                <div
                  key={c.name}
                  className={`hr-cover-check${c.ok ? ' hr-cover-check--ok' : ' hr-cover-check--miss'}`}
                >
                  {c.ok
                    ? <CheckCircle2 className="h-4 w-4" style={{ flexShrink: 0 }} />
                    : <Circle className="h-4 w-4" style={{ flexShrink: 0 }} />}
                  <span className="hr-cover-check__label">{c.label}</span>
                  <span className="hr-cover-check__by">
                    {c.ok ? c.providers.map((p) => p.fullName || p.email).join(', ') : 'Chưa ai đảm nhận'}
                  </span>
                </div>
              ))}
            </div>
            {selectedStaff.length === 0 && (
              <p className="hr-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Chọn nhân viên để hệ thống kiểm tra tổng quyền của ca đã đủ chưa.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="hr-field__label" style={{ marginBottom: 8 }}>Ca làm ({selectedShifts.length})</p>
          <div className="hr-inline">
            {shifts.map((sh) => {
              const active = selectedShifts.includes(sh.uuid);
              return (
                <button
                  key={sh.uuid}
                  type="button"
                  className={`hr-check-item${active ? ' hr-check-item--active' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggle(selectedShifts, setSelectedShifts, sh.uuid)}
                >
                  {sh.name} ({formatTime(sh.startTime)}–{formatTime(sh.endTime)})
                </button>
              );
            })}
          </div>
        </div>

        <div className="hr-inline" style={{ alignItems: 'flex-end' }}>
          <div className="hr-field" style={{ minWidth: 170 }}>
            <AdminDatePicker label="Từ ngày" value={from} onChange={setFrom} min={today} size="sm" max={to || undefined} />
          </div>
          <div className="hr-field" style={{ minWidth: 170 }}>
            <AdminDatePicker label="Đến ngày" value={to} onChange={setTo} min={from || today} size="sm" />
          </div>
        </div>

        <div className="hr-field">
          <label className="hr-field__label">Ghi chú (tuỳ chọn)</label>
          <textarea
            className={adminTextareaClass}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: tăng cường dịp lễ..."
          />
        </div>
      </div>
    </AdminModal>
  );
}

function ShiftPermissionConfigModal({ shifts, allPerms, onClose, onSaved }) {
  const confirm = useConfirm();
  const groups = useMemo(() => {
    const m = new Map();
    allPerms.forEach((p) => {
      if (!m.has(p.group)) m.set(p.group, []);
      m.get(p.group).push(p);
    });
    return Array.from(m.entries());
  }, [allPerms]);

  const [sel, setSel] = useState(() => {
    const init = {};
    shifts.forEach((sh) => { init[sh.uuid] = new Set(sh.requiredPermissions || []); });
    return init;
  });
  const [minStaff, setMinStaff] = useState(() => {
    const init = {};
    shifts.forEach((sh) => { init[sh.uuid] = sh.minStaff ?? 1; });
    return init;
  });
  const [savingId, setSavingId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const togglePerm = (shiftUuid, name) => {
    setSel((prev) => {
      const next = { ...prev };
      const s = new Set(next[shiftUuid]);
      if (s.has(name)) s.delete(name);
      else s.add(name);
      next[shiftUuid] = s;
      return next;
    });
  };

  const setMin = (shiftUuid, value) => {
    const n = Math.max(0, Math.min(50, Number(value) || 0));
    setMinStaff((prev) => ({ ...prev, [shiftUuid]: n }));
  };

  const saveShift = async (sh) => {
    const ok = await confirm({
      title: 'Lưu cấu hình ca',
      message: 'Lưu thay đổi quyền và số nhân viên tối thiểu cho ca này?',
      highlight: sh.name,
      confirmLabel: 'Lưu cấu hình',
      variant: 'warning',
    });
    if (!ok) return;

    setSavingId(sh.uuid);
    try {
      const res = await hrService.updateShiftConfig(sh.uuid, {
        permissions: Array.from(sel[sh.uuid] || []),
        minStaff: minStaff[sh.uuid] ?? 1,
      });
      // Đồng bộ lại theo bộ hiệu lực server trả (nếu bỏ chọn hết -> server áp bộ mặc định).
      setSel((prev) => ({ ...prev, [sh.uuid]: new Set(res?.requiredPermissions || []) }));
      setMinStaff((prev) => ({ ...prev, [sh.uuid]: res?.minStaff ?? prev[sh.uuid] }));
      notificationService.success(`Đã lưu cấu hình ca ${sh.name}.`);
      setDirty(true);
    } catch (err) {
      notificationService.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingId(null);
    }
  };

  const resetShift = async (sh) => {
    const ok = await confirm({
      title: 'Khôi phục quyền mặc định',
      message: 'Đặt lại quyền vận hành của ca về bộ mặc định?',
      highlight: sh.name,
      confirmLabel: 'Khôi phục',
      variant: 'warning',
    });
    if (!ok) return;

    setSavingId(sh.uuid);
    try {
      const res = await hrService.updateShiftConfig(sh.uuid, { permissions: [], minStaff: minStaff[sh.uuid] ?? 1 });
      setSel((prev) => ({ ...prev, [sh.uuid]: new Set(res?.requiredPermissions || []) }));
      notificationService.success(`Ca ${sh.name} đã khôi phục bộ quyền mặc định.`);
      setDirty(true);
    } catch (err) {
      notificationService.error(err?.message || 'Khôi phục thất bại.');
    } finally {
      setSavingId(null);
    }
  };

  const close = () => (dirty ? onSaved() : onClose());

  return (
    <AdminModal
      open
      onClose={close}
      title="Cấu hình ca làm việc"
      subtitle="Đặt số nhân viên tối thiểu và bộ quyền vận hành cho mỗi ca. Bỏ chọn hết quyền = dùng bộ mặc định; số tối thiểu = 0 để tắt cảnh báo."
      size="lg"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <PrimaryButton onClick={close}>Xong</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        {shifts.map((sh) => (
          <div key={sh.uuid} className="hr-card">
            <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span className="hr-strong">
                {sh.name}{' '}
                <span className="hr-muted" style={{ fontSize: 12 }}>
                  ({formatTime(sh.startTime)}–{formatTime(sh.endTime)})
                </span>
                {sh.usingDefaultPermissions && (
                  <span className="hr-badge" style={{ marginLeft: 8 }}>Mặc định</span>
                )}
              </span>
              <div className="hr-inline" style={{ gap: 10 }}>
                <label className="hr-inline" style={{ gap: 6, fontSize: 12 }}>
                  <span className="hr-muted">Tối thiểu</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={minStaff[sh.uuid] ?? 1}
                    onChange={(e) => setMin(sh.uuid, e.target.value)}
                    className="hr-minstaff-input"
                  />
                  <span className="hr-muted">người</span>
                </label>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost px-3 py-1.5 rounded-md cursor-pointer text-xs font-semibold"
                  onClick={() => resetShift(sh)}
                  disabled={savingId === sh.uuid}
                >
                  Khôi phục mặc định
                </button>
                <PrimaryButton onClick={() => saveShift(sh)} loading={savingId === sh.uuid}>
                  Lưu
                </PrimaryButton>
              </div>
            </div>
            {groups.map(([groupName, perms]) => (
              <div key={groupName} style={{ marginBottom: 6 }}>
                <p className="hr-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', margin: '4px 0' }}>
                  {groupName}
                </p>
                <div className="hr-inline" style={{ flexWrap: 'wrap', gap: 6 }}>
                  {perms.map((p) => {
                    const checked = sel[sh.uuid]?.has(p.name);
                    return (
                      <label
                        key={p.name}
                        className={`hr-check-item${checked ? ' hr-check-item--active' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <input type="checkbox" checked={!!checked} onChange={() => togglePerm(sh.uuid, p.name)} />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
        {shifts.length === 0 && <p className="hr-muted" style={{ fontSize: 12 }}>Không có ca làm việc.</p>}
      </div>
    </AdminModal>
  );
}

export default HrSchedulePage;
