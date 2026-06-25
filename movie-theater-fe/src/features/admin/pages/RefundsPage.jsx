import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import Pagination from '../../../shared/components/Pagination';
import { AdminPage, PageHeader, PrimaryButton } from '../components';
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

function statusBadgeClass(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'refunds-status-badge refunds-status-badge--success';
  if (normalized === 'FAILED') return 'refunds-status-badge refunds-status-badge--failed';
  return 'refunds-status-badge';
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

  const handleApprove = async (refundUuid) => {
    setApprovingId(refundUuid);
    try {
      await bookingService.approveRefund(refundUuid);
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

      <div className="refunds-tabs">
        <button
          type="button"
          className={`refunds-tab${listTab === 'pending' ? ' refunds-tab--active' : ''}`}
          onClick={() => setListTab('pending')}
        >
          Chờ duyệt
        </button>
        <button
          type="button"
          className={`refunds-tab${listTab === 'history' ? ' refunds-tab--active' : ''}`}
          onClick={() => setListTab('history')}
        >
          Lịch sử duyệt
        </button>
      </div>

      {isLoading ? (
        <div className="refunds-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải danh sách hoàn tiền...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="refunds-state">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="refunds-table-wrap">
          <table className="refunds-table">
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
                  <td className="refunds-amount">{formatMoney(item.amount)}</td>
                  <NoteCell item={item} />
                  <td>
                    <span className={statusBadgeClass(item.status)}>{item.status || 'PENDING'}</span>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  {listTab === 'history' && (
                    <>
                      <td className="refunds-approver-cell">
                        <span className="refunds-approver-name">
                          {item.approvedByName || item.approvedByEmail || '—'}
                        </span>
                        {item.approvedByEmail && item.approvedByName && (
                          <span className="refunds-approver-email">{item.approvedByEmail}</span>
                        )}
                        <span className="refunds-approver-role">{approverLabel(item)}</span>
                      </td>
                      <td>{formatDate(item.approvedAt)}</td>
                    </>
                  )}
                  {listTab === 'pending' && (
                    <td className="text-right">
                      <PrimaryButton
                        type="button"
                        disabled={approvingId === item.refundUuid}
                        onClick={() => handleApprove(item.refundUuid)}
                      >
                        {approvingId === item.refundUuid ? 'Đang duyệt...' : 'Duyệt hoàn tiền'}
                      </PrimaryButton>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {listTab === 'history' && refunds.length > 0 && (
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
      )}
    </AdminPage>
  );
};

export default RefundsPage;
