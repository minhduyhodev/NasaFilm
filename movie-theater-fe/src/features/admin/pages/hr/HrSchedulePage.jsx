import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Lock, Trash2, Users } from 'lucide-react';
import { AdminPage, AdminModal, PageHeader, PrimaryButton } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import {
  ATTENDANCE_STATUS_META,
  addDaysIso,
  formatDate,
  formatTime,
  startOfWeekIso,
  statusBadge,
  todayIso,
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
  const start = new Date(`${a.workDate}T${a.startTime || '00:00:00'}`);
  if (Number.isNaN(start.getTime())) return false;
  return Date.now() >= start.getTime();
}

const HrSchedulePage = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const weekEnd = useMemo(() => addDaysIso(weekStart, 6), [weekStart]);

  const loadRefData = useCallback(async () => {
    try {
      const [staffList, shiftList] = await Promise.all([
        hrService.getStaffDirectory(),
        hrService.getShiftDefinitions(),
      ]);
      setStaff(Array.isArray(staffList) ? staffList : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải danh mục.');
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getAssignments({
        from: weekStart,
        to: weekEnd,
        userId: userFilter || undefined,
      });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải lịch ca.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, userFilter]);

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
    if (!window.confirm(`Xóa phân ca "${assignment.shiftName}" của ${assignment.fullName || assignment.email}?`)) {
      return;
    }
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
        <div className="hr-field" style={{ minWidth: 220 }}>
          <AdminSelectDropdown
            label="Nhân viên"
            value={userFilter}
            options={staffOptions}
            onChange={setUserFilter}
            size="sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải lịch ca...</p>
        </div>
      ) : (
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
                {groups.length === 0 ? (
                  <p className="hr-muted" style={{ fontSize: 12 }}>Chưa xếp ca</p>
                ) : (
                  <div className="hr-shift-groups">
                    {groups.map((g) => (
                      <div key={g.key} className="hr-shift-group">
                        <div className="hr-shift-group__head">
                          <span className="hr-shift-group__name">{g.shiftName}</span>
                          <span className="hr-shift-group__count">{g.items.length}</span>
                        </div>
                        <p className="hr-shift-group__time">
                          {formatTime(g.startTime)}–{formatTime(g.endTime)}
                        </p>
                        <ul className="hr-emp-list">
                          {g.items.map((a) => {
                            const meta = a.attendanceStatus
                              ? statusBadge(ATTENDANCE_STATUS_META, a.attendanceStatus)
                              : null;
                            const locked = isAssignmentLocked(a);
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {modalOpen && (
        <AssignModal
          staff={staff}
          shifts={shifts}
          defaultFrom={weekStart}
          defaultTo={weekEnd}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await loadAssignments();
          }}
        />
      )}
    </AdminPage>
  );
};

function AssignModal({ staff, shifts, defaultFrom, defaultTo, onClose, onSaved }) {
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

  // Chỉ xếp ca cho hôm nay trở đi — bỏ qua ngày đã qua.
  const validDates = from && to && from <= to
    ? datesBetween(from, to).filter((d) => d >= today)
    : [];
  const dateCount = validDates.length;
  const totalCombos = selectedStaff.length * selectedShifts.length * dateCount;

  const handleSubmit = async () => {
    if (selectedStaff.length === 0 || selectedShifts.length === 0 || dateCount === 0) {
      notificationService.warning('Vui lòng chọn nhân viên, ca và khoảng ngày hợp lệ (từ hôm nay trở đi).');
      return;
    }
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
      subtitle="Chọn nhân viên × ca × khoảng ngày. Các phân ca trùng sẽ tự bỏ qua."
      size="lg"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span className="hr-muted" style={{ fontSize: 12 }}>
            {totalCombos > 0 ? `${totalCombos} lượt ca sẽ được tạo` : 'Chưa chọn đủ thông tin'}
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
              return (
                <label key={s.userId} className={`hr-check-item${active ? ' hr-check-item--active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(selectedStaff, setSelectedStaff, s.userId)}
                  />
                  <span className="truncate">{s.fullName || s.email}</span>
                </label>
              );
            })}
            {staff.length === 0 && <p className="hr-muted" style={{ fontSize: 12 }}>Không có nhân viên.</p>}
          </div>
        </div>

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
          <div className="hr-field">
            <label className="hr-field__label">Từ ngày</label>
            <input type="date" className={adminInputClass} min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="hr-field">
            <label className="hr-field__label">Đến ngày</label>
            <input type="date" className={adminInputClass} min={today} value={to} onChange={(e) => setTo(e.target.value)} />
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

export default HrSchedulePage;
