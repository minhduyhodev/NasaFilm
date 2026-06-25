import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { bookingService } from '../services/bookingService';
import RefundStatusTimeline from './RefundStatusTimeline';

const formatMoney = (val) => {
  if (val == null) return '0đ';
  return `${Number(val).toLocaleString('vi-VN')}đ`;
};

const RefundDetailModal = ({ bookingUuid, open, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !bookingUuid) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    bookingService
      .getRefundStatus(bookingUuid)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải trạng thái hoàn tiền');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingUuid]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Trạng thái hoàn tiền</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang tải...</span>
            </div>
          )}
          {!loading && error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && data && (
            <>
              {data.refundAmount != null && (
                <p className="text-sm text-gray-300 mb-4">
                  Số tiền hoàn: <span className="text-emerald-400 font-bold">{formatMoney(data.refundAmount)}</span>
                  {data.cancellationFee > 0 && (
                    <span className="text-gray-500"> (phí hủy {formatMoney(data.cancellationFee)})</span>
                  )}
                </p>
              )}
              <RefundStatusTimeline timeline={data.timeline} refundStatus={data.refundStatus} />
              {data.refundStatus === 'PENDING' && (
                <p className="mt-4 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Admin đang xem xét yêu cầu hoàn tiền. Bạn sẽ nhận tiền sau khi được duyệt tại trang Duyệt hoàn tiền.
                </p>
              )}
              {data.refundStatus === 'COMPLETED' && (
                <p className="mt-4 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Tiền đã được hoàn về Ví NASA (nếu thanh toán bằng ví) hoặc qua Mock Gateway.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RefundDetailModal;
