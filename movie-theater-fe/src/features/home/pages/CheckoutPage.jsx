import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Armchair, Wallet, CreditCard, Landmark, Info, AlertTriangle } from 'lucide-react';
import { vodService } from '../../../shared/services/vodService';
import { getMemberDiscountRate, getMemberTierLabel } from '../../../shared/constants/member';
import { bookingService } from '../../../shared/services/bookingService';
import { authService } from '../../auth/api/authService';
import { movieService } from '../../../shared/services/movieService';
import { getMoviePosterUrl } from '../utils/movieUtils';
import { notificationService } from '../../../shared/services/notificationService';
import { promotionService } from '../../../shared/services/promotionService';
import { walletService } from '../../../shared/services/walletService';
import PosterImage from '../../../shared/components/PosterImage';

import './CheckoutPage.css';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [checkoutState] = useState(() => {
    if (location.state) {
      try {
        sessionStorage.setItem('checkout_state', JSON.stringify(location.state));
      } catch (e) {
        console.error('Failed to save checkout state to sessionStorage:', e);
      }
      return location.state;
    }
    try {
      const saved = sessionStorage.getItem('checkout_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse checkout state from sessionStorage:', e);
    }
    return null;
  });

  const isStateValid = Boolean(
    checkoutState &&
      ((checkoutState.isVod && checkoutState.movieUuid) ||
        (!checkoutState.isVod && checkoutState.showtimeUuid))
  );

  const isVod = checkoutState?.isVod ?? false;
  const showtimeUuid = checkoutState?.showtimeUuid ?? '';
  const theater = checkoutState?.theater ?? '';
  const movie = checkoutState?.movie ?? '';
  const moviePoster = checkoutState?.moviePoster ?? '';
  const movieRating = checkoutState?.movieRating ?? null;
  const movieFormat = checkoutState?.movieFormat ?? '';
  const movieAgeRestriction = checkoutState?.movieAgeRestriction ?? '';
  const date = checkoutState?.date ?? '';
  const showtime = checkoutState?.showtime ?? '';
  const selectedSeats = checkoutState?.selectedSeats ?? [];
  const totalAmount = checkoutState?.totalAmount ?? 0;
  const movieUuid = checkoutState?.movieUuid ?? '';
  const durationMinutes = checkoutState?.durationMinutes ?? 0;
  const lockExpiresAt = checkoutState?.lockExpiresAt ?? null;

  const [vodMovieMeta, setVodMovieMeta] = useState({ poster: '', ageRestriction: '' });
  const [theaterMovieMeta, setTheaterMovieMeta] = useState({ poster: '', ageRestriction: '' });
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [checkoutCombos, setCheckoutCombos] = useState(() => checkoutState?.selectedCombos || []);
  const [voucherInput, setVoucherInput] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [myVouchers, setMyVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  useEffect(() => {
    if (!isStateValid) {
      notificationService.error('Phiên giao dịch không hợp lệ hoặc đã hết hạn.');
      navigate('/', { replace: true });
    }
  }, [isStateValid, navigate]);

  useEffect(() => {
    if (!isStateValid || !isVod || !movieUuid) return;
    let cancelled = false;
    movieService
      .getMovieDetail(movieUuid)
      .then((detail) => {
        if (!cancelled) {
          setVodMovieMeta({
            poster: getMoviePosterUrl(detail),
            ageRestriction: detail.ageRestriction || '',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStateValid, isVod, movieUuid]);

  useEffect(() => {
    if (!isStateValid || isVod || !movieUuid) return;
    let cancelled = false;
    movieService
      .getMovieDetail(movieUuid)
      .then((detail) => {
        if (!cancelled) {
          setTheaterMovieMeta({
            poster: getMoviePosterUrl(detail),
            ageRestriction: detail.ageRestriction || '',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStateValid, isVod, movieUuid]);

  const resolvedPoster = isVod
    ? moviePoster || vodMovieMeta.poster
    : moviePoster || theaterMovieMeta.poster;
  const resolvedAge = isVod
    ? movieAgeRestriction || vodMovieMeta.ageRestriction
    : movieAgeRestriction || theaterMovieMeta.ageRestriction;
  const resolvedFormat = isVod ? 'VOD Online' : movieFormat;

  useEffect(() => {
    if (!isStateValid) return;
    window.scrollTo(0, 0);
    const fetchProfile = async () => {
      try {
        const [profile, wallet] = await Promise.all([
          authService.getProfile(),
          walletService.getWallet().catch(() => null),
        ]);
        if (profile) {
          setUserScore(profile.score || 0);
        }
        if (wallet?.balance != null) {
          setWalletBalance(Number(wallet.balance));
        }
      } catch (err) {
        console.error('Failed to load user profile in CheckoutPage:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    const fetchVouchers = async () => {
      try {
        const data = await promotionService.getMyVouchers();
        if (Array.isArray(data)) {
          setMyVouchers(data.filter((v) => v.remainingUsage > 0));
        }
      } catch (err) {
        console.error('Failed to load user vouchers in CheckoutPage:', err);
      } finally {
        setLoadingVouchers(false);
      }
    };
    fetchProfile();
    fetchVouchers();
  }, [isStateValid]);

  useEffect(() => {
    if (!isStateValid || isVod) return;
    if (lockExpiresAt) {
      const calculateTimeLeft = () => {
        const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
        if (diff <= 0) {
          setIsExpired(true);
          setTimeLeft(0);
        } else {
          setTimeLeft(diff);
        }
      };
      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [isStateValid, isVod, lockExpiresAt]);

  const memberDiscountRate = getMemberDiscountRate(userScore);
  const memberTier = getMemberTierLabel(userScore);
  const comboOriginalPrice = checkoutCombos.reduce((sum, c) => sum + (c.price * c.quantity), 0);
  const comboDiscountAmount = Math.round(comboOriginalPrice * memberDiscountRate);
  const comboPrice = comboOriginalPrice - comboDiscountAmount;
  const hasCombo = checkoutCombos.length > 0;
  
  const ticketSum = isVod ? totalAmount : selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
  const subtotal = ticketSum + comboPrice;
  const finalTotal = Math.max(0, subtotal - discount);

  // Group seats by type for breakdown display
  const seatGroupBreakdown = selectedSeats.reduce((acc, seat) => {
    if (!acc[seat.type]) {
      acc[seat.type] = { count: 0, sum: 0 };
    }
    acc[seat.type].count += 1;
    acc[seat.type].sum += seat.price;
    return acc;
  }, {});

  const applyVoucherByCode = async (code, showNotification = true) => {
    try {
      const response = await authService.api.get(`/api/promotions/validate?code=${encodeURIComponent(code)}`);
      const promo = response.data.data ?? response.data;

      if (promo.valid) {
        let calculatedDiscount = 0;
        if (promo.discountType === 'PERCENTAGE') {
          calculatedDiscount = Math.round(ticketSum * promo.discountValue);
        } else if (promo.discountType === 'FIXED_AMOUNT') {
          calculatedDiscount = Math.round(promo.discountValue);
        }

        setDiscount(calculatedDiscount);
        setVoucherError('');
        if (showNotification) {
          notificationService.success(`Áp dụng mã giảm giá thành công: ${promo.description}`);
        }
      } else {
        setDiscount(0);
        setVoucherError(promo.errorMessage || 'Mã giảm giá không hợp lệ.');
        notificationService.error(promo.errorMessage || 'Mã giảm giá không hợp lệ.');
      }
    } catch (error) {
      setDiscount(0);
      const errorMsg = error.message || 'Lỗi hệ thống khi xác thực mã giảm giá.';
      setVoucherError(errorMsg);
      notificationService.error(errorMsg);
    }
  };

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim();
    if (code === '') {
      setDiscount(0);
      setVoucherError('');
      notificationService.success('Đã hủy áp dụng mã giảm giá.');
      return;
    }
    await applyVoucherByCode(code, true);
  };

  const handleSelectVoucher = (code) => {
    const isAlreadySelected = voucherInput.trim().toUpperCase() === code.toUpperCase() && discount > 0;
    if (isAlreadySelected) {
      setVoucherInput('');
      setDiscount(0);
      setVoucherError('');
      notificationService.success('Đã bỏ chọn mã giảm giá.');
    } else {
      setVoucherInput(code);
      applyVoucherByCode(code, false);
    }
  };

  const handlePay = async () => {
    if (!isVod && isExpired) {
      notificationService.error("Thời gian giữ ghế đã hết hạn!");
      return;
    }
    if (paymentMethod === 'wallet' && walletBalance < finalTotal) {
      notificationService.warning('Số dư ví không đủ. Vui lòng nạp thêm tại trang Ví NASA.');
      navigate('/wallet');
      return;
    }
    setIsPaying(true);
    try {
      let response;
      if (isVod) {
        response = await vodService.confirmOnlineBooking(movieUuid, discount > 0 ? voucherInput.trim() : null, paymentMethod);
      } else {
        const seatUuids = selectedSeats.map(s => s.seatUuid);
        const combos = checkoutCombos.map(c => ({ comboUuid: c.comboUuid, quantity: c.quantity }));
        response = await bookingService.confirmBooking(showtimeUuid, seatUuids, combos, discount > 0 ? voucherInput.trim() : null, paymentMethod);
      }
      
      const successMessage = isVod
        ? `Mua vé xem phim Online thành công! Hãy kích hoạt mã vé để bắt đầu xem.`
        : `Bạn đã đặt thành công vé xem phim ${movie} tại ${theater}. Suất chiếu lúc ${showtime} ngày ${date}. Ghế: ${selectedSeats.map(s => s.id).join(', ')}.`;
      
      notificationService.addNotification(
        "Đặt vé thành công",
        successMessage,
        "success"
      );
      
      notificationService.success(`Đặt vé thành công! Bạn đã thanh toán ${(finalTotal).toLocaleString('vi-VN')} đ bằng ${
        paymentMethod === 'wallet' ? 'Số dư tài khoản' : paymentMethod === 'card' ? 'Thẻ Visa/Mastercard' : 'Apple Pay'
      }.`);
      
      navigate('/booking-confirmed', {
        state: {
          bookingUuid: response.bookingUuid,
          movie: movie,
          moviePoster: resolvedPoster,
          movieFormat: isVod ? 'VOD Online' : resolvedFormat,
          movieRating: resolvedAge,
          theater: isVod ? 'Trình phát video NASA VOD' : theater,
          date: isVod ? 'Mọi lúc, mọi nơi' : date,
          showtime: isVod ? 'Xem trực tuyến' : showtime,
          selectedSeats: selectedSeats,
          tickets: response.tickets || [],
          totalPrice: finalTotal,
          combos: response.combos || [],
          isVod: isVod,
          movieUuid: movieUuid
        },
        replace: true
      });
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      notificationService.error(error.message || "Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setIsPaying(false);
    }
  };

  if (!isStateValid) {
    return null;
  }

  return (
    <div className="checkout-wrapper">
      
      <main className="mt-8 flex-grow pt-4 pb-20 px-4 md:px-16 lg:px-20 max-w-7xl mx-auto w-full">
        {/* Navigation Breadcrumb / Back Action */}
        <div 
          className="mb-8 flex items-center gap-2 group cursor-pointer w-fit" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4.5 h-4.5 text-[#c8c6c8] group-hover:-translate-x-1 group-hover:text-white transition-all duration-300 shrink-0" />
          <span className="text-sm font-semibold text-[#c8c5ca] group-hover:text-white transition-colors">
            {isVod ? 'Quay lại chi tiết phim' : 'Quay lại chọn ghế'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Order Summary & Details */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <section className="glass-panel p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-6 border-l-4 border-red-600 pl-4 uppercase tracking-wider text-white">Tóm tắt đơn hàng</h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/5 bg-[#0f121d]">
                  <PosterImage className="w-full h-full object-cover" alt="Movie Poster" src={resolvedPoster} width={400} />
                </div>
                <div className="flex flex-col justify-between py-1 flex-grow">
                  <div>
                    <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-wide mb-2">{movie}</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-[#c8c5ca]">
                        <Calendar className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-semibold">{date}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#c8c5ca]">
                        <Clock className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
                        <span className="text-xs font-semibold">{showtime} • {isVod ? theater : (theater.includes('IMAX') ? 'Phòng chiếu IMAX' : 'Phòng chiếu VIP')}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-yellow-400 font-bold">
                        <Armchair className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/10 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wide">
                          {isVod ? 'Vé xem trực tuyến (VOD)' : `Ghế: ${selectedSeats.map(s => s.id).join(', ')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-[10px] font-black border border-white/10 uppercase tracking-wide">{resolvedFormat}</span>
                    {resolvedAge && (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${
                        resolvedAge.toUpperCase() === 'P' 
                          ? 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20' 
                          : resolvedAge.toUpperCase().includes('T18') 
                            ? 'bg-red-600/10 text-red-500 border-red-500/20' 
                            : 'bg-amber-600/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {resolvedAge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Chi tiết thanh toán</h2>
              <div className="space-y-4">
                {/* Seat tickets breakdown */}
                {!isVod && Object.entries(seatGroupBreakdown).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-[#c8c5ca]">
                    <span className="text-xs font-semibold">{type} ({data.count}x)</span>
                    <span className="text-xs font-bold text-white">{(data.sum).toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}

                {isVod && (
                  <div className="flex justify-between items-center text-[#c8c5ca]">
                    <span className="text-xs font-semibold">Vé xem phim trực tuyến (VOD)</span>
                    <span className="text-xs font-bold text-white">{(totalAmount).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {/* Selected Combo packs breakdown */}
                {!isVod && (
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Combo bắp nước đã chọn</h3>
                    {checkoutCombos.length === 0 ? (
                      <div className="text-gray-500 font-medium text-xs py-3 text-center italic">
                        Không mua kèm bắp nước.
                      </div>
                    ) : (
                      checkoutCombos.map(combo => (
                        <div key={combo.comboUuid} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/5">
                          <div>
                            <span className="text-xs font-bold text-white block">{combo.name}</span>
                            <span className="text-[10px] font-semibold text-gray-400">Số lượng: {combo.quantity}</span>
                          </div>
                          <span className="text-xs font-extrabold text-yellow-400">{(combo.price * combo.quantity).toLocaleString('vi-VN')} đ</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {hasCombo && !isVod && (
                  <div className="flex justify-between items-center text-[#c8c5ca]">
                    <span className="text-xs font-semibold">Ưu đãi thành viên ({memberTier})</span>
                    <span className="text-xs font-bold text-green-500">-{comboDiscountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {/* Voucher discount */}
                {discount > 0 && (
                  <div className="flex justify-between items-center text-red-500 font-bold">
                    <span className="text-xs">Mã giảm giá áp dụng</span>
                    <span className="text-xs">-{discount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-base font-bold text-white">Tổng cộng</span>
                  <span className="text-base font-extrabold text-yellow-400">{(finalTotal).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </section>

            {isVod && (
              <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-6 space-y-3 text-xs leading-relaxed text-purple-300 text-left">
                <p className="font-bold text-purple-400 text-sm uppercase tracking-wider">Điều khoản dịch vụ VOD:</p>
                <ul className="list-disc pl-5 space-y-2 font-medium">
                  <li>Vé xem có thời hạn sử dụng trong vòng <span className="font-extrabold text-white">{(durationMinutes * 2) || 240} phút</span> kể từ lần đầu tiên nhấn nút xem phim.</li>
                  <li>Mỗi vé chỉ hỗ trợ phát trên <span className="font-extrabold text-white">01 thiết bị duy nhất</span> tại cùng một thời điểm.</li>
                  <li>Mọi hành vi sao chép, chia sẻ stream trái phép sẽ bị hệ thống tự động khóa tài khoản vĩnh viễn.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Payment Options & CTA */}
          <div className="lg:col-span-5 space-y-6">
            <section className="glass-panel p-6 rounded-2xl flex flex-col h-full text-left">
              {timeLeft !== null && !isVod && (
                <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold mb-6 ${
                  timeLeft < 60 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 shrink-0 ${timeLeft < 60 ? 'text-red-500' : 'text-amber-500'}`} />
                    <span>Thời gian thanh toán còn lại:</span>
                  </div>
                  <span className="font-mono text-sm font-black">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold mb-2 text-white uppercase tracking-wider">Phương thức thanh toán</h2>
              <p className="text-[11px] text-amber-400/90 font-semibold mb-6 px-1">
                Chế độ demo — Ví NASA trừ số dư thật (mock), thẻ/Apple Pay qua Mock Gateway. Cổng VNPay/MoMo sẽ tích hợp sau.
              </p>
              <div className="space-y-4 flex-grow">
                {/* Wallet Balance */}
                <label className={`relative flex items-center p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all group active:scale-[0.99] ${
                  paymentMethod === 'wallet' ? 'border-red-600/50 bg-red-600/5 ring-1 ring-red-600/20' : 'border-white/10 bg-white/5'
                }`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                    paymentMethod === 'wallet' ? 'border-red-600 bg-red-600' : 'border-white/30'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-grow">
                    <div className="text-xs font-bold text-white">Ví NASA</div>
                    <div className="text-[10px] font-semibold text-gray-400">
                      {loadingProfile
                        ? 'Đang tải số dư...'
                        : `Số dư: ${walletBalance.toLocaleString('vi-VN')} đ · ${memberTier}`}
                    </div>
                  </div>
                  <Wallet className="w-5 h-5 text-red-500 shrink-0 fill-red-500/10" />
                </label>

                {/* Credit Card */}
                <label className={`relative flex items-center p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all group active:scale-[0.99] ${
                  paymentMethod === 'card' ? 'border-red-600/50 bg-red-600/5 ring-1 ring-red-600/20' : 'border-white/10 bg-white/5'
                }`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                    paymentMethod === 'card' ? 'border-red-600 bg-red-600' : 'border-white/30'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-grow">
                    <div className="text-xs font-bold text-white">Thẻ Quốc Tế Visa/Mastercard</div>
                    <div className="text-[10px] font-semibold text-gray-400">Visa liên kết đuôi **** 4429</div>
                  </div>
                  <CreditCard className="w-5 h-5 text-[#c8c5ca] group-hover:text-white transition-colors shrink-0" />
                </label>

                {/* Apple Pay / MoMo */}
                <label className={`relative flex items-center p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all group active:scale-[0.99] ${
                  paymentMethod === 'apple' ? 'border-red-600/50 bg-red-600/5 ring-1 ring-red-600/20' : 'border-white/10 bg-white/5'
                }`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={paymentMethod === 'apple'}
                    onChange={() => setPaymentMethod('apple')}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                    paymentMethod === 'apple' ? 'border-red-600 bg-red-600' : 'border-white/30'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-grow">
                    <div className="text-xs font-bold text-white">Ví Điện Tử (MoMo / ZaloPay)</div>
                    <div className="text-[10px] font-semibold text-gray-400">Thanh toán nhanh chóng, an toàn</div>
                  </div>
                  <Landmark className="w-5 h-5 text-[#c8c5ca] group-hover:text-white transition-colors shrink-0" />
                </label>
              </div>

              {/* Voucher Section */}
              <div className="mt-8 pt-6 border-t border-white/5">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2.5 ml-1 tracking-wider">Áp dụng Voucher</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nhập mã KM (Ví dụ: THDPV50, CINELUXE)"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-grow focus:outline-none focus:border-red-500/50 text-xs text-white transition-colors uppercase tracking-wider font-bold"
                  />
                  <button 
                    onClick={handleApplyVoucher}
                    className="bg-white/10 text-white hover:bg-white/15 px-5 py-3 rounded-xl font-bold text-xs uppercase cursor-pointer active:scale-95 transition-all"
                  >
                    Áp dụng
                  </button>
                </div>
                {voucherError && (
                  <p className="text-[10px] text-red-500 font-semibold mt-2 ml-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-red-500 shrink-0" /> {voucherError}
                  </p>
                )}

                {/* Selectable vouchers list */}
                {myVouchers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wider">Voucher của bạn:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {myVouchers.map((v) => {
                        const isSelected = voucherInput.trim().toUpperCase() === v.code.toUpperCase() && discount > 0;
                        return (
                          <div 
                            key={v.id}
                            onClick={() => handleSelectVoucher(v.code)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-red-500/50 bg-red-500/10' 
                                : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            <div className="pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-400">{v.code}</span>
                                {v.oncePerUser && (
                                  <span className="bg-red-500/10 text-red-400 text-[8px] font-bold px-1 py-0.5 rounded uppercase border border-red-500/20">1 lần/user</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 block mt-0.5">{v.description}</span>
                              {v.endDate && (
                                <span className="text-[8px] text-gray-500 block mt-0.5">
                                  Hạn dùng: {new Date(v.endDate).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                                isSelected 
                                  ? 'bg-red-600 text-white shadow-md shadow-red-600/25' 
                                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              {isSelected ? 'Đang áp dụng' : 'Chọn'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Total & CTA */}
              <div className="mt-12 pt-6 border-t border-white/10">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Tổng tiền thanh toán</span>
                    <span className="text-3xl font-black text-white leading-none">{(finalTotal).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wider">Đã bao gồm VAT</span>
                  </div>
                </div>
                
                <button 
                  onClick={handlePay}
                  disabled={isPaying || isExpired}
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                    isPaying || isExpired
                      ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-white/5 shadow-none' 
                      : 'bg-[#E61E2A] text-white neon-glow-red hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-[0_0_20px_rgba(230,30,42,0.35)]'
                  }`}
                >
                  {isPaying ? 'Đang xử lý thanh toán...' : isExpired ? 'Đã hết hạn giữ ghế' : 'Xác nhận & Thanh toán'}
                </button>
                <p className="text-center text-[10px] font-medium text-gray-500 mt-4 leading-relaxed">
                  Bằng cách nhấn xác nhận, bạn đồng ý với các Điều khoản Sử dụng và Chính sách Bảo mật của THDPV CINEMA.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {isExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center border border-red-500/30 bg-[#111215] shadow-2xl space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-bounce shrink-0" />
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Hết hạn giữ ghế!</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Đã quá 5 phút giữ ghế kể từ lúc chọn. Ghế của bạn đã được giải phóng để người khác chọn. Vui lòng quay lại để chọn ghế mới.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              Quay lại chọn ghế
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
