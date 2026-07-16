import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import Pagination from '../../../shared/components/Pagination';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { AdminPage, PageHeader, PrimaryButton, FilterPills, StatusBadge, AdminTableShell } from '../components';
import './RefundsPage.css';

function formatMoney(amount) {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function approverLabel(item) {
  const role = (item.approvedByRole || '').toUpperCase();
  if (role === 'ADMIN' || role === 'STAFF') return 'Admin duyệt';
  if (role === 'CUSTOMER') return 'Tự động (khách hủy)';
  if (item.approvedByEmail || item.approvedByName) return 'Hệ thống';
  return '—';
}

function statusVariant(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED') return 'danger';
  if (normalized === 'PENDING' || normalized === 'PROCESSING') return 'warning';
  return 'muted';
}

function NoteCell({ item }) {
  return (
    <td className="refunds-note-cell">
      {item.cancellationReason ? (
        <span className="refunds-note" title={item.cancellationReason}>
          {item.cancellationReason}
        </span>
      ) : (
        <span className="refunds-note refunds-note--empty">Không có ghi chú</span>
      )}
      {item.cancellationFee != null && Number(item.cancellationFee) > 0 && (
        <span className="refunds-fee-hint">
          Phí hủy: {formatMoney(item.cancellationFee)}
        </span>
      )}
    </td>
  );
}

const RefundsPage = () => {
  const confirm = useConfirm();
  const [listTab, setListTab] = useState('pending');
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = listTab === 'history'
        ? await bookingService.getAdminRefundHistory()
        : await bookingService.getAdminPendingRefunds();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load refunds:', err);
      notificationService.error(
        listTab === 'history'
          ? 'Không thể tải lịch sử duyệt hoàn tiền.'
          : 'Không thể tải danh sách hoàn tiền chờ duyệt.',
      );
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  }, [listTab]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  useEffect(() => {
    setHistoryPage(1);
  }, [listTab]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_BOOKINGS, loadRefunds);

  const paginatedHistory = useMemo(() => {
    if (listTab !== 'history') return refunds;
    const start = (historyPage - 1) * itemsPerPage;
    return refunds.slice(start, start + itemsPerPage);
  }, [refunds, listTab, historyPage, itemsPerPage]);

  const displayedRefunds = listTab === 'history' ? paginatedHistory : refunds;

  const handleApprove = async (item) => {
    const ok = await confirm({
      title: 'Duyệt hoàn tiền',
      message: 'Xác nhận duyệt hoàn tiền cho khách hàng? Số tiền sẽ được cộng vào Ví NASA hoặc hoàn qua cổng thanh toán.',
      highlight: `${item.customerEmail || 'Khách hàng'} · ${formatMoney(item.amount)}`,
      detail: item.movieTitle ? `Phim: ${item.movieTitle}` : '',
      confirmLabel: 'Duyệt hoàn tiền',
      variant: 'warning',
    });
    if (!ok) return;

    setApprovingId(item.refundUuid);
    try {
      await bookingService.approveRefund(item.refundUuid);
      notificationService.success('Duyệt hoàn tiền thành công.');
      await loadRefunds();
    } catch (err) {
      console.error('Failed to approve refund:', err);
      notificationService.error(err?.message || 'Duyệt hoàn tiền thất bại.');
    } finally {
      setApprovingId(null);
    }
  };

  const emptyMessage = listTab === 'history'
    ? 'Chưa có lịch sử duyệt hoàn tiền.'
    : 'Không có yêu cầu hoàn tiền nào đang chờ duyệt.';

  return (
    <AdminPage>
      <PageHeader
        title="Duyệt hoàn tiền"
        description="Các yêu cầu hoàn tiền từ khách hủy vé — duyệt để cộng tiền về Ví NASA hoặc hoàn qua Mock Gateway."
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: loadRefunds,
            disabled: isLoading,
            icon: <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      <AdminTableShell
        toolbar={(
          <FilterPills
            value={listTab}
            onChange={setListTab}
            items={[
              { id: 'pending', label: 'Chờ duyệt', count: listTab === 'pending' ? refunds.length : undefined },
              { id: 'history', label: 'Lịch sử duyệt', count: listTab === 'history' ? refunds.length : undefined },
            ]}
            ariaLabel="Nhóm hoàn tiền"
          />
        )}
        footer={listTab === 'history' && refunds.length > 0 ? (
          <Pagination
            currentPage={historyPage}
            totalItems={refunds.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size);
              setHistoryPage(1);
            }}
          />
        ) : null}
      >
      {isLoading ? (
        <div className="adm-loading">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải danh sách hoàn tiền...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="adm-empty">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Phim</th>
                <th>Số tiền</th>
                <th>Ghi chú</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                {listTab === 'history' && (
                  <>
                    <th>Người duyệt</th>
                    <th>Ngày duyệt</th>
                  </>
                )}
                {listTab === 'pending' && <th />}
              </tr>
            </thead>
            <tbody>
              {displayedRefunds.map((item) => (
                <tr key={item.refundUuid}>
                  <td>{item.customerEmail || '—'}</td>
                  <td>{item.movieTitle || '—'}</td>
                  <td className="refunds-amount adm-tabular">{formatMoney(item.amount)}</td>
                  <NoteCell item={item} />
                  <td>
                    <StatusBadge variant={statusVariant(item.status)}>
                      {item.status || 'PENDING'}
                    </StatusBadge>
                  </td>
                  <td className="adm-tabular">{formatDate(item.createdAt)}</td>
                  {listTab === 'history' && (
                    <>
                      <td className="refunds-approver-cell">
                        <span className="refunds-approver-name adm-table__primary">
                          {item.approvedByName || item.approvedByEmail || '—'}
                        </span>
                        {item.approvedByEmail && item.approvedByName && (
                          <span className="refunds-approver-email adm-table__secondary">{item.approvedByEmail}</span>
                        )}
                        <span className="refunds-approver-role">{approverLabel(item)}</span>
                      </td>
                      <td className="adm-tabular">{formatDate(item.approvedAt)}</td>
                    </>
                  )}
                  {listTab === 'pending' && (
                    <td className="text-right">
                      <PrimaryButton
                        type="button"
                        disabled={approvingId === item.refundUuid}
                        onClick={() => handleApprove(item)}
                      >
                        {approvingId === item.refundUuid ? 'Đang duyệt...' : 'Duyệt hoàn tiền'}
                      </PrimaryButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
      )}
      </AdminTableShell>
    </AdminPage>
  );
};

export default RefundsPage;
