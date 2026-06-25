import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, DollarSign } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { notificationService } from '../../../shared/services/notificationService';
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

const RefundsPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const loadRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await bookingService.getAdminPendingRefunds();
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load pending refunds:', err);
      notificationService.error('Không thể tải danh sách hoàn tiền chờ duyệt.');
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

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

  return (
    <AdminPage>
      <PageHeader
        title="Duyệt hoàn tiền"
        description="Các yêu cầu hoàn tiền đang chờ admin xử lý thủ công."
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: loadRefunds,
            disabled: isLoading,
            icon: <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
          },
        ]}
      />

      {isLoading ? (
        <div className="refunds-state">
          <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
          <p>Đang tải danh sách hoàn tiền...</p>
        </div>
      ) : refunds.length === 0 ? (
        <div className="refunds-state">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p>Không có yêu cầu hoàn tiền nào đang chờ duyệt.</p>
        </div>
      ) : (
        <div className="refunds-table-wrap">
          <table className="refunds-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Phim</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {refunds.map((item) => (
                <tr key={item.refundUuid}>
                  <td>{item.customerEmail || '—'}</td>
                  <td>{item.movieTitle || '—'}</td>
                  <td className="refunds-amount">
                    <DollarSign className="inline h-3.5 w-3.5 mr-1 text-emerald-400" />
                    {formatMoney(item.amount)}
                  </td>
                  <td>
                    <span className="refunds-status-badge">{item.status || 'PENDING'}</span>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td className="text-right">
                    <PrimaryButton
                      type="button"
                      disabled={approvingId === item.refundUuid}
                      onClick={() => handleApprove(item.refundUuid)}
                    >
                      {approvingId === item.refundUuid ? 'Đang duyệt...' : 'Duyệt hoàn tiền'}
                    </PrimaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
};

export default RefundsPage;
