import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2, RefreshCw, Wallet } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { walletService } from '../../../shared/services/walletService';
import { notificationService } from '../../../shared/services/notificationService';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];

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

const WalletPage = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState('200000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await walletService.getWallet();
      setSummary(data);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải thông tin ví');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleTopUp = async () => {
    const value = Number(amount);
    if (!value || value < 10000) {
      notificationService.warning('Số tiền nạp tối thiểu 10.000đ');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await walletService.topUp(value);
      setSummary(data);
      notificationService.success(`Nạp ${formatMoney(value)} vào ví thành công (mock)`);
    } catch (err) {
      notificationService.error(err?.message || 'Nạp tiền thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    const value = Number(amount);
    if (!value || value < 10000) {
      notificationService.warning('Số tiền rút tối thiểu 10.000đ');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await walletService.withdraw(value);
      setSummary(data);
      notificationService.success(`Rút ${formatMoney(value)} thành công (mock)`);
    } catch (err) {
      notificationService.error(err?.message || 'Rút tiền thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const transactions = summary?.recentTransactions || [];

  return (
    <div className="text-white min-h-screen bg-[#0b0f19]">
      <Navbar />

      <main className="pt-28 pb-16 px-4 md:px-8 lg:px-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Tài khoản</span>
              <h1 className="mt-2 text-3xl md:text-4xl font-black uppercase font-heading">Ví NASA</h1>
              <p className="mt-3 text-sm text-gray-400">
                Chế độ demo — nạp/rút mô phỏng, không kết nối cổng thanh toán thật.
              </p>
            </div>
            <button
              type="button"
              onClick={loadWallet}
              disabled={isLoading}
              className="rounded-full border border-white/10 p-3 hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="Làm mới"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

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
            {summary?.mockMode && (
              <p className="mt-3 text-xs text-amber-400/90 font-semibold">Mock Gateway · {summary?.provider || 'mock'}</p>
            )}
          </div>

          <div className="rounded-[24px] border border-white/5 bg-[#111216]/60 p-6 mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Nạp / Rút tiền mô phỏng</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_AMOUNTS.map((value) => (
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
            <input
              type="number"
              min="10000"
              step="10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl bg-[#0f172a] border border-[#242d42] px-4 py-3 text-white mb-4 focus:outline-none focus:border-red-500/40"
              placeholder="Nhập số tiền"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleTopUp}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                <ArrowDownCircle className="h-4 w-4" />
                Nạp tiền
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleWithdraw}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-wider disabled:opacity-50"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Rút tiền
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/5 bg-[#111216]/60 p-6">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4">Lịch sử giao dịch</h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có giao dịch.</p>
            ) : (
              <ul className="space-y-3">
                {transactions.map((tx) => {
                  const signed = Number(tx.amount || 0);
                  const positive = signed >= 0;
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

      <Footer />
    </div>
  );
};

export default WalletPage;
