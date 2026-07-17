import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Copy, Check, Clock, AlertTriangle, Building2, CreditCard, QrCode, Loader2, ArrowLeft } from 'lucide-react';
import { authService } from '../auth/api/authService';
import { bookingService } from '../../shared/services/bookingService';
import { vodService } from '../../shared/services/vodService';
import { notificationService } from '../../shared/services/notificationService';
import { clearAllBookingSessions } from '../../shared/utils/bookingSessionStorage';
import { removeOrbitRoom } from '../../shared/utils/orbitRecentStorage';
import { showMissionCompletionToasts } from '../../shared/services/missionService';

export default function VietQRPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state;
  const amount = state?.amount;
  const checkoutState = state?.checkoutState;
  
  const isVod = checkoutState?.isVod ?? false;
  const movieUuid = checkoutState?.movieUuid ?? '';
  const showtimeUuid = checkoutState?.showtimeUuid ?? '';
  const lockExpiresAt = checkoutState?.lockExpiresAt ?? null;
  const orbitRoomUuid = checkoutState?.orbitRoomUuid ?? null;

  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Prevent multiple confirmations
  const confirmFired = useRef(false);

  // Calculate timer
  useEffect(() => {
    if (!lockExpiresAt) return;
    const calculateTimeLeft = () => {
      const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeftSeconds(0);
        notificationService.error("Đã hết thời gian thanh toán.");
        navigate('/checkout', { replace: true });
      } else {
        setTimeLeftSeconds(diff);
      }
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt, navigate]);

  // Generate QR Code on mount
  useEffect(() => {
    if (!amount || !checkoutState) {
      notificationService.error("Thông tin thanh toán không hợp lệ.");
      navigate('/checkout', { replace: true });
      return;
    }

    let isMounted = true;
    const generateQr = async () => {
      try {
        setLoadingQr(true);
        const desc = isVod
          ? `NASAFILM VOD ${movieUuid.substring(0, 8).toUpperCase()}`
          : `NASAFILM ${showtimeUuid.substring(0, 8).toUpperCase()}`;
          
        const { data } = await authService.api.post('/api/payments/vietqr/generate', {
          amount: amount,
          description: desc,
        });
        
        if (isMounted) {
          if (data.success && data.data) {
            setQrData(data.data);
          } else {
            notificationService.error('Không thể tạo mã QR. Vui lòng thử lại.');
            navigate('/checkout', { replace: true });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('VietQR generate failed:', err);
          notificationService.error(err.message || 'Lỗi tạo mã QR thanh toán.');
          navigate('/checkout', { replace: true });
        }
      } finally {
        if (isMounted) setLoadingQr(false);
      }
    };

    generateQr();
    return () => { isMounted = false; };
  }, [amount, checkoutState, isVod, movieUuid, showtimeUuid, navigate]);

  const doConfirmBooking = useCallback(async () => {
    if (confirmFired.current) return;
    confirmFired.current = true;
    setIsConfirming(true);
    
    try {
      let response;
      if (isVod) {
        response = await vodService.confirmOnlineBooking(movieUuid, checkoutState.voucherCode, 'vietqr', qrData?.transferCode);
      } else {
        const seatUuids = checkoutState.selectedSeats.map(s => s.seatUuid);
        response = await bookingService.confirmBooking(
          showtimeUuid,
          seatUuids,
          checkoutState.selectedCombos || [],
          checkoutState.voucherCode,
          'vietqr',
          orbitRoomUuid,
          qrData?.transferCode
        );
      }
      
      const movie = checkoutState.movie;
      const theater = checkoutState.theater;
      const showtime = checkoutState.showtime;
      const date = checkoutState.date;
      
      const successMessage = isVod
        ? `Mua vé xem phim Online thành công! Hãy kích hoạt mã vé để bắt đầu xem.`
        : `Bạn đã đặt thành công vé xem phim ${movie} tại ${theater}. Suất chiếu lúc ${showtime} ngày ${date}.`;
      
      notificationService.addNotification("Đặt vé thành công", successMessage, "success");
      notificationService.success(`Đặt vé thành công! Bạn đã thanh toán ${(amount).toLocaleString('vi-VN')} đ bằng VietQR.`);
      
      showMissionCompletionToasts(response?.missionCompletions);
      clearAllBookingSessions();
      if (orbitRoomUuid) {
        removeOrbitRoom(orbitRoomUuid);
      }
      
      if (isVod) {
        navigate('/booking-confirmed', {
          state: {
            bookingUuid: response.bookingUuid,
            movie: movie,
            moviePoster: checkoutState.moviePoster,
            movieFormat: 'VOD Online',
            movieRating: checkoutState.movieRating,
            theater: 'Trình phát video NASA VOD',
            date: 'Mọi lúc, mọi nơi',
            showtime: 'Xem trực tuyến',
            selectedSeats: checkoutState.selectedSeats,
            tickets: response.tickets || [],
            totalPrice: amount,
            combos: response.combos || [],
            isVod: true,
            movieUuid: movieUuid,
          },
          replace: true,
        });
      } else {
        navigate(`/pre-show/boarding/${response.bookingUuid}`, {
          state: { justConfirmed: true },
          replace: true,
        });
      }
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      notificationService.error(error.message || "Thanh toán thất bại. Vui lòng liên hệ CSKH.");
      confirmFired.current = false;
      setIsConfirming(false);
    }
  }, [amount, checkoutState, isVod, movieUuid, navigate, orbitRoomUuid, showtimeUuid, qrData]);

  // Polling logic for VietQR payment confirmation
  useEffect(() => {
    let intervalId;
    if (qrData && !isConfirming && !isExpired && !confirmFired.current) {
      const checkPayment = async () => {
        if (document.hidden) return;
        try {
          const response = await authService.api.get('/api/payments/vietqr/check', {
            params: {
              code: qrData.transferCode,
              amount: qrData.amount
            }
          });
          const success = response.data.data ?? response.data;
          
          if (success && !confirmFired.current) {
            clearInterval(intervalId);
            // Automatically confirm booking when payment is received, even if user didn't click
            await doConfirmBooking();
          }
        } catch (err) {
          console.error("Error polling VietQR payment:", err);
        }
      };

      // Poll every 2.5 seconds
      const handleVisibilityChange = () => {
        if (!document.hidden) checkPayment();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      checkPayment();
      intervalId = setInterval(checkPayment, 2500);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(intervalId);
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [qrData, isConfirming, isExpired, doConfirmBooking]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  if (!amount || !checkoutState) return null;

  const formatAmount = (amt) => Number(amt).toLocaleString('vi-VN');
  const formatTime = (seconds) => {
    if (seconds == null || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeftSeconds != null && timeLeftSeconds > 0 && timeLeftSeconds < 60;

  return (
    <div className="min-h-screen bg-[#0b0f19] pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Back Button */}
        <div 
          className="mb-6 flex items-center gap-2 group cursor-pointer w-fit" 
          onClick={() => !isConfirming && navigate('/checkout', { replace: true })}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-[#c8c6c8] group-hover:-translate-x-1 group-hover:text-white transition-all duration-300 shrink-0" />
          <span className="text-sm font-semibold text-[#c8c5ca] group-hover:text-white transition-colors">
            Hủy và quay lại trang thanh toán
          </span>
        </div>

        {/* Payment Container */}
        <div className="w-full overflow-hidden rounded-2xl bg-[#0f1729] border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col">
          
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border-b border-white/10 p-5 md:p-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Cổng thanh toán VietQR</h2>
                <p className="text-sm text-slate-400 mt-1">Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã</p>
              </div>
            </div>
          </div>

          {loadingQr || !qrData ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              <p>Đang tạo mã thanh toán an toàn...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row">
              {/* Left Column: QR Code & Amount */}
              <div className="w-full md:w-5/12 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 bg-white/5">
                {/* Amount */}
                <div className="text-center mb-6">
                  <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Số tiền thanh toán</div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                    {formatAmount(qrData.amount)} đ
                  </div>
                </div>

                {/* QR Code */}
                <div className="relative bg-white rounded-2xl p-3 shadow-xl shadow-blue-500/10 mb-6 w-full max-w-[260px] aspect-square flex items-center justify-center">
                  {!qrLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                  )}
                  <img
                    src={qrData.qrImageUrl}
                    alt="VietQR Code"
                    className={`w-full h-full object-contain transition-opacity duration-300 ${qrLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setQrLoaded(true)}
                    onError={() => setQrLoaded(true)}
                  />
                </div>

                {/* Timer */}
                {timeLeftSeconds != null && (
                  <div className={`w-full flex justify-center items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl ${
                    isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    isLowTime ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-white/5 text-slate-300 border border-white/10'
                  }`}>
                    {isExpired ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className={`w-4 h-4 ${isLowTime ? 'animate-pulse' : ''}`} />
                    )}
                    <span>
                      {isExpired
                        ? 'Đã hết thời gian thanh toán!'
                        : `Thời gian còn lại: ${formatTime(timeLeftSeconds)}`}
                    </span>
                  </div>
                )}

                {/* DEV ONLY Webhook Simulator */}
                {import.meta.env.DEV && (
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/webhooks/vietqr`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'nasafilm-secret-webhook-token'
                          },
                          body: JSON.stringify({
                            gateway: "MockBank_Local",
                            amount: qrData.amount,
                            content: qrData.transferContent,
                            referenceCode: qrData.transferCode
                          })
                        });
                        if (res.ok) alert('Đã gửi Webhook giả lập thành công! Hãy đợi khoảng 1-2s để auto-polling chạy.');
                      } catch(e) {
                        alert('Lỗi gửi webhook: ' + e.message);
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg text-white text-xs font-bold w-full shadow-lg shadow-purple-500/20"
                  >
                    🚀 [DEV] Giả lập Webhook (Đã chuyển tiền)
                  </button>
                )}
              </div>

              {/* Right Column: Bank Info & Actions */}
              <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between space-y-6">
                
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    Thông tự chuyển khoản
                  </h3>

                  {/* Bank Info Card */}
                  <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    {/* Bank Header */}
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

                    {/* Transfer Details */}
                    <div className="divide-y divide-white/5">
                      <InfoRow
                        label="Số tài khoản"
                        value={qrData.accountNo}
                        canCopy
                        copied={copiedField === 'accountNo'}
                        onCopy={() => handleCopy(qrData.accountNo, 'accountNo')}
                      />
                      <InfoRow
                        label="Chủ tài khoản"
                        value={qrData.accountName}
                      />
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

                  {/* Warning */}
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200/90 leading-relaxed">
                      Hệ thống tự động xác nhận đơn hàng sau khi nhận được thanh toán. Bắt buộc chuyển đúng <strong>nội dung</strong> và <strong>số tiền</strong>.
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={() => {
                    // Manual confirm triggers the confirmation explicitly if polling was slow.
                    // But we don't strictly need to do it if polling is working. We trigger it anyway to force check.
                    if (!confirmFired.current) {
                      doConfirmBooking();
                    }
                  }}
                  disabled={isConfirming || isExpired}
                  className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 active:scale-[0.98] flex items-center justify-center gap-2 mt-auto"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang xử lý đơn hàng...
                    </>
                  ) : isExpired ? (
                    'Giao dịch đã hết hạn'
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Tôi đã chuyển khoản thành công
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, canCopy, copied, onCopy, highlight }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-bold ${highlight ? 'text-blue-400' : 'text-white'}`}>
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
