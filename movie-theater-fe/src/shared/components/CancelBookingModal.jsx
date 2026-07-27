import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2, Wallet } from 'lucide-react';
import { bookingService } from '../services/bookingService';

const formatMoney = (val) => {
  if (val == null) return '0đ';
  return `${Number(val).toLocaleString('vi-VN')}đ`;
};

const CancelBookingModal = ({ bookingUuid, open, onClose, onSuccess }) => {
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isOnline = (preview?.bookingType || '').toUpperCase() === 'ONLINE';

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setReason('');
      setError('');
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !bookingUuid) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    bookingService
      .getCancellationPreview(bookingUuid)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải thông tin hủy vé');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingUuid]);

  const handleConfirm = async () => {
    if (!preview?.cancellable) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await bookingService.cancelBooking(bookingUuid, reason.trim() || undefined);
      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Hủy vé thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#121826] border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">
            {isOnline ? 'Hủy vé xem online' : 'Xác nhận hủy vé'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang tính toán hoàn tiền...</span>
            </div>
          )}

          {!loading && preview && (
            <>
              {!preview.cancellable ? (
                <div className="flex gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Không thể hủy vé</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {(preview.blockedReasons || []).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-300">{preview.message}</p>
                  {preview.manualApprovalRequired && preview.refundable && (
                    <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      Yêu cầu hoàn tiền sẽ được gửi tới admin để duyệt trước khi cộng lại vào ví hoặc hoàn qua cổng thanh toán gốc.
                    </p>
                  )}
                  {!preview.manualApprovalRequired && (
                    <p className="text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      Tiền hoàn sẽ được cộng lại vào Ví NASA nếu bạn thanh toán bằng ví; các phương thức khác hoàn qua cổng thanh toán gốc.
                    </p>
                  )}
                  {isOnline && (
                    <p className="text-xs text-violet-300/90 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                      Chỉ hủy được khi vé online chưa kích hoạt xem phim. Sau khi hủy, quyền truy cập VOD sẽ bị thu hồi.
                    </p>
                  )}
                  <div className="rounded-xl bg-[#0f172a] border border-white/5 p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Đã thanh toán</span>
                      <span className="text-white font-medium">{formatMoney(preview.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Phí hủy</span>
                      <span className="text-amber-400 font-medium">-{formatMoney(preview.cancellationFee)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/5">
                      <span className="text-gray-300 font-semibold flex items-center gap-1">
                        <Wallet className="w-4 h-4" /> Hoàn lại
                      </span>
                      <span className="text-emerald-400 font-bold text-base">
                        {formatMoney(preview.refundAmount)}
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Lý do hủy (tuỳ chọn)"
                    rows={2}
                    className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 resize-none"
                  />
                </>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 font-semibold text-sm hover:bg-white/5 cursor-pointer bg-transparent"
          >
            Đóng
          </button>
          {preview?.cancellable && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 cursor-pointer border-none"
            >
              {submitting ? 'Đang xử lý...' : isOnline ? 'Xác nhận hủy & hoàn tiền' : 'Xác nhận hủy'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelBookingModal;
