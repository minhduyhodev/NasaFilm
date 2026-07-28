import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Copy, Check, Building2, CreditCard, QrCode,
  Loader2, X, AlertTriangle,
} from 'lucide-react';
import { walletService } from '../../../shared/services/walletService';
import { notificationService } from '../../../shared/services/notificationService';
import { useInvalidateWallet } from '../../../shared/hooks/queries/useWalletQuery';

const formatAmount = (amt) => Number(amt || 0).toLocaleString('vi-VN');

function InfoRow({ label, value, canCopy, copied, onCopy, highlight }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </span>
        {canCopy && (
          <button
            onClick={onCopy}
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer bg-white/5 border border-white/10"
            title="Sao chép"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function WalletVietQRModal({ amount, onSuccess, onClose }) {
  const invalidateWallet = useInvalidateWallet();
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmFired = useRef(false);

  // Generate QR on mount
  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      try {
        setLoadingQr(true);
        const data = await walletService.createVietQRTopUp(amount);
        if (isMounted) setQrData(data);
      } catch (err) {
        if (isMounted) {
          notificationService.error(err?.message || 'Không tạo được mã QR. Vui lòng thử lại.');
          onClose();
        }
      } finally {
        if (isMounted) setLoadingQr(false);
      }
    };
    generate();
    return () => { isMounted = false; };
  }, [amount]);

  // Auto-credit on success
  const doCredit = useCallback(async () => {
    if (confirmFired.current) return;
    confirmFired.current = true;
    setIsConfirming(true);
    try {
      await invalidateWallet();
      notificationService.success(`Nạp ${formatAmount(amount)} đ vào Ví NASA thành công! 🎉`);
      onSuccess?.();
    } catch {
      confirmFired.current = false;
      setIsConfirming(false);
    }
  }, [amount, invalidateWallet, onSuccess]);

  // Polling every 2.5s
  useEffect(() => {
    if (!qrData || isConfirming || confirmFired.current) return;
    let intervalId;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const resp = await walletService.checkVietQRTopUp(qrData.transferCode, amount);
        if (resp?.data !== null && resp?.data !== undefined && !confirmFired.current) {
          clearInterval(intervalId);
          await doCredit();
        }
      } catch {
        // ignore polling errors silently
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    poll();
    intervalId = setInterval(poll, 2500);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [qrData, isConfirming, amount, doCredit]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isConfirming) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-[#0f1729] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Nạp tiền qua VietQR</h2>
              <p className="text-xs text-slate-400 mt-0.5">Quét mã bằng ứng dụng ngân hàng để chuyển khoản</p>
            </div>
          </div>
          {!isConfirming && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        {loadingQr || !qrData ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p>Đang tạo mã thanh toán an toàn...</p>
          </div>
        ) : isConfirming ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
            <p className="text-emerald-300 font-bold text-lg">Đã nhận thanh toán! Đang cộng tiền vào ví...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* Left: QR */}
            <div className="w-full md:w-5/12 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.02]">
              <div className="text-center mb-5">
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Số tiền nạp</div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  {formatAmount(qrData.amount)} đ
                </div>
              </div>

              <div className="relative bg-white rounded-2xl p-3 shadow-xl shadow-blue-500/10 mb-5 w-full max-w-[240px] aspect-square flex items-center justify-center">
                {!qrLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                )}
                <img
                  src={qrData.qrImageUrl}
                  alt="VietQR"
                  className={`w-full h-full object-contain transition-opacity duration-300 ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setQrLoaded(true)}
                  onError={() => setQrLoaded(true)}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                Đang tự động kiểm tra thanh toán...
              </div>

              {import.meta.env.DEV && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/webhooks/vietqr`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: 'nasafilm-secret-webhook-token',
                        },
                        body: JSON.stringify({
                          gateway: 'MockBank_Local',
                          amount: qrData.amount,
                          content: qrData.transferContent,
                          referenceCode: qrData.transferCode,
                        }),
                      });
                      if (res.ok) {
                        notificationService.success('Đã gửi Webhook giả lập! Chờ ~3s để auto-polling xác nhận.');
                      } else {
                        notificationService.error('Gửi webhook thất bại: ' + res.status);
                      }
                    } catch (e) {
                      notificationService.error('Lỗi: ' + e.message);
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg text-white text-xs font-bold w-full shadow-lg shadow-purple-500/20"
                >
                  🚀 [DEV] Giả lập Webhook (Đã chuyển tiền)
                </button>
              )}
            </div>

            {/* Right: Bank info */}
            <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide mb-4">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Thông tin chuyển khoản
                </h3>

                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
                    {qrData.bankLogo ? (
                      <img src={qrData.bankLogo} alt={qrData.bankName} className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-sm" />
                    ) : (
                      <Building2 className="w-10 h-10 text-blue-400" />
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">{qrData.bankName}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">Ngân hàng thụ hưởng</div>
                    </div>
                  </div>

                  <div className="divide-y divide-white/5">
                    <InfoRow
                      label="Số tài khoản"
                      value={qrData.accountNo}
                      canCopy
                      copied={copiedField === 'accountNo'}
                      onCopy={() => handleCopy(qrData.accountNo, 'accountNo')}
                    />
                    <InfoRow label="Chủ tài khoản" value={qrData.accountName} />
                    <InfoRow
                      label="Số tiền"
                      value={`${formatAmount(qrData.amount)} VND`}
                      canCopy
                      copied={copiedField === 'amount'}
                      onCopy={() => handleCopy(String(qrData.amount), 'amount')}
                      highlight
                    />
                    <InfoRow
                      label="Nội dung CK"
                      value={qrData.transferContent}
                      canCopy
                      copied={copiedField === 'content'}
                      onCopy={() => handleCopy(qrData.transferContent, 'content')}
                      highlight
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Chuyển khoản đúng <strong>nội dung</strong> và <strong>số tiền</strong>. Hệ thống tự động xác nhận và cộng tiền vào ví sau khi nhận thanh toán.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-auto w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-all"
              >
                Đóng — Tôi sẽ chuyển khoản sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
