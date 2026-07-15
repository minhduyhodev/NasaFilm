import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { AdminPage, AdminModal, PageHeader, PrimaryButton } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
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

const HrSchedulePage = () => {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso());
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
        <button
          type="button"
          className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
          onClick={() => setPermConfigOpen(true)}
          title="Cấu hình bộ quyền vận hành yêu cầu cho từng ca"
        >
          <ShieldCheck className="h-4 w-4" />
          Cấu hình quyền ca
        </button>
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
                    {groups.map((g) => {
                      const cov = coverageOf(
                        g.items.map((i) => i.userId),
                        staffById,
                        requiredForShift(g.shiftDefinitionUuid),
                      );
                      return (
                      <div key={g.key} className="hr-shift-group">
                        <div className="hr-shift-group__head">
                          <span className="hr-shift-group__name">{g.shiftName}</span>
                          <span className="hr-shift-group__count">{g.items.length}</span>
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
          requiredForShift={requiredForShift}
          fallbackRequired={requiredPerms}
          permLabel={permLabel}
          defaultFrom={weekStart}
          defaultTo={weekEnd}
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

function AssignModal({ staff, shifts, requiredForShift, fallbackRequired, permLabel = {}, defaultFrom, defaultTo, onClose, onSaved }) {
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

          {selectedNoProfile.length > 0 && (
            <div className="hr-assign-warn">
              <p className="hr-cover hr-cover--warn">
                <AlertTriangle className="h-3.5 w-3.5" />
                {selectedNoProfile.length} nhân viên đã chọn chưa có hồ sơ lương — hãy tạo hồ sơ ở mục “Hồ sơ lương” để được tính lương.
              </p>
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

function ShiftPermissionConfigModal({ shifts, allPerms, onClose, onSaved }) {
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

  const saveShift = async (sh) => {
    setSavingId(sh.uuid);
    try {
      const res = await hrService.updateShiftRequiredPermissions(sh.uuid, Array.from(sel[sh.uuid] || []));
      // Đồng bộ lại theo bộ hiệu lực server trả (nếu bỏ chọn hết -> server áp bộ mặc định).
      setSel((prev) => ({ ...prev, [sh.uuid]: new Set(res?.requiredPermissions || []) }));
      notificationService.success(`Đã lưu quyền yêu cầu cho ca ${sh.name}.`);
      setDirty(true);
    } catch (err) {
      notificationService.error(err?.message || 'Lưu thất bại.');
    } finally {
      setSavingId(null);
    }
  };

  const resetShift = async (sh) => {
    setSavingId(sh.uuid);
    try {
      const res = await hrService.updateShiftRequiredPermissions(sh.uuid, []);
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
      title="Cấu hình quyền vận hành theo ca"
      subtitle="Tổng quyền của nhân viên trong mỗi ca phải phủ đủ bộ quyền này. Bỏ chọn hết = dùng bộ mặc định."
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
              <div className="hr-inline">
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
