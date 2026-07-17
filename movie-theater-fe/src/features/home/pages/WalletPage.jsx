import React, { useEffect, useState } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw, Wallet,
  X, QrCode, CreditCard, Zap, CheckCircle2,
} from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { walletService } from '../../../shared/services/walletService';
import { notificationService } from '../../../shared/services/notificationService';
import { useWalletSummary, useInvalidateWallet } from '../../../shared/hooks/queries/useWalletQuery';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import WalletVietQRModal from './WalletVietQRModal';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const FALLBACK_QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];
const FALLBACK_MIN = 10000;

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const formatBookingRef = (bookingUuid) => {
  if (!bookingUuid) return null;
  const id = String(bookingUuid);
  return `#${id.substring(0, 8).toUpperCase()}`;
};

const txLabel = (type) => {
  switch ((type || '').toUpperCase()) {
    case 'TOP_UP':   return 'Nạp tiền';
    case 'WITHDRAW': return 'Rút tiền';
    case 'PAYMENT':  return 'Thanh toán';
    case 'REFUND':   return 'Hoàn tiền';
    default:         return type || 'Giao dịch';
  }
};

/* ─── Stripe form ─── */
function StripeTopUpForm({ amount, onSuccess, onCancel }) {
  const stripe    = useStripe();
  const elements  = useElements();
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setMessage('Đang xử lý thanh toán...');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setLoading(false);
      setMessage(error.message || 'Thanh toán thất bại');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await onSuccess(paymentIntent.id);
      } catch (err) {
        setMessage(err?.message || 'Thanh toán OK nhưng cộng ví thất bại');
        setLoading(false);
      }
      return;
    }

    setLoading(false);
    setMessage(`Trạng thái: ${paymentIntent?.status || 'unknown'}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white p-3">
        <PaymentElement />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-violet-500 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Thanh toán {formatMoney(amount)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Hủy
        </button>
      </div>
      {message && <p className="text-sm text-amber-300/90">{message}</p>}
    </form>
  );
}

/* ─── Method selector card ─── */
function MethodCard({ id, icon: Icon, iconColor, title, subtitle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`relative w-full text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-red-500/60 bg-red-500/10 shadow-lg shadow-red-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          selected ? 'bg-red-500/20' : 'bg-white/5'
        }`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-red-400' : iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-300'}`}>{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
        )}
      </div>
    </button>
  );
}

/* ─── Main WalletPage ─── */
const WalletPage = () => {
  const confirm       = useConfirm();
  const { data: summary, isLoading, refetch } = useWalletSummary();
  const invalidateWallet = useInvalidateWallet();

  const [amount,        setAmount]        = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null); // 'mock' | 'vietqr' | 'stripe'
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [clientSecret,  setClientSecret]  = useState('');
  const [pendingAmount, setPendingAmount] = useState(null);
  const [showVietQR,    setShowVietQR]    = useState(false);

  const minTopUp    = Number(summary?.minTopUp ?? FALLBACK_MIN);
  const maxTopUp    = Number(summary?.maxTopUp ?? 10_000_000);
  const quickAmounts = summary?.quickAmounts?.length
    ? summary.quickAmounts.map(Number)
    : FALLBACK_QUICK_AMOUNTS;
  const mockMode    = summary?.mockMode !== false;

  // Set default amount on load
  useEffect(() => {
    if (amount) return;
    const defaults = summary?.quickAmounts?.length
      ? summary.quickAmounts.map(Number)
      : FALLBACK_QUICK_AMOUNTS;
    if (defaults.length) setAmount(String(defaults[1] ?? defaults[0]));
  }, [summary, amount]);

  const refreshWallet = () => refetch();

  const validateAmount = (value) => {
    if (!value || value < minTopUp) {
      notificationService.warning(`Số tiền tối thiểu ${formatMoney(minTopUp)}`);
      return false;
    }
    if (value > maxTopUp) {
      notificationService.warning(`Số tiền tối đa ${formatMoney(maxTopUp)}`);
      return false;
    }
    return true;
  };

  const handleTopUp = async () => {
    const value = Number(amount);
    if (!validateAmount(value)) return;
    if (!selectedMethod) {
      notificationService.warning('Vui lòng chọn phương thức nạp tiền');
      return;
    }

    if (selectedMethod === 'mock') {
      const ok = await confirm({
        title:        'Xác nhận nạp tiền',
        message:      'Bạn có chắc muốn nạp tiền vào Ví NASA?',
        highlight:    formatMoney(value),
        confirmLabel: 'Nạp tiền',
        variant:      'warning',
      });
      if (!ok) return;
      setIsSubmitting(true);
      try {
        await walletService.topUp(value);
        await invalidateWallet();
        notificationService.success(`Nạp ${formatMoney(value)} vào ví NASA thành công`);
      } catch (err) {
        notificationService.error(err?.message || 'Nạp tiền thất bại');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (selectedMethod === 'vietqr') {
      if (!validateAmount(value)) return;
      setShowVietQR(true);
      return;
    }

    if (selectedMethod === 'stripe') {
      setIsSubmitting(true);
      try {
        const intent = await walletService.createTopUpIntent(value);
        if (intent?.mockMode) {
          await invalidateWallet();
          notificationService.success(`Nạp ${formatMoney(value)} vào ví NASA thành công`);
          return;
        }
        if (!intent?.clientSecret) throw new Error('Không nhận được clientSecret từ máy chủ');
        setPendingAmount(value);
        setClientSecret(intent.clientSecret);
      } catch (err) {
        notificationService.error(err?.message || 'Nạp tiền thất bại');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
  };

  const handleStripeSuccess = async (paymentIntentId) => {
    await walletService.confirmTopUp(paymentIntentId);
    await invalidateWallet();
    setClientSecret('');
    setPendingAmount(null);
    setSelectedMethod(null);
    notificationService.success(`Nạp ${formatMoney(pendingAmount)} vào ví NASA thành công`);
  };

  const handleWithdraw = async () => {
    if (!mockMode) {
      notificationService.warning('Rút tiền mô phỏng chỉ khả dụng ở chế độ mock');
      return;
    }
    const value = Number(amount);
    if (!validateAmount(value)) return;
    setIsSubmitting(true);
    try {
      await walletService.withdraw(value);
      await invalidateWallet();
      notificationService.success(`Rút ${formatMoney(value)} từ ví NASA thành công`);
    } catch (err) {
      notificationService.error(err?.message || 'Rút tiền thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const transactions = summary?.recentTransactions || [];

  /* Build available methods */
  const methods = [
    ...(mockMode ? [{
      id: 'mock', icon: Zap, iconColor: 'text-yellow-400',
      title: 'Mock (Mô phỏng tức thì)',
      subtitle: 'Cộng tiền ngay lập tức — chỉ dành cho môi trường dev/test',
    }] : []),
    {
      id: 'vietqr', icon: QrCode, iconColor: 'text-blue-400',
      title: 'VietQR — Chuyển khoản ngân hàng',
      subtitle: 'Quét mã QR bằng app ngân hàng, tự động xác nhận',
    },
    ...(!mockMode ? [{
      id: 'stripe', icon: CreditCard, iconColor: 'text-violet-400',
      title: 'Stripe — Thẻ quốc tế',
      subtitle: 'Visa / Mastercard / American Express',
    }] : []),
  ];

  return (
    <div className="text-white min-h-screen bg-[#0b0f19]">
      <main className="pt-28 pb-16 px-4 md:px-8 lg:px-20">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Tài khoản</span>
              <h1 className="mt-2 text-3xl md:text-4xl font-black uppercase font-heading">Ví NASA</h1>
              <p className="mt-3 text-sm text-gray-400">
                Nạp tiền vào ví để thanh toán vé xem phim nhanh hơn.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshWallet}
              disabled={isLoading}
              className="rounded-full border border-white/10 p-3 hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="Làm mới"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Balance card */}
          <div className="rounded-[28px] border border-white/5 bg-gradient-to-br from-red-600/20 via-[#111216]/80 to-[#111216]/80 p-8 mb-8">
            <div className="flex items-center gap-3 text-gray-300 text-sm mb-2">
              <Wallet className="h-5 w-5 text-red-400" />
              Số dư khả dụng
            </div>
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-red-500 mt-2" />
            ) : (
              <p className="text-4xl md:text-5xl font-black font-heading">{formatMoney(summary?.balance)}</p>
            )}
            <p className="mt-3 text-xs text-amber-400/90 font-semibold">
              {mockMode ? 'Mock Gateway' : 'Live Gateway'} · {summary?.provider || (mockMode ? 'mock' : 'stripe')}
            </p>
          </div>

          {/* Top-up panel */}
          <div className="rounded-[24px] border border-white/5 bg-[#111216]/60 p-6 mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider mb-5">Nạp tiền vào ví</h2>

            {clientSecret ? (
              /* Stripe form active */
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Thanh toán <span className="text-white font-bold">{formatMoney(pendingAmount)}</span> qua Stripe để cộng vào ví.
                </p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeTopUpForm
                    amount={pendingAmount}
                    onSuccess={handleStripeSuccess}
                    onCancel={() => { setClientSecret(''); setPendingAmount(null); }}
                  />
                </Elements>
              </div>
            ) : (
              <>
                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
                        Number(amount) === value
                          ? 'border-red-500 bg-red-500/10 text-red-300'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {formatMoney(value)}
                    </button>
                  ))}
                </div>

                {/* Custom amount input */}
                <input
                  type="number"
                  min={minTopUp}
                  max={maxTopUp}
                  step="10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] px-4 py-3 text-white mb-6 focus:outline-none focus:border-red-500/40"
                  placeholder={`Tối thiểu ${formatMoney(minTopUp)}`}
                />

                {/* Payment method selector */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chọn phương thức nạp tiền</p>
                  <div className="flex flex-col gap-2">
                    {methods.map((m) => (
                      <MethodCard
                        key={m.id}
                        {...m}
                        selected={selectedMethod === m.id}
                        onClick={setSelectedMethod}
                      />
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting || !selectedMethod}
                    onClick={handleTopUp}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                    {selectedMethod === 'vietqr' ? 'Tạo mã QR' : 'Nạp tiền'}
                  </button>
                  {mockMode && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleWithdraw}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Rút tiền (Mock)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Transaction history */}
          <div className="rounded-[24px] border border-white/5 bg-[#111216]/60 p-6">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Lịch sử giao dịch</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có giao dịch.</p>
            ) : (
              <ul className="space-y-3">
                {transactions.map((tx) => {
                  const signed    = Number(tx.amount || 0);
                  const positive  = signed >= 0;
                  const isOrderRelated = tx.type === 'REFUND' || tx.type === 'PAYMENT';
                  const bookingRef = formatBookingRef(tx.bookingUuid);
                  return (
                    <li
                      key={tx.uuid}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-[#0f172a]/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{txLabel(tx.type)}</p>
                        <p className="text-xs text-gray-500 truncate">{tx.description || '—'}</p>
                        {isOrderRelated && (bookingRef || tx.movieTitle) && (
                          <p className="text-xs text-gray-400 mt-1 truncate" title={tx.movieTitle || bookingRef}>
                            {tx.type === 'REFUND' ? 'Hoàn cho đơn' : 'Thanh toán đơn'}
                            {bookingRef ? ` ${bookingRef}` : ''}
                            {tx.movieTitle ? ` · ${tx.movieTitle}` : ''}
                          </p>
                        )}
                        {tx.createdAt && (
                          <p className="text-[10px] text-gray-600 mt-1">
                            {new Date(tx.createdAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}{formatMoney(signed)}
                        </p>
                        <p className="text-[10px] text-gray-500">Sau GD: {formatMoney(tx.balanceAfter)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>
      </main>

      {/* VietQR modal */}
      {showVietQR && (
        <WalletVietQRModal
          amount={Number(amount)}
          onSuccess={() => {
            setShowVietQR(false);
            setSelectedMethod(null);
          }}
          onClose={() => setShowVietQR(false)}
        />
      )}
    </div>
  );
};

export default WalletPage;
