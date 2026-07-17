import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw, Wallet, X } from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { walletService } from '../../../shared/services/walletService';
import { notificationService } from '../../../shared/services/notificationService';
import { useWalletSummary, useInvalidateWallet } from '../../../shared/hooks/queries/useWalletQuery';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AccountUtilityPages.css';

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
    case 'TOP_UP':
      return 'Nạp tiền';
    case 'WITHDRAW':
      return 'Rút tiền';
    case 'PAYMENT':
      return 'Thanh toán';
    case 'REFUND':
      return 'Hoàn tiền';
    default:
      return type || 'Giao dịch';
  }
};

function StripeTopUpForm({ amount, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    <form onSubmit={handleSubmit}>
      <div className="stripe-element-shell">
        <PaymentElement />
      </div>
      <div className="account-actions">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="account-action account-action--primary"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
          Thanh toán {formatMoney(amount)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="account-action account-action--secondary"
        >
          <X className="h-4 w-4" />
          Hủy
        </button>
      </div>
      {message && <p className="account-form-message" role="status">{message}</p>}
    </form>
  );
}

const WalletPage = () => {
  const confirm = useConfirm();
  const { data: summary, isLoading, refetch } = useWalletSummary();
  const invalidateWallet = useInvalidateWallet();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [pendingAmount, setPendingAmount] = useState(null);

  const minTopUp = Number(summary?.minTopUp ?? FALLBACK_MIN);
  const maxTopUp = Number(summary?.maxTopUp ?? 10_000_000);
  const quickAmounts = (summary?.quickAmounts?.length
    ? summary.quickAmounts.map(Number)
    : FALLBACK_QUICK_AMOUNTS);
  const mockMode = summary?.mockMode !== false;

  useEffect(() => {
    if (amount) return;
    const defaults = summary?.quickAmounts?.length
      ? summary.quickAmounts.map(Number)
      : FALLBACK_QUICK_AMOUNTS;
    if (defaults.length) {
      setAmount(String(defaults[1] ?? defaults[0]));
    }
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

    const ok = await confirm({
      title: 'Xác nhận nạp tiền',
      message: 'Bạn có chắc muốn nạp tiền vào Ví NASA?',
      highlight: formatMoney(value),
      confirmLabel: 'Nạp tiền',
      variant: 'warning',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      if (mockMode) {
        await walletService.topUp(value);
        await invalidateWallet();
        notificationService.success(`Nạp ${formatMoney(value)} vào ví NASA thành công`);
        return;
      }

      const intent = await walletService.createTopUpIntent(value);
      if (intent?.mockMode) {
        await invalidateWallet();
        notificationService.success(`Nạp ${formatMoney(value)} vào ví NASA thành công`);
        return;
      }
      if (!intent?.clientSecret) {
        throw new Error('Không nhận được clientSecret từ máy chủ');
      }
      setPendingAmount(value);
      setClientSecret(intent.clientSecret);
    } catch (err) {
      notificationService.error(err?.message || 'Nạp tiền thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripeSuccess = async (paymentIntentId) => {
    await walletService.confirmTopUp(paymentIntentId);
    await invalidateWallet();
    setClientSecret('');
    setPendingAmount(null);
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

  return (
    <div className="account-page">
      <main className="account-page__main">
        <header className="account-page__header">
          <div>
            <span className="account-page__eyebrow">Tài khoản / Ví</span>
            <h1 className="account-page__title">Ví NASA</h1>
            <p className="account-page__intro">
              {mockMode
                ? 'Không gian mô phỏng giao dịch để kiểm thử nạp và rút tiền tức thì.'
                : 'Nạp tiền qua Stripe và theo dõi toàn bộ biến động số dư trong một nơi.'}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshWallet}
            disabled={isLoading}
            className="account-icon-button"
            aria-label="Làm mới số dư ví"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <div className="wallet-layout">
          <section className="wallet-balance" aria-labelledby="wallet-balance-title">
            <div className="wallet-balance__label" id="wallet-balance-title">
              <Wallet className="h-5 w-5" />
              Số dư khả dụng
            </div>
            {isLoading ? (
              <div className="account-loading-line" aria-label="Đang tải số dư" />
            ) : (
              <p className="wallet-balance__value">{formatMoney(summary?.balance)}</p>
            )}
            <p className="wallet-balance__provider">
              {mockMode ? 'Mock Gateway' : 'Stripe'} / {summary?.provider || (mockMode ? 'mock' : 'stripe')}
            </p>
          </section>

          <div>
            <section className="account-panel" aria-labelledby="wallet-action-title">
              <h2 className="account-panel__heading" id="wallet-action-title">
                {mockMode ? 'Nạp hoặc rút tiền' : 'Nạp tiền qua thẻ'}
              </h2>

              {clientSecret ? (
                <>
                  <p className="account-panel__copy">
                    Hoàn tất thanh toán {formatMoney(pendingAmount)} để cộng tiền vào ví.
                  </p>
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeTopUpForm
                      amount={pendingAmount}
                      onSuccess={handleStripeSuccess}
                      onCancel={() => {
                        setClientSecret('');
                        setPendingAmount(null);
                      }}
                    />
                  </Elements>
                </>
              ) : (
                <>
                  <div className="account-chip-list" aria-label="Chọn nhanh số tiền">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(String(value))}
                        className={`account-chip${Number(amount) === value ? ' is-active' : ''}`}
                        aria-pressed={Number(amount) === value}
                      >
                        {formatMoney(value)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={minTopUp}
                    max={maxTopUp}
                    step="10000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="account-input"
                    aria-label="Số tiền giao dịch"
                    placeholder={`Tối thiểu ${formatMoney(minTopUp)}`}
                  />
                  <div className="account-actions">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleTopUp}
                      className="account-action account-action--primary"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                      Nạp tiền
                    </button>
                    {mockMode && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleWithdraw}
                        className="account-action account-action--secondary"
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Rút tiền
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>

        <section className="account-panel wallet-history" aria-labelledby="wallet-history-title">
          <h2 className="account-panel__heading" id="wallet-history-title">Lịch sử giao dịch</h2>
          {transactions.length === 0 ? (
            <p className="account-panel__copy">Chưa có giao dịch. Biến động số dư sẽ xuất hiện tại đây.</p>
          ) : (
            <ul className="transaction-list">
              {transactions.map((tx) => {
                const signed = Number(tx.amount || 0);
                const positive = signed >= 0;
                const isOrderRelated = tx.type === 'REFUND' || tx.type === 'PAYMENT';
                const bookingRef = formatBookingRef(tx.bookingUuid);
                return (
                  <li key={tx.uuid} className="transaction-row">
                    <div className="min-w-0">
                      <p className="transaction-row__title">{txLabel(tx.type)}</p>
                      <p className="transaction-row__meta">{tx.description || 'Không có mô tả'}</p>
                      {isOrderRelated && (bookingRef || tx.movieTitle) && (
                        <p className="transaction-row__meta" title={tx.movieTitle || bookingRef}>
                          {tx.type === 'REFUND' ? 'Hoàn cho đơn' : 'Thanh toán đơn'}
                          {bookingRef ? ` ${bookingRef}` : ''}
                          {tx.movieTitle ? ` · ${tx.movieTitle}` : ''}
                        </p>
                      )}
                      {tx.createdAt && (
                        <time className="transaction-row__date" dateTime={tx.createdAt}>
                          {new Date(tx.createdAt).toLocaleString('vi-VN')}
                        </time>
                      )}
                    </div>
                    <div>
                      <p className={`transaction-row__amount ${positive ? 'is-positive' : 'is-negative'}`}>
                        {positive ? '+' : ''}{formatMoney(signed)}
                      </p>
                      <p className="transaction-row__balance">Sau GD: {formatMoney(tx.balanceAfter)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default WalletPage;
