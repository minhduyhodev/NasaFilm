import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarX, Check, Loader2, RefreshCw, X } from 'lucide-react';
import { AdminPage, PageHeader } from '../../components';
import AdminSelectDropdown from '../../components/AdminSelectDropdown';
import { hrService } from '../../api/hrService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import {
  REQUEST_STATUS_META,
  formatDate,
  formatTime,
  leaveTypeLabel,
  statusBadge,
} from './hrUtils';
import './hr.css';

const TABS = [
  { id: 'leave', label: 'Nghỉ phép', icon: CalendarX },
  { id: 'swap', label: 'Đổi ca', icon: ArrowLeftRight },
];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const HrRequestsPage = () => {
  const [tab, setTab] = useState('leave');
  const [status, setStatus] = useState('PENDING');
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'leave') {
        const data = await hrService.getLeaveRequestsAdmin({ status });
        setLeaves(Array.isArray(data) ? data : []);
      } else {
        const data = await hrService.getSwapRequestsAdmin({ status });
        setSwaps(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải đơn từ.');
    } finally {
      setLoading(false);
    }
  }, [tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingLeaveCount = useMemo(
    () => leaves.filter((l) => l.status === 'PENDING').length,
    [leaves],
  );
  const pendingSwapCount = useMemo(
    () => swaps.filter((s) => s.status === 'PENDING').length,
    [swaps],
  );

  const decideLeave = async (rec, approve) => {
    const ok = await confirm({
      title: approve ? 'Duyệt đơn nghỉ phép' : 'Từ chối đơn nghỉ phép',
      message: approve
        ? 'Sau khi duyệt, hệ thống sẽ không xếp ca mới cho nhân viên trong khoảng nghỉ này.'
        : 'Từ chối đơn nghỉ phép này?',
      highlight: `${rec.fullName || rec.email} · ${formatDate(rec.fromDate)} → ${formatDate(rec.toDate)}`,
      confirmLabel: approve ? 'Duyệt' : 'Từ chối',
      variant: approve ? 'warning' : 'danger',
    });
    if (!ok) return;
    setActionId(rec.uuid);
    try {
      if (approve) await hrService.approveLeaveRequest(rec.uuid);
      else await hrService.rejectLeaveRequest(rec.uuid);
      notificationService.success(approve ? 'Đã duyệt đơn nghỉ phép.' : 'Đã từ chối đơn nghỉ phép.');
      await load();
    } catch (err) {
      notificationService.error(err?.message || 'Thao tác thất bại.');
    } finally {
      setActionId(null);
    }
  };

  const decideSwap = async (rec, approve) => {
    const ok = await confirm({
      title: approve ? 'Duyệt đổi ca' : 'Từ chối đổi ca',
      message: approve
        ? 'Hai ca sẽ được hoán đổi chủ sở hữu (có kiểm tra xung đột lịch và nghỉ phép).'
        : 'Từ chối yêu cầu đổi ca này?',
      highlight: `${rec.requester?.fullName || rec.requester?.email} ↔ ${rec.counterpart?.fullName || rec.counterpart?.email}`,
      confirmLabel: approve ? 'Duyệt đổi' : 'Từ chối',
      variant: approve ? 'warning' : 'danger',
    });
    if (!ok) return;
    setActionId(rec.uuid);
    try {
      if (approve) await hrService.approveSwapRequest(rec.uuid);
      else await hrService.rejectSwapRequest(rec.uuid);
      notificationService.success(approve ? 'Đã duyệt đổi ca.' : 'Đã từ chối đổi ca.');
      await load();
    } catch (err) {
      notificationService.error(err?.message || 'Thao tác thất bại.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Duyệt đơn từ"
        description="Xét duyệt đơn xin nghỉ phép và yêu cầu đổi ca của nhân viên."
        variant="default"
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: load,
            disabled: loading,
            icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      <div className="hr-tabs">
        {TABS.map((t) => {
          const count = t.id === 'leave' ? pendingLeaveCount : pendingSwapCount;
          return (
            <button
              key={t.id}
              type="button"
              className={`hr-tab${tab === t.id ? ' hr-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {count > 0 && <span className="hr-badge hr-badge--warning" style={{ marginLeft: 6 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="hr-filters" style={{ marginBottom: 14 }}>
        <div className="hr-field" style={{ minWidth: 220 }}>
          <AdminSelectDropdown label="Trạng thái" value={status} options={STATUS_OPTIONS} onChange={setStatus} size="sm" />
        </div>
      </div>

      {loading ? (
        <div className="hr-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải đơn từ...</p>
        </div>
      ) : tab === 'leave' ? (
        <LeaveTable rows={leaves} actionId={actionId} onDecide={decideLeave} />
      ) : (
        <SwapTable rows={swaps} actionId={actionId} onDecide={decideSwap} />
      )}
    </AdminPage>
  );
};

function ActionButtons({ rec, actionId, onDecide }) {
  if (rec.status !== 'PENDING') {
    return <span className="hr-muted" style={{ fontSize: 12 }}>{rec.reviewNote || '—'}</span>;
  }
  const busy = actionId === rec.uuid;
  return (
    <div className="hr-row-actions">
      <button type="button" className="hr-req-btn hr-req-btn--approve" disabled={busy} onClick={() => onDecide(rec, true)}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Duyệt
      </button>
      <button type="button" className="hr-req-btn hr-req-btn--reject" disabled={busy} onClick={() => onDecide(rec, false)}>
        <X className="h-3.5 w-3.5" />
        Từ chối
      </button>
    </div>
  );
}

function LeaveTable({ rows, actionId, onDecide }) {
  if (rows.length === 0) {
    return (
      <div className="hr-state">
        <CalendarX className="h-9 w-9 text-slate-500" />
        <p>Không có đơn nghỉ phép nào.</p>
      </div>
    );
  }
  return (
    <div className="hr-table-wrap">
      <table className="hr-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Loại</th>
            <th>Từ ngày</th>
            <th>Đến ngày</th>
            <th>Số ngày</th>
            <th>Lý do</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.uuid}>
              <td>
                <div className="hr-strong">{l.fullName || '—'}</div>
                <div className="hr-muted" style={{ fontSize: 11 }}>{l.email}</div>
              </td>
              <td>{leaveTypeLabel(l.leaveType)}</td>
              <td className="hr-num">{formatDate(l.fromDate)}</td>
              <td className="hr-num">{formatDate(l.toDate)}</td>
              <td className="hr-num">{l.days}</td>
              <td style={{ maxWidth: 220 }}>{l.reason || '—'}</td>
              <td>
                <span className={statusBadge(REQUEST_STATUS_META, l.status).className}>
                  {statusBadge(REQUEST_STATUS_META, l.status).label}
                </span>
              </td>
              <td>
                <ActionButtons rec={l} actionId={actionId} onDecide={onDecide} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SwapParty({ party }) {
  if (!party) return <span className="hr-muted">—</span>;
  return (
    <div>
      <div className="hr-strong">{party.fullName || party.email}</div>
      <div className="hr-muted" style={{ fontSize: 12 }}>
        {party.shiftName} · {formatDate(party.workDate)} · {formatTime(party.startTime)}–{formatTime(party.endTime)}
      </div>
    </div>
  );
}

function SwapTable({ rows, actionId, onDecide }) {
  if (rows.length === 0) {
    return (
      <div className="hr-state">
        <ArrowLeftRight className="h-9 w-9 text-slate-500" />
        <p>Không có yêu cầu đổi ca nào.</p>
      </div>
    );
  }
  return (
    <div className="hr-req-list">
      {rows.map((s) => (
        <div key={s.uuid} className="hr-card">
          <div className="hr-inline" style={{ justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span className={statusBadge(REQUEST_STATUS_META, s.status).className}>
              {statusBadge(REQUEST_STATUS_META, s.status).label}
            </span>
            <span className="hr-muted" style={{ fontSize: 11 }}>{formatDate(s.createdAt)}</span>
          </div>
          <div className="hr-swap-grid">
            <SwapParty party={s.requester} />
            <ArrowLeftRight className="h-5 w-5 text-sky-400 shrink-0" />
            <SwapParty party={s.counterpart} />
          </div>
          {s.note && <p className="hr-muted" style={{ fontSize: 12, marginTop: 8 }}>Ghi chú: {s.note}</p>}
          <div style={{ marginTop: 10 }}>
            <ActionButtons rec={s} actionId={actionId} onDecide={onDecide} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default HrRequestsPage;
