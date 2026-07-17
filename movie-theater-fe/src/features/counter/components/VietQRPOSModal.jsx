import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Clock, Loader2, QrCode } from 'lucide-react';
import { authService } from '../../auth/api/authService';
import { notificationService } from '../../../shared/services/notificationService';

export default function VietQRPOSModal({ isOpen, onClose, onPaymentSuccess, amount, description }) {
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [copiedField, setCopiedField] = useState(null);
  
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(300); // 5 minutes timeout for POS
  const [isExpired, setIsExpired] = useState(false);
  
  const confirmFired = useRef(false);

  // Timer
  useEffect(() => {
    if (!isOpen) return;
    
    setTimeLeftSeconds(300);
    setIsExpired(false);
    confirmFired.current = false;
    
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(interval);
          notificationService.error('Đã hết thời gian thanh toán. Vui lòng thử lại.');
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Generate QR
  useEffect(() => {
    if (!isOpen || !amount) return;

    let isMounted = true;
    const generateQr = async () => {
      try {
        setLoadingQr(true);
        const { data } = await authService.api.post('/api/payments/vietqr/generate', {
          amount: amount,
          description: description || `POS T${Date.now().toString().slice(-6)}`,
        });
        
        if (isMounted) {
          if (data.success && data.data) {
            setQrData(data.data);
          } else {
            notificationService.error('Không thể tạo mã QR. Vui lòng thử lại.');
            onClose();
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('VietQR generate failed:', err);
          notificationService.error('Lỗi tạo mã QR thanh toán.');
          onClose();
        }
      } finally {
        if (isMounted) setLoadingQr(false);
      }
    };

    generateQr();
    return () => { isMounted = false; };
  }, [isOpen, amount, description]); // Removed onClose from dependencies to prevent flickering on parent re-render

  // Polling logic
  useEffect(() => {
    let intervalId;
    if (isOpen && qrData && !isExpired && !confirmFired.current) {
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
            confirmFired.current = true;
            onPaymentSuccess(qrData);
          }
        } catch (err) {
          console.error("Error polling VietQR payment:", err);
        }
      };

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
  }, [isOpen, qrData, isExpired, onPaymentSuccess]);

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      notificationService.error('Không thể copy. Vui lòng thử lại.');
    }
  }, []);

  const handleDevMockPayment = async () => {
    if (!qrData) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/webhooks/vietqr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'nasafilm-secret-webhook-token'
        },
        body: JSON.stringify({
          gateway: "MockBank_POS",
          transactionDate: new Date().toISOString(),
          accountNumber: "POS_MOCK",
          transferAmount: qrData.amount,
          content: qrData.transferContent,
          transferType: "in",
          referenceCode: qrData.transferCode
        })
      });
      notificationService.success("[DEV] Đã gửi giả lập Webhook thành công!");
    } catch (error) {
      notificationService.error("[DEV] Lỗi giả lập webhook: " + error.message);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0B0F19]/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121827] border border-[#1F2937] rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[#1F2937] flex justify-between items-center bg-[#1A2235]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            Thanh toán VietQR
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loadingQr ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-slate-400 text-sm animate-pulse">Đang tạo mã QR thanh toán...</p>
            </div>
          ) : !qrData ? (
            <div className="text-center py-10 text-slate-400">
              Không thể tải thông tin thanh toán.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Left side: QR Code */}
              <div className="w-full sm:w-[280px] shrink-0">
                <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center shadow-xl relative overflow-hidden h-full min-h-[280px]">
                  <img 
                    src={qrData.qrImageUrl} 
                    alt="VietQR Code" 
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

              {/* Right side: Details */}
              <div className="w-full flex-1 flex flex-col space-y-5">
                <div className="bg-[#1A2235] border border-[#1F2937] rounded-xl p-5 space-y-4 flex-1">
                  <div className="flex justify-between items-center pb-4 border-b border-[#2A3441]">
                    <span className="text-slate-400 text-sm">Trạng thái:</span>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-emerald-400 text-sm font-medium">Đang chờ thanh toán...</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Số tiền:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-emerald-400">{qrData.amount.toLocaleString('vi-VN')} đ</span>
                        <button onClick={() => handleCopy(qrData.amount.toString(), 'amount')} className="p-1.5 text-slate-400 hover:text-white bg-[#2A3441] rounded-md transition-colors" title="Copy số tiền">
                          {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Nội dung CK:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white text-sm bg-[#0B0F19] px-2 py-1 rounded">{qrData.transferContent}</span>
                        <button onClick={() => handleCopy(qrData.transferContent, 'content')} className="p-1.5 text-slate-400 hover:text-white bg-[#2A3441] rounded-md transition-colors" title="Copy nội dung">
                          {copiedField === 'content' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleDevMockPayment}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/15 text-red-300 hover:bg-red-500/25 py-3 rounded-xl border border-red-500/30 transition-all font-medium text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    🚀 [DEV] Giả lập Khách chuyển khoản thành công
                  </button>
                )}
                
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {isExpired ? 'Đã hết hạn thanh toán' : `Mã QR hết hạn sau: ${formatTime(timeLeftSeconds)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
