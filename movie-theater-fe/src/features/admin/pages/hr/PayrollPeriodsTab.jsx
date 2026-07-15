import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { AdminModal, PrimaryButton } from '../../components';
import { adminInputClass, adminTextareaClass } from '../../components/adminFormStyles';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import {
  PAYROLL_STATUS_META,
  PAYSLIP_STATUS_META,
  formatDate,
  formatMinutes,
  formatMoney,
  statusBadge,
} from './hrUtils';

const now = new Date();

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
      await fn();
      notificationService.success(successMsg);
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
    const confirmed = window.confirm(
      `Xóa kỳ lương ${selected.label}? Toàn bộ phiếu lương nháp và khoản thưởng/khấu trừ của kỳ này sẽ bị xóa và không thể khôi phục.`,
    );
    if (!confirmed) return;
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

  return (
    <div>
      <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="hr-muted" style={{ fontSize: 13 }}>
          {periods.length} kỳ lương
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
        <div className="hr-grid" style={{ gridTemplateColumns: 'minmax(0, 300px) 1fr', alignItems: 'start' }}>
          {/* Danh sách kỳ lương */}
          <div className="hr-grid" style={{ gap: 8 }}>
            {periods.map((p) => {
              const meta = statusBadge(PAYROLL_STATUS_META, p.status);
              const active = p.uuid === selectedId;
              return (
                <button
                  key={p.uuid}
                  type="button"
                  className="hr-card"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: active ? 'rgba(239,68,68,0.5)' : undefined,
                    background: active ? 'rgba(239,68,68,0.06)' : undefined,
                  }}
                  onClick={() => setSelectedId(p.uuid)}
                >
                  <div className="hr-inline" style={{ justifyContent: 'space-between' }}>
                    <span className="hr-strong">Kỳ {p.label}</span>
                    <span className={meta.className}>{meta.label}</span>
                  </div>
                  <p className="hr-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </p>
                  <div className="hr-inline" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                    <span className="hr-muted" style={{ fontSize: 12 }}>{p.payslipCount} phiếu</span>
                    <span className="hr-strong" style={{ fontSize: 13 }}>{formatMoney(p.totalNetPay)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chi tiết kỳ lương */}
          <div>
            {selected && (
              <>
                <div className="hr-card" style={{ marginBottom: 16 }}>
                  <div className="hr-inline" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <p className="hr-strong" style={{ fontSize: 16 }}>Kỳ lương {selected.label}</p>
                      <p className="hr-muted" style={{ fontSize: 12 }}>
                        {formatDate(selected.startDate)} – {formatDate(selected.endDate)} · Tổng thực chi{' '}
                        <span className="hr-strong">{formatMoney(selected.totalNetPay)}</span>
                      </p>
                    </div>
                    <div className="hr-row-actions">
                      {(selected.status === 'OPEN' || selected.status === 'GENERATED') && (
                        <PrimaryButton
                          loading={busy}
                          onClick={() =>
                            runAction(() => hrService.generatePayroll(selected.uuid),
                              'Đã sinh phiếu lương nháp.')
                          }
                        >
                          {selected.status === 'GENERATED' ? 'Sinh lại phiếu' : 'Sinh phiếu lương'}
                        </PrimaryButton>
                      )}
                      {selected.status === 'GENERATED' && (
                        <PrimaryButton
                          loading={busy}
                          onClick={() =>
                            runAction(() => hrService.approvePayroll(selected.uuid), 'Đã duyệt kỳ lương.')
                          }
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Duyệt
                        </PrimaryButton>
                      )}
                      {selected.status === 'APPROVED' && (
                        <PrimaryButton
                          loading={busy}
                          onClick={() =>
                            runAction(() => hrService.payPayroll(selected.uuid), 'Đã chi trả kỳ lương.')
                          }
                        >
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

                {detailLoading ? (
                  <div className="hr-state">
                    <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
                    <p>Đang tải chi tiết...</p>
                  </div>
                ) : (
                  <>
                    {/* Phiếu lương */}
                    <p className="hr-card__title" style={{ marginBottom: 8 }}>Phiếu lương ({payslips.length})</p>
                    {payslips.length === 0 ? (
                      <div className="hr-state" style={{ padding: 32 }}>
                        <p>Chưa có phiếu lương. Nhấn “Sinh phiếu lương” để tính từ công đã duyệt.</p>
                      </div>
                    ) : (
                      <div className="hr-table-wrap" style={{ marginBottom: 20 }}>
                        <table className="hr-table">
                          <thead>
                            <tr>
                              <th>Nhân viên</th>
                              <th>Giờ công</th>
                              <th>OT</th>
                              <th>Đơn giá</th>
                              <th>Lương cơ bản</th>
                              <th>OT</th>
                              <th>Thưởng</th>
                              <th>Khấu trừ</th>
                              <th>Thực nhận</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payslips.map((slip) => (
                              <tr key={slip.uuid}>
                                <td className="hr-strong">{slip.fullName || slip.email}</td>
                                <td className="hr-num">{formatMinutes(slip.regularMinutes)}</td>
                                <td className="hr-num">{formatMinutes(slip.otMinutes)}</td>
                                <td className="hr-num">{formatMoney(slip.hourlyRate)}</td>
                                <td className="hr-num">{formatMoney(slip.regularPay)}</td>
                                <td className="hr-num">{formatMoney(slip.otPay)}</td>
                                <td className="hr-num" style={{ color: '#34d399' }}>{formatMoney(slip.bonusTotal)}</td>
                                <td className="hr-num" style={{ color: '#f87171' }}>{formatMoney(slip.deductionTotal)}</td>
                                <td className="hr-num hr-strong">{formatMoney(slip.netPay)}</td>
                                <td>
                                  <span className={statusBadge(PAYSLIP_STATUS_META, slip.status).className}>
                                    {statusBadge(PAYSLIP_STATUS_META, slip.status).label}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Thưởng / khấu trừ */}
                    <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <p className="hr-card__title" style={{ margin: 0 }}>Thưởng & khấu trừ ({adjustments.length})</p>
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
                      <div className="hr-table-wrap">
                        <table className="hr-table">
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
                                    <span className="hr-badge hr-badge--success">Thưởng</span>
                                  ) : (
                                    <span className="hr-badge hr-badge--danger">Khấu trừ</span>
                                  )}
                                </td>
                                <td className="hr-num">{formatMoney(adj.amount)}</td>
                                <td>{adj.reason}</td>
                                <td>
                                  {canEditAdjust && (
                                    <div className="hr-row-actions">
                                      <button
                                        type="button"
                                        className="cursor-pointer"
                                        style={{ background: 'none', border: 'none', color: '#f87171', padding: 4 }}
                                        title="Xóa"
                                        onClick={() =>
                                          runAction(() => hrService.deleteAdjustment(adj.uuid), 'Đã xóa khoản điều chỉnh.')
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
