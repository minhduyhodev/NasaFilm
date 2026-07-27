import { useEffect, useState } from 'react';
import {
  ArrowDownCircle, Loader2, RefreshCw, Wallet,
  X, QrCode, CreditCard, CheckCircle2, CalendarDays,
} from 'lucide-react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { walletService } from '../../../shared/services/walletService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  useWalletSummary,
  useWalletTransactions,
  useInvalidateWallet,
} from '../../../shared/hooks/queries/useWalletQuery';
import Pagination from '../../../shared/components/Pagination';
import WalletVietQRModal from './WalletVietQRModal';
import './AccountUtilityPages.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const FALLBACK_QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];
const FALLBACK_MIN = 10000;

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}\u00A0đ`;

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

const TX_FILTERS = [
  { id: null,       label: 'Tất cả' },
  { id: 'TOP_UP',   label: 'Nạp' },
  { id: 'PAYMENT',  label: 'Thanh toán' },
  { id: 'REFUND',   label: 'Hoàn' },
];

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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
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

/* ─── Method selector card ─── */
function MethodCard({ id, icon: Icon, iconColor, title, subtitle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`wallet-method-card${selected ? ' is-selected' : ''}`}
    >
      <div className="wallet-method-card__row">
        <div className={`wallet-method-card__icon ${selected ? 'is-selected' : ''}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-red-300' : iconColor}`} />
        </div>
        <div className="wallet-method-card__content">
          <p className="wallet-method-card__title">{title}</p>
          <p className="wallet-method-card__subtitle">{subtitle}</p>
        </div>
        {selected && (
          <CheckCircle2 className="wallet-method-card__check" />
        )}
      </div>
    </button>
  );
}

/* ─── Main WalletPage ─── */
const WalletPage = () => {
  const { data: summary, isLoading, refetch } = useWalletSummary();
  const invalidateWallet = useInvalidateWallet();

  const [amount,        setAmount]        = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null); // 'vietqr' | 'stripe'
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [clientSecret,  setClientSecret]  = useState('');
  const [pendingAmount, setPendingAmount] = useState(null);
  const [showVietQR,    setShowVietQR]    = useState(false);
  const [txPage,        setTxPage]        = useState(1);
  const [txPageSize,    setTxPageSize]    = useState(10);
  const [txType,        setTxType]        = useState(null);
  const [txDate,        setTxDate]        = useState('');

  const { data: txData, isLoading: isTxLoading } = useWalletTransactions(
    txPage - 1,
    txPageSize,
    txType,
    txDate || null,
  );

  const handleTxTypeChange = (type) => {
    setTxType(type);
    setTxPage(1);
  };

  const handleTxDateChange = (date) => {
    setTxDate(date);
    setTxPage(1);
  };

  const minTopUp    = Number(summary?.minTopUp ?? FALLBACK_MIN);
  const maxTopUp    = Number(summary?.maxTopUp ?? 10_000_000);
  const quickAmounts = summary?.quickAmounts?.length
    ? summary.quickAmounts.map(Number)
    : FALLBACK_QUICK_AMOUNTS;

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

    if (selectedMethod === 'vietqr') {
      setShowVietQR(true);
      return;
    }

    if (selectedMethod === 'stripe') {
      setIsSubmitting(true);
      try {
        const intent = await walletService.createTopUpIntent(value);
        if (!intent?.clientSecret) throw new Error('Không nhận được clientSecret từ máy chủ');
        setPendingAmount(value);
        setClientSecret(intent.clientSecret);
      } catch (err) {
        notificationService.error(err?.message || 'Nạp tiền thất bại');
      } finally {
        setIsSubmitting(false);
      }
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

  const transactions = txData?.content || [];
  const totalTransactions = Number(txData?.totalElements || 0);

  const methods = [
    {
      id: 'vietqr', icon: QrCode, iconColor: 'text-blue-400',
      title: 'VietQR · Chuyển khoản ngân hàng',
      subtitle: 'Quét mã QR bằng app ngân hàng, tự động xác nhận',
    },
    {
      id: 'stripe', icon: CreditCard, iconColor: 'text-violet-400',
      title: 'Stripe · Thẻ quốc tế',
      subtitle: 'Visa / Mastercard / American Express',
    },
  ];

  return (
    <div className="account-page">
      <main className="account-page__main account-page__main--wide">
        <header className="account-page__header">
          <div>
            <span className="account-page__eyebrow">Tài khoản / Ví</span>
            <h1 className="account-page__title">Ví NASA</h1>
            <p className="account-page__intro">
              Nạp tiền vào ví để thanh toán vé xem phim nhanh hơn, hỗ trợ VietQR và thẻ quốc tế.
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

        <div className="wallet-workspace">
          <div className="wallet-primary">
            <section className="account-panel" aria-labelledby="wallet-action-title">
              <h2 className="account-panel__heading" id="wallet-action-title">Nạp tiền vào ví</h2>

              {clientSecret ? (
                <>
                  <p className="account-panel__copy">
                    Hoàn tất thanh toán {formatMoney(pendingAmount)} qua Stripe để cộng tiền vào ví.
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
                  <div className="wallet-section-label">Nạp tiền vào ví</div>
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
                  <label className="wallet-amount-field">
                    <span className="wallet-section-label">Số tiền muốn nạp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        setAmount(digits.slice(0, 9));
                      }}
                      className="account-input wallet-amount-field__input"
                      aria-label="Số tiền giao dịch"
                      placeholder={`Nhập số tiền bất kỳ, tối thiểu ${formatMoney(minTopUp)}`}
                    />
                    <span className="wallet-amount-field__hint">
                      Tối thiểu {formatMoney(minTopUp)} · Tối đa {formatMoney(maxTopUp)}
                    </span>
                  </label>

                  <div className="wallet-method-section">
                    <p className="wallet-section-label">Chọn phương thức nạp tiền</p>
                    <div className="wallet-method-grid">
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

                  <div className="account-actions wallet-submit-row">
                    <button
                      type="button"
                      disabled={isSubmitting || !selectedMethod}
                      onClick={handleTopUp}
                      className="account-action account-action--primary"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
                      {selectedMethod === 'vietqr' ? 'Tạo mã QR' : 'Nạp tiền'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="wallet-balance wallet-secondary" aria-labelledby="wallet-balance-title">
            <div className="wallet-balance__badge">NASA Wallet</div>
            <div className="wallet-balance__label" id="wallet-balance-title">
              <Wallet className="h-5 w-5" />
              Số dư khả dụng
            </div>
            {isLoading ? (
              <div className="account-loading-line" aria-label="Đang tải số dư" />
            ) : (
              <p className="wallet-balance__value">{formatMoney(summary?.balance)}</p>
            )}
            <div className="wallet-balance__glow" aria-hidden />
            <p className="wallet-balance__provider">
              Live Gateway / {summary?.provider || 'stripe'}
            </p>
          </aside>
        </div>

        <section className="account-panel wallet-history wallet-history--table" aria-labelledby="wallet-history-title">
          <div className="wallet-history__head">
            <div>
              <span className="account-page__eyebrow">Dòng tiền</span>
              <h2 className="account-panel__heading" id="wallet-history-title">Lịch sử giao dịch</h2>
            </div>

            <div className="wallet-date-filter">
              <CalendarDays aria-hidden />
              <label htmlFor="wallet-transaction-date">Ngày giao dịch</label>
              <input
                id="wallet-transaction-date"
                type="date"
                value={txDate}
                onClick={(event) => event.target.showPicker?.()}
                onChange={(event) => handleTxDateChange(event.target.value)}
              />
              {txDate && (
                <button
                  type="button"
                  onClick={() => handleTxDateChange('')}
                  aria-label="Xóa ngày đã chọn"
                  title="Xem tất cả ngày"
                >
                  <X aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="wallet-tx-filters" role="tablist" aria-label="Lọc theo loại giao dịch">
            {TX_FILTERS.map((filter) => (
              <button
                key={filter.id ?? 'all'}
                type="button"
                role="tab"
                aria-selected={txType === filter.id}
                onClick={() => handleTxTypeChange(filter.id)}
                className={`wallet-tx-filter${txType === filter.id ? ' is-active' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {isTxLoading && transactions.length === 0 ? (
            <div className="account-loading-line" aria-label="Đang tải lịch sử giao dịch" />
          ) : transactions.length === 0 ? (
            <p className="wallet-table-empty">
              Không có giao dịch phù hợp với trạng thái và ngày đã chọn.
            </p>
          ) : (
            <div className="wallet-table-wrap">
              <table className="wallet-table">
                <thead>
                  <tr>
                    <th>Loại giao dịch</th>
                    <th>Chi tiết</th>
                    <th>Thời gian</th>
                    <th>Số tiền</th>
                    <th>Số dư sau giao dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const signed = Number(tx.amount || 0);
                    const positive = signed >= 0;
                    const isOrderRelated = tx.type === 'REFUND' || tx.type === 'PAYMENT';
                    const bookingRef = formatBookingRef(tx.bookingUuid);
                    return (
                      <tr key={tx.uuid}>
                        <td>
                          <span className="wallet-table__type">
                            <i
                              className={`wallet-tx-dot wallet-tx-dot--${(tx.type || 'other').toLowerCase()}`}
                              aria-hidden
                            />
                            {txLabel(tx.type)}
                          </span>
                        </td>
                        <td>
                          <strong>{tx.description || 'Không có mô tả'}</strong>
                          {isOrderRelated && (bookingRef || tx.movieTitle) && (
                            <span title={tx.movieTitle || bookingRef}>
                              {bookingRef || ''}
                              {bookingRef && tx.movieTitle ? ' · ' : ''}
                              {tx.movieTitle || ''}
                            </span>
                          )}
                        </td>
                        <td>
                          {tx.createdAt ? (
                            <time dateTime={tx.createdAt}>
                              {new Date(tx.createdAt).toLocaleString('vi-VN')}
                            </time>
                          ) : '—'}
                        </td>
                        <td>
                          <strong className={`transaction-row__amount ${positive ? 'is-positive' : 'is-negative'}`}>
                            {positive ? '+' : ''}{formatMoney(signed)}
                          </strong>
                        </td>
                        <td>{formatMoney(tx.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalTransactions > 0 && (
            <div className="wallet-history__pagination">
              <Pagination
                currentPage={txPage}
                totalItems={totalTransactions}
                itemsPerPage={txPageSize}
                onPageChange={setTxPage}
                onItemsPerPageChange={setTxPageSize}
                itemsPerPageOptions={[10, 20, 50]}
              />
            </div>
          )}
        </section>
      </main>

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
