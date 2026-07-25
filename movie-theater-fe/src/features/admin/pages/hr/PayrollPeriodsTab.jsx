import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
} from 'lucide-react';
import { AdminModal, PrimaryButton } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import {
  PAYROLL_STATUS_META,
  PAYSLIP_STATUS_META,
  formatDate,
  formatMinutes,
  formatMoney,
  statusBadge,
  statusVariant,
} from './hrUtils';
import { StatusBadge, AdminTableShell } from '../../components';

const now = new Date();

const WORKFLOW_STEPS = [
  { id: 'OPEN', label: 'Mở kỳ' },
  { id: 'GENERATED', label: 'Sinh phiếu' },
  { id: 'APPROVED', label: 'Duyệt kỳ' },
  { id: 'PAID', label: 'Chi trả' },
];

const workflowIndex = (status) => WORKFLOW_STEPS.findIndex((s) => s.id === status);

function PayrollWorkflow({ status }) {
  const currentIdx = workflowIndex(status);
  return (
    <div className="hr-workflow" aria-label="Luồng kỳ lương">
      {WORKFLOW_STEPS.map((step, idx) => {
        const done = currentIdx > idx;
        const current = currentIdx === idx;
        return (
          <div key={step.id} className="hr-workflow__step-wrap" style={{ display: 'contents' }}>
            <div className={`hr-workflow__step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
              <span className="hr-workflow__dot">{done ? '✓' : idx + 1}</span>
              <span className="hr-workflow__label">{step.label}</span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <span className={`hr-workflow__line${done ? ' is-done' : ''}`} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PayrollAlert({ variant, icon: Icon, title, children, action }) {
  return (
    <div className={`hr-alert hr-alert--${variant}`}>
      <Icon className="hr-alert__icon h-5 w-5" style={{ flexShrink: 0 }} />
      <div className="hr-alert__body">
        <p className="hr-alert__title">{title}</p>
        <div className="hr-alert__text">{children}</div>
      </div>
      {action && <div className="hr-alert__action">{action}</div>}
    </div>
  );
}

const PayrollPeriodsTab = ({ staff }) => {
  const [periods, setPeriods] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const confirm = useConfirm();

  const selected = useMemo(
    () => periods.find((p) => p.uuid === selectedId) || null,
    [periods, selectedId],
  );

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrService.getPayrollPeriods();
      const list = Array.isArray(data) ? data : [];
      setPeriods(list);
      setSelectedId((prev) => prev || (list[0]?.uuid ?? null));
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải kỳ lương.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (periodId) => {
    if (!periodId) {
      setPayslips([]);
      setAdjustments([]);
      return;
    }
    setDetailLoading(true);
    try {
      const [slips, adjs] = await Promise.all([
        hrService.getPayslips(periodId),
        hrService.getAdjustments(periodId),
      ]);
      setPayslips(Array.isArray(slips) ? slips : []);
      setAdjustments(Array.isArray(adjs) ? adjs : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải chi tiết kỳ lương.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const refreshAll = async () => {
    await loadPeriods();
    await loadDetail(selectedId);
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      const result = await fn();
      notificationService.success(
        typeof successMsg === 'function' ? successMsg(result) : successMsg,
      );
      await refreshAll();
    } catch (err) {
      notificationService.error(err?.message || 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const staffName = (userId) => {
    const s = staff.find((x) => x.userId === userId);
    return s ? s.fullName || s.email : userId;
  };

  const canEditAdjust = selected && (selected.status === 'OPEN' || selected.status === 'GENERATED');

  const canDeletePeriod =
    selected &&
    ((selected.payslipCount ?? 0) === 0 ||
      selected.status === 'OPEN' ||
      selected.status === 'GENERATED');

  const handleDeletePeriod = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Xóa kỳ lương',
      message: 'Bạn có chắc muốn xóa kỳ lương này không?',
      highlight: `Kỳ ${selected.label}`,
      detail: 'Toàn bộ phiếu lương nháp và khoản thưởng/khấu trừ của kỳ này sẽ bị xóa và không thể khôi phục.',
      confirmLabel: 'Xóa kỳ',
      variant: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await hrService.deletePayrollPeriod(selected.uuid);
      notificationService.success('Đã xóa kỳ lương.');
      const data = await hrService.getPayrollPeriods();
      const list = Array.isArray(data) ? data : [];
      setPeriods(list);
      setSelectedId(list[0]?.uuid ?? null);
    } catch (err) {
      notificationService.error(err?.message || 'Xóa kỳ lương thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!selected) return;
    const regenerate = selected.status === 'GENERATED';
    const periodNotEnded = selected.endDate && new Date(`${selected.endDate}T23:59:59+07:00`).getTime() > Date.now();
    const notes = [];
    if ((selected.pendingAttendanceCount ?? 0) > 0) {
      notes.push(`Còn ${selected.pendingAttendanceCount} chấm công CHƯA DUYỆT trong kỳ — các công này sẽ KHÔNG được tính vào phiếu. Nên duyệt hết chấm công trước khi sinh.`);
    }
    if (periodNotEnded) {
      notes.push(`Kỳ lương chưa kết thúc (đến ${formatDate(selected.endDate)}). Chấm công duyệt sau thời điểm sinh sẽ không tự cập nhật — cần sinh lại phiếu.`);
    }
    const ok = await confirm({
      title: regenerate ? 'Sinh lại phiếu lương' : 'Sinh phiếu lương',
      message: regenerate
        ? 'Sinh lại sẽ xóa toàn bộ phiếu lương nháp hiện tại và tính lại từ công đã duyệt. Tiếp tục?'
        : 'Hệ thống sẽ tính phiếu lương từ các bản ghi chấm công đã duyệt trong kỳ. Tiếp tục?',
      highlight: `Kỳ ${selected.label}`,
      detail: notes.length > 0 ? notes.join(' ') : undefined,
      confirmLabel: regenerate ? 'Sinh lại' : 'Sinh phiếu',
      variant: regenerate ? 'warning' : 'default',
    });
    if (!ok) return;
    await runAction(
      () => hrService.generatePayroll(selected.uuid),
      (p) => `Đã sinh ${p?.payslipCount ?? 0} phiếu lương nháp.`,
    );
  };

  const handleApprovePayroll = async () => {
    if (!selected) return;
    const warnings = [];
    if (selected.stale) {
      warnings.push('Kỳ đã lỗi thời (có chấm công duyệt sau khi sinh phiếu) — nên Sinh lại phiếu trước.');
    }
    if ((selected.pendingAttendanceCount ?? 0) > 0) {
      warnings.push(`Còn ${selected.pendingAttendanceCount} chấm công chưa duyệt — sẽ không được tính vào kỳ này.`);
    }
    if ((selected.warningCount ?? 0) > 0) {
      warnings.push(`${selected.warningCount} phiếu cần rà soát (thiếu đơn giá lương hoặc thực nhận âm).`);
    }
    const ok = await confirm({
      title: 'Duyệt kỳ lương',
      message: 'Sau khi duyệt, các phiếu lương sẽ được chốt và chuyển sang trạng thái chờ chi trả. Bạn không thể thêm/sửa thưởng-khấu trừ nữa. Tiếp tục?',
      highlight: `Kỳ ${selected.label} · Tổng thực chi ${formatMoney(selected.totalNetPay)}`,
      detail: warnings.length > 0 ? warnings.join(' ') : undefined,
      confirmLabel: 'Duyệt kỳ lương',
      variant: 'warning',
    });
    if (!ok) return;
    await runAction(() => hrService.approvePayroll(selected.uuid), 'Đã duyệt kỳ lương.');
  };

  const handlePayPayroll = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Xác nhận chi trả lương',
      message: 'Xác nhận đã chi trả toàn bộ phiếu lương của kỳ này? Đây là hành động tài chính và không thể hoàn tác.',
      highlight: `Kỳ ${selected.label} · Tổng thực chi ${formatMoney(selected.totalNetPay)}`,
      detail: `${selected.payslipCount ?? 0} phiếu lương sẽ được đánh dấu ĐÃ CHI TRẢ.`,
      confirmLabel: 'Xác nhận chi trả',
      variant: 'danger',
    });
    if (!ok) return;
    await runAction(() => hrService.payPayroll(selected.uuid), 'Đã chi trả kỳ lương.');
  };

  const handleDeleteAdjustment = async (adj) => {
    const ok = await confirm({
      title: 'Xóa khoản điều chỉnh',
      message: 'Bạn có chắc muốn xóa khoản này không?',
      highlight: `${adj.type === 'BONUS' ? 'Thưởng' : 'Khấu trừ'} ${formatMoney(adj.amount)} · ${staffName(adj.userId)}`,
      detail: 'Phiếu lương nháp của nhân viên sẽ được tính lại.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    await runAction(() => hrService.deleteAdjustment(adj.uuid), 'Đã xóa khoản điều chỉnh.');
  };

  return (
    <div>
      <div className="hr-toolbar-split">
        <span className="hr-muted" style={{ fontSize: 13 }}>
          {periods.length} kỳ lương · chọn kỳ để sinh phiếu, duyệt và chi trả
        </span>
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <CalendarPlus className="h-4 w-4" />
          Tạo kỳ lương
        </PrimaryButton>
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải...</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="hr-state">
          <Wallet className="h-9 w-9 text-slate-500" />
          <p>Chưa có kỳ lương nào. Hãy tạo kỳ lương theo tháng.</p>
        </div>
      ) : (
        <div className="hr-payroll-layout">
          <div className="hr-period-list">
            {periods.map((p) => {
              const meta = statusBadge(PAYROLL_STATUS_META, p.status);
              const active = p.uuid === selectedId;
              const hasWarn = (p.warningCount ?? 0) > 0;
              const hasPending = (p.pendingAttendanceCount ?? 0) > 0
                && (p.status === 'OPEN' || p.status === 'GENERATED');
              return (
                <button
                  key={p.uuid}
                  type="button"
                  className={`hr-period-card${active ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(p.uuid)}
                >
                  <div className="hr-period-card__row">
                    <span className="hr-strong">Kỳ {p.label}</span>
                    <span className="hr-inline" style={{ gap: 6 }}>
                      {!p.stale && !hasWarn && !hasPending ? null : (
                        <AlertTriangle
                          className="h-4 w-4"
                          style={{ color: hasWarn ? '#f87171' : p.stale ? '#fbbf24' : '#38bdf8' }}
                          title={
                            hasWarn
                              ? `${p.warningCount} phiếu cần rà soát`
                              : p.stale
                                ? 'Phiếu lương đã lỗi thời — cần sinh lại'
                                : `${p.pendingAttendanceCount} chấm công chưa duyệt`
                          }
                        />
                      )}
                      <StatusBadge variant={statusVariant(PAYROLL_STATUS_META, p.status)}>
                        {meta.label}
                      </StatusBadge>
                    </span>
                  </div>
                  <p className="hr-period-card__meta">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                  <div className="hr-period-card__foot">
                    <span className="hr-muted" style={{ fontSize: 12 }}>{p.payslipCount} phiếu</span>
                    <span className="hr-strong" style={{ fontSize: 13 }}>{formatMoney(p.totalNetPay)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            {selected && (
              <>
                <PayrollWorkflow status={selected.status} />

                <div className="hr-kpi-grid">
                  <article className="hr-kpi-card hr-kpi-card--accent">
                    <span className="hr-kpi-card__label">Tổng thực chi</span>
                    <span className="hr-kpi-card__value" style={{ fontSize: 18 }}>{formatMoney(selected.totalNetPay)}</span>
                  </article>
                  <article className="hr-kpi-card">
                    <span className="hr-kpi-card__label">Phiếu lương</span>
                    <span className="hr-kpi-card__value">{selected.payslipCount ?? 0}</span>
                  </article>
                  <article className="hr-kpi-card hr-kpi-card--warn">
                    <span className="hr-kpi-card__label">Chấm công chưa duyệt</span>
                    <span className="hr-kpi-card__value">{selected.pendingAttendanceCount ?? 0}</span>
                  </article>
                  <article className="hr-kpi-card">
                    <span className="hr-kpi-card__label">Cần rà soát</span>
                    <span className="hr-kpi-card__value">{selected.warningCount ?? 0}</span>
                  </article>
                </div>

                <div className="hr-card" style={{ marginBottom: 16 }}>
                  <div className="hr-detail-head">
                    <div>
                      <h3 className="hr-detail-head__title">Kỳ lương {selected.label}</h3>
                      <p className="hr-detail-head__sub">
                        {formatDate(selected.startDate)} – {formatDate(selected.endDate)}
                      </p>
                    </div>
                    <div className="hr-row-actions">
                      {(selected.status === 'OPEN' || selected.status === 'GENERATED') && (
                        <PrimaryButton loading={busy} onClick={handleGenerate}>
                          {selected.status === 'GENERATED' ? 'Sinh lại phiếu' : 'Sinh phiếu lương'}
                        </PrimaryButton>
                      )}
                      {selected.status === 'GENERATED' && (
                        <PrimaryButton loading={busy} onClick={handleApprovePayroll}>
                          <BadgeCheck className="h-4 w-4" />
                          Duyệt
                        </PrimaryButton>
                      )}
                      {selected.status === 'APPROVED' && (
                        <PrimaryButton loading={busy} onClick={handlePayPayroll}>
                          <CheckCircle2 className="h-4 w-4" />
                          Chi trả
                        </PrimaryButton>
                      )}
                      {canDeletePeriod && (
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost px-3 py-2 rounded-md cursor-pointer text-sm font-semibold inline-flex items-center gap-1.5"
                          style={{ color: '#f87171' }}
                          disabled={busy}
                          onClick={handleDeletePeriod}
                          title="Xóa kỳ lương"
                        >
                          <Trash2 className="h-4 w-4" />
                          Xóa kỳ
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(selected.pendingAttendanceCount ?? 0) > 0 && (selected.status === 'OPEN' || selected.status === 'GENERATED') && (
                  <PayrollAlert variant="info" icon={AlertTriangle} title={`${selected.pendingAttendanceCount} chấm công chưa duyệt trong kỳ`}>
                    Các bản ghi này <b>sẽ không được tính</b> vào phiếu lương. Duyệt hết chấm công rồi sinh hoặc sinh lại phiếu.
                    {' '}
                    <Link className="hr-link" to="/admin/hr/attendance">Mở duyệt chấm công →</Link>
                  </PayrollAlert>
                )}

                {selected.stale && (
                  <PayrollAlert
                    variant="warn"
                    icon={AlertTriangle}
                    title="Phiếu lương đã lỗi thời"
                    action={
                      (selected.status === 'OPEN' || selected.status === 'GENERATED') ? (
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost px-3 py-1.5 rounded-md cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
                          style={{ color: '#fbbf24' }}
                          disabled={busy}
                          onClick={handleGenerate}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sinh lại
                        </button>
                      ) : null
                    }
                  >
                    Có chấm công được duyệt <b>sau khi</b> sinh phiếu. Nhấn <b>Sinh lại phiếu</b> trước khi duyệt kỳ lương.
                  </PayrollAlert>
                )}

                {(selected.warningCount ?? 0) > 0 && (
                  <PayrollAlert variant="danger" icon={AlertTriangle} title={`${selected.warningCount} phiếu cần rà soát`}>
                    Một số phiếu <b>chưa có đơn giá lương</b> hoặc có <b>thực nhận âm</b>. Kiểm tra tab Hồ sơ lương trước khi duyệt.
                  </PayrollAlert>
                )}

                {detailLoading ? (
                  <div className="hr-state">
                    <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                    <p>Đang tải chi tiết...</p>
                  </div>
                ) : (
                  <>
                    {/* Phiếu lương */}
                    <div className="hr-section-head">
                      <p className="hr-section-head__title">Phiếu lương ({payslips.length})</p>
                    </div>
                    {payslips.length === 0 ? (
                      <div className="hr-state" style={{ padding: 32 }}>
                        <p>Chưa có phiếu lương. Nhấn “Sinh phiếu lương” để tính từ công đã duyệt.</p>
                      </div>
                    ) : (
                      <AdminTableShell>
                        <table className="adm-table hr-table">
                          <thead>
                            <tr>
                              <th>Nhân viên</th>
                              <th>Giờ công</th>
                              <th>OT (giờ)</th>
                              <th>Đơn giá</th>
                              <th>Lương cơ bản</th>
                              <th>Lương OT</th>
                              <th>Thưởng</th>
                              <th>Khấu trừ</th>
                              <th>Thực nhận</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payslips.map((slip) => {
                              const missing = slip.salaryConfigMissing;
                              const negative = Number(slip.netPay) < 0;
                              const warn = missing || negative;
                              return (
                                <tr
                                  key={slip.uuid}
                                  className={warn ? 'hr-row-warn' : undefined}
                                >
                                  <td className="hr-strong">
                                    {slip.fullName || slip.email}
                                    {missing && (
                                      <span
                                        className="hr-badge hr-badge--danger"
                                        style={{ marginLeft: 6 }}
                                        title="Nhân viên chưa có đơn giá lương hợp lệ (chưa cấu hình / tạm ngưng)"
                                      >
                                        Thiếu cấu hình
                                      </span>
                                    )}
                                    {negative && (
                                      <span
                                        className="hr-badge hr-badge--warning"
                                        style={{ marginLeft: 6 }}
                                        title="Khấu trừ lớn hơn tổng lương"
                                      >
                                        Thực nhận âm
                                      </span>
                                    )}
                                  </td>
                                  <td className="hr-num">{formatMinutes(slip.regularMinutes)}</td>
                                  <td className="hr-num">{formatMinutes(slip.otMinutes)}</td>
                                  <td className="hr-num">{formatMoney(slip.hourlyRate)}</td>
                                  <td className="hr-num">{formatMoney(slip.regularPay)}</td>
                                  <td className="hr-num">{formatMoney(slip.otPay)}</td>
                                  <td className="hr-num" style={{ color: '#34d399' }}>{formatMoney(slip.bonusTotal)}</td>
                                  <td className="hr-num" style={{ color: '#f87171' }}>{formatMoney(slip.deductionTotal)}</td>
                                  <td className="hr-num hr-strong" style={negative ? { color: '#f87171' } : undefined}>
                                    {formatMoney(slip.netPay)}
                                  </td>
                                  <td>
                                    <StatusBadge variant={statusVariant(PAYSLIP_STATUS_META, slip.status)}>
                                      {statusBadge(PAYSLIP_STATUS_META, slip.status).label}
                                    </StatusBadge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </AdminTableShell>
                    )}

                    {/* Thưởng / khấu trừ */}
                    <div className="hr-section-head">
                      <p className="hr-section-head__title">Thưởng & khấu trừ ({adjustments.length})</p>
                      {canEditAdjust && (
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost px-3 py-1.5 rounded-md cursor-pointer text-xs font-semibold inline-flex items-center gap-1.5"
                          onClick={() => setAdjustOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Thêm khoản
                        </button>
                      )}
                    </div>
                    {adjustments.length === 0 ? (
                      <p className="hr-muted" style={{ fontSize: 13 }}>Chưa có khoản thưởng/khấu trừ nào.</p>
                    ) : (
                      <AdminTableShell>
                        <table className="adm-table hr-table">
                          <thead>
                            <tr>
                              <th>Nhân viên</th>
                              <th>Loại</th>
                              <th>Số tiền</th>
                              <th>Lý do</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {adjustments.map((adj) => (
                              <tr key={adj.uuid}>
                                <td>{staffName(adj.userId)}</td>
                                <td>
                                  {adj.type === 'BONUS' ? (
                                    <StatusBadge variant="success">Thưởng</StatusBadge>
                                  ) : (
                                    <StatusBadge variant="danger">Khấu trừ</StatusBadge>
                                  )}
                                </td>
                                <td className="hr-num">{formatMoney(adj.amount)}</td>
                                <td>{adj.reason}</td>
                                <td>
                                  {canEditAdjust && (
                                    <button
                                      type="button"
                                      className="hr-action-btn hr-action-btn--reject"
                                      title="Xóa"
                                      disabled={busy}
                                      onClick={() => handleDeleteAdjustment(adj)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </AdminTableShell>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {createOpen && (
        <CreatePeriodModal
          onClose={() => setCreateOpen(false)}
          onSaved={async (created) => {
            setCreateOpen(false);
            await loadPeriods();
            if (created?.uuid) setSelectedId(created.uuid);
          }}
        />
      )}

      {adjustOpen && selected && (
        <AdjustmentModal
          periodId={selected.uuid}
          staff={staff}
          onClose={() => setAdjustOpen(false)}
          onSaved={async () => {
            setAdjustOpen(false);
            await refreshAll();
          }}
        />
      )}
    </div>
  );
};

function CreatePeriodModal({ onClose, onSaved }) {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState(false);

  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: y, label: String(y) };
  });
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const created = await hrService.createPayrollPeriod({ year, month });
      notificationService.success('Đã tạo kỳ lương.');
      await onSaved(created);
    } catch (err) {
      notificationService.error(err?.message || 'Tạo kỳ lương thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Tạo kỳ lương"
      subtitle="Mỗi tháng chỉ có một kỳ lương duy nhất."
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm" onClick={onClose}>
            Hủy
          </button>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Tạo kỳ lương</PrimaryButton>
        </div>
      }
    >
      <div className="hr-inline" style={{ alignItems: 'flex-end' }}>
        <div className="hr-field" style={{ minWidth: 140 }}>
          <AdminSelectDropdown label="Năm" value={year} options={yearOptions} onChange={setYear} />
        </div>
        <div className="hr-field" style={{ minWidth: 160 }}>
          <AdminSelectDropdown label="Tháng" value={month} options={monthOptions} onChange={setMonth} />
        </div>
      </div>
    </AdminModal>
  );
}

function AdjustmentModal({ periodId, staff, onClose, onSaved }) {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('BONUS');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const staffOptions = staff.map((s) => ({ value: s.userId, label: s.fullName || s.email }));

  const handleSubmit = async () => {
    if (!userId || !amount || Number(amount) <= 0 || !reason.trim()) {
      notificationService.warning('Vui lòng chọn nhân viên, nhập số tiền và lý do.');
      return;
    }
    setSaving(true);
    try {
      await hrService.addAdjustment({
        payrollPeriodUuid: periodId,
        userId,
        type,
        amount: Number(amount),
        reason: reason.trim(),
      });
      notificationService.success('Đã thêm khoản điều chỉnh.');
      await onSaved();
    } catch (err) {
      notificationService.error(err?.message || 'Thêm khoản điều chỉnh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Thêm thưởng / khấu trừ"
      subtitle="Áp dụng cho một nhân viên trong kỳ lương này."
      size="md"
      footer={
        <div className="hr-inline" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="adm-btn adm-btn--ghost px-3.5 py-2 rounded-md cursor-pointer text-sm" onClick={onClose}>
            Hủy
          </button>
          <PrimaryButton onClick={handleSubmit} loading={saving}>Lưu</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="hr-field">
          <AdminSelectDropdown
            label="Nhân viên"
            value={userId}
            options={staffOptions}
            onChange={setUserId}
            placeholder="Chọn nhân viên"
          />
        </div>
        <div className="hr-field">
          <AdminSelectDropdown
            label="Loại"
            value={type}
            options={[
              { value: 'BONUS', label: 'Thưởng' },
              { value: 'DEDUCTION', label: 'Khấu trừ' },
            ]}
            onChange={setType}
          />
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Số tiền (đ)</label>
          <input
            type="number"
            min="0"
            className={adminInputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ví dụ: 500000"
          />
        </div>
        <div className="hr-field">
          <label className="hr-field__label">Lý do</label>
          <textarea className={adminTextareaClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </AdminModal>
  );
}

export default PayrollPeriodsTab;
