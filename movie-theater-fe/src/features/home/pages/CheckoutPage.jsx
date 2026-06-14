import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { authService } from '../../auth/api/authService';
import { comboService } from '../../../shared/services/comboService';

// Import movie poster assets
import stelarHorizonImg from '../../../shared/assets/movie_stelar_horizon.png';
import midnightEchoImg from '../../../shared/assets/movie_midnight_echo.png';
import velvetLegacyImg from '../../../shared/assets/movie_velvet_legacy.png';
import whispersOfOakImg from '../../../shared/assets/movie_whispers_of_oak.png';
import kineticPulseImg from '../../../shared/assets/movie_kinetic_pulse.png';
import aetheriaImg from '../../../shared/assets/movie_aetheria.png';
import doraemonPoster from '../../../shared/assets/Doraemon_Movie_2026_Poster.png';
import ngoiDenPoster from '../../../shared/assets/ngoidenkyquai.webp';
import ocMuonHonPoster from '../../../shared/assets/ocmuonhon.jpg';
import maXoPoster from '../../../shared/assets/maxo.jpg';
import kumanthongPoster from '../../../shared/assets/kumanthong.jpg';
import gohanPoster from '../../../shared/assets/tam-biet-gohan.webp';
import baTronPoster from '../../../shared/assets/batron.webp';
import khachPoster from '../../../shared/assets/khach.webp';

import './CheckoutPage.css';

const movieLookup = {
  'STELAR HORIZON': { poster: stelarHorizonImg, format: 'IMAX 4K', age: 'PG-13' },
  'MIDNIGHT ECHO': { poster: midnightEchoImg, format: 'DOLBY ATMOS', age: 'T16' },
  'VELVET LEGACY': { poster: velvetLegacyImg, format: 'PREMIER', age: 'T13' },
  'WHISPERS OF OAK': { poster: whispersOfOakImg, format: 'IMAX 3D', age: 'T16' },
  'KINETIC PULSE': { poster: kineticPulseImg, format: '4DX Immersive', age: 'T16' },
  'AETHERIA': { poster: aetheriaImg, format: 'IMAX 3D', age: 'K' },
  'Doraemon: Lâu Đài Dưới Đáy Biển': { poster: doraemonPoster, format: '2D Lồng Tiếng', age: 'P' },
  'Ngôi Đền Kỳ Quái 5': { poster: ngoiDenPoster, format: '2D Phụ Đề', age: 'T16' },
  'Ốc Mượn Hồn': { poster: ocMuonHonPoster, format: '2D VN', age: 'T16' },
  'GALACTIC VANGUARD: RISING TIDE': { poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYqavNEfcS3zyX2HMQ1uG4gKIAPAyU4L9ks1n82DMfbRBzxq7IdDZK5KsLA7fIW73GWQRz13F_uaagugNXp77bEq0AnzBTzNI0b-TlyYqzpm-vk9x0NtdDREoBJemeckMbhRxyxC1bk7rk3A3EHSCZbzCyBBfq2Ic0FBiQg8LHwgi6M-oy10EodnS4_uU9tWSNGbSOU6Zs2myWZlcuBwNQ9h2CXwHAbJuA4yD9WNj5iwy5bzZbhxrtDJe-WkkbZ_qVOZqacgwbjtU', format: 'IMAX 3D', age: 'PG-13' },
  'Mortal Kombat 2': { poster: 'https://java-06.s3.ap-southeast-1.amazonaws.com/poster/MortalKombat2_Poster.jpg', format: 'IMAX 3D', age: 'T16' },
  'Kẻ Ẩn Danh': { poster: 'https://java-06.s3.ap-southeast-1.amazonaws.com/poster/KeAnDanh_Poster.jpg', format: '2D Phụ Đề', age: 'T16' },
  'Mưa Đỏ': { poster: 'https://java-06.s3.ap-southeast-1.amazonaws.com/poster/MuaDo_Poster.jpg', format: '2D Phụ Đề', age: 'T13' },
  'Thanh Gươm Diệt Quỷ': { poster: 'https://java-06.s3.ap-southeast-1.amazonaws.com/poster/ThanhGuongDietQuy_Poster.gif', format: '2D Lồng Tiếng', age: 'T16' },
  'Truy Tìm Long Diên Hương': { poster: 'https://java-06.s3.ap-southeast-1.amazonaws.com/poster/TruyTimLongDienHuong_Poster.jpg', format: '2D Phụ Đề', age: 'T13' }
};

const getMovieInfo = (title) => {
  if (!title) {
    return {
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaRGxA2n8K-9Nzi1Z6u0ZRe54rIm8VazGxDq9pkrsHJIkwSs-AfthE5koJ65mz-CX6kq2pSpRV8X-FCRD14DxV0FMhVgmm6yuP4WkR1TAMVy5PQuBCmWR3PZCMLK4lS0rCCSD7f9kayWXJFC7Vy4a7sh4h0UCZKTTA0Ra7uiCntAbwAxTj3pNKmiGWzoPhYbp3I61ngh3sEh7UpnlDqxrdMJAASqYSgLtiVKe183uMYWzHaK4D8llCcllEH9nd_45gHL4JnwtRBEo',
      format: 'IMAX 3D',
      age: 'PG-13'
    };
  }
  const key = Object.keys(movieLookup).find((k) => k.toLowerCase() === title.toLowerCase());
  return key ? movieLookup[key] : {
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaRGxA2n8K-9Nzi1Z6u0ZRe54rIm8VazGxDq9pkrsHJIkwSs-AfthE5koJ65mz-CX6kq2pSpRV8X-FCRD14DxV0FMhVgmm6yuP4WkR1TAMVy5PQuBCmWR3PZCMLK4lS0rCCSD7f9kayWXJFC7Vy4a7sh4h0UCZKTTA0Ra7uiCntAbwAxTj3pNKmiGWzoPhYbp3I61ngh3sEh7UpnlDqxrdMJAASqYSgLtiVKe183uMYWzHaK4D8llCcllEH9nd_45gHL4JnwtRBEo',
    format: 'IMAX 3D',
    age: 'PG-13'
  };
};

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract payment details from state, or fallback to mock data
  const {
    showtimeUuid = '11111111-1111-1111-1111-111111111111',
    theater = 'NASA Landmark 81 - Phòng chiếu IMAX',
    movie = 'GALACTIC VANGUARD: RISING TIDE',
    moviePoster = '',
    movieRating = null,
    movieFormat = '',
    date = 'Hôm nay, 10/06',
    showtime = '19:30',
    selectedSeats = [
      { id: 'E5', price: 120000, type: 'Ghế VIP' },
      { id: 'E6', price: 120000, type: 'Ghế VIP' }
    ],
    totalAmount = 240000
  } = location.state || {};

  const movieInfo = getMovieInfo(movie);

  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [hasCombo, setHasCombo] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherError, setVoucherError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (data) {
          setUserScore(data.score || 0);
        }
      } catch (err) {
        console.error("Failed to load user profile in CheckoutPage:", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    const fetchCombos = async () => {
      try {
        const data = await comboService.getActiveCombos();
        setCombosList(data || []);
      } catch (err) {
        console.error("Failed to load combos in CheckoutPage:", err);
      }
    };
    const fetchVouchers = async () => {
      try {
        const response = await authService.api.get('/api/promotions/my-vouchers');
        const data = response.data.data ?? response.data;
        if (Array.isArray(data)) {
          setMyVouchers(data.filter(v => v.remainingUsage > 0));
        }
      } catch (err) {
        console.error("Failed to load user vouchers in CheckoutPage:", err);
      } finally {
        setLoadingVouchers(false);
      }
    };
    fetchProfile();
    fetchCombos();
    fetchVouchers();
  }, []);

  useEffect(() => {
    if (location.state?.lockExpiresAt) {
      const calculateTimeLeft = () => {
        const diff = Math.max(0, Math.floor((location.state.lockExpiresAt - Date.now()) / 1000));
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
  }, [location.state?.lockExpiresAt]);

  const bookingFee = 15000; // 15,000 đ internet fee
  const activeCombo = combosList.find(c => c.name.toLowerCase().includes("bắp nước") || c.uuid === "55555555-5555-5555-5555-555555555555") || {
    uuid: "55555555-5555-5555-5555-555555555555",
    name: "Combo Bắp Nước",
    price: 90000
  };
  const comboOriginalPrice = activeCombo.price;
  const memberDiscountRate = userScore >= 10000 ? 0.15 : 0.10;
  const memberTier = userScore >= 10000 ? "NASA'VIP" : "NASA'FRIEND";
  const comboDiscountAmount = hasCombo ? Math.round(comboOriginalPrice * memberDiscountRate) : 0;
  const comboPrice = comboOriginalPrice - comboDiscountAmount;
  
  const ticketSum = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);
  const subtotal = ticketSum + bookingFee + (hasCombo ? comboPrice : 0);
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
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }
    await applyVoucherByCode(code, true);
  };

  const handleSelectVoucher = (code) => {
    setVoucherInput(code);
    applyVoucherByCode(code, false);
  };

  const handlePay = async () => {
    if (isExpired) {
      notificationService.error("Thời gian giữ ghế đã hết hạn!");
      return;
    }
    setIsPaying(true);
    try {
      const seatUuids = selectedSeats.map(s => s.seatUuid);
      const combos = hasCombo ? [{ comboUuid: activeCombo.uuid, quantity: 1 }] : [];
      
      await bookingService.confirmBooking(showtimeUuid, seatUuids, combos, discount > 0 ? voucherInput.trim() : null);
      
      notificationService.addNotification(
        "Đặt vé thành công",
        `Bạn đã đặt thành công vé xem phim ${movie} tại ${theater}. Suất chiếu lúc ${showtime} ngày ${date}. Ghế: ${selectedSeats.map(s => s.id).join(', ')}.`,
        "success"
      );
      
      notificationService.success(`Đặt vé thành công! Bạn đã thanh toán ${(finalTotal).toLocaleString('vi-VN')} đ bằng ${
        paymentMethod === 'wallet' ? 'Số dư tài khoản' : paymentMethod === 'card' ? 'Thẻ Visa/Mastercard' : 'Apple Pay'
      }.`);
      
      navigate('/profile');
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      notificationService.error(error.message || "Thanh toán thất bại. Vui lòng thử lại.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="checkout-wrapper">
      <Navbar />
      
      <main className="mt-8 flex-grow pt-4 pb-20 px-4 md:px-16 lg:px-20 max-w-7xl mx-auto w-full">
        {/* Navigation Breadcrumb / Back Action */}
        <div 
          className="mb-8 flex items-center gap-2 group cursor-pointer w-fit" 
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-[#c8c6c8] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-sm font-semibold text-[#c8c5ca] group-hover:text-white transition-colors">Quay lại chọn ghế</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Order Summary & Details */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <section className="glass-panel p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-6 border-l-4 border-red-600 pl-4 uppercase tracking-wider text-white">Tóm tắt đơn hàng</h2>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/5 bg-[#0f121d]">
                  <img className="w-full h-full object-cover" alt="Movie Poster" src={moviePoster || movieInfo.poster} />
                </div>
                <div className="flex flex-col justify-between py-1 flex-grow">
                  <div>
                    <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-wide mb-2">{movie}</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-[#c8c5ca]">
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        <span className="text-xs font-semibold">{date}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#c8c5ca]">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span className="text-xs font-semibold">{showtime} • {theater.includes('IMAX') ? 'Phòng chiếu IMAX' : 'Phòng chiếu VIP'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-yellow-400 font-bold">
                        <span className="material-symbols-outlined text-[18px] fill-current">event_seat</span>
                        <span className="text-xs font-bold uppercase tracking-wide">Ghế: {selectedSeats.map(s => s.id).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <span className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-[10px] font-black border border-white/10 uppercase tracking-wide">{movieFormat || movieInfo.format}</span>
                    <span className="bg-red-600/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black border border-red-500/20">{movieInfo.age}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Chi tiết thanh toán</h2>
              <div className="space-y-4">
                {/* Seat tickets breakdown */}
                {Object.entries(seatGroupBreakdown).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-[#c8c5ca]">
                    <span className="text-xs font-semibold">{type} ({data.count}x)</span>
                    <span className="text-xs font-bold text-white">{(data.sum).toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}

                {/* Booking Fee */}
                <div className="flex justify-between items-center text-[#c8c5ca]">
                  <span className="text-xs font-semibold">Phí giao dịch trực tuyến</span>
                  <span className="text-xs font-bold text-white">{(bookingFee).toLocaleString('vi-VN')} đ</span>
                </div>

                {/* Combo pack selection toggle */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={hasCombo} 
                        onChange={(e) => setHasCombo(e.target.checked)}
                        className="rounded border-white/20 bg-transparent text-red-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Thêm {activeCombo.name}</span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          1 Bắp lớn + 2 Nước ngọt cỡ vừa (Thành viên: {memberTier} -{memberDiscountRate * 100}%)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {hasCombo && (
                        <span className="text-[10px] line-through text-gray-500 block">{(comboOriginalPrice).toLocaleString('vi-VN')} đ</span>
                      )}
                      <span className="text-xs font-extrabold text-yellow-400">{(comboPrice).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </label>
                </div>

                {hasCombo && (
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
          </div>

          {/* Right Column: Payment Options & CTA */}
          <div className="lg:col-span-5 space-y-6">
            <section className="glass-panel p-6 rounded-2xl flex flex-col h-full text-left">
              {timeLeft !== null && (
                <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold mb-6 ${
                  timeLeft < 60 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>Thời gian thanh toán còn lại:</span>
                  </div>
                  <span className="font-mono text-sm font-black">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-wider">Phương thức thanh toán</h2>
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
                    <div className="text-xs font-bold text-white">Số dư tài khoản</div>
                    <div className="text-[10px] font-semibold text-gray-400">Ví credits (Đang có: 500.000 đ)</div>
                  </div>
                  <span className="material-symbols-outlined text-red-500 fill-current">account_balance_wallet</span>
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
                  <span className="material-symbols-outlined text-[#c8c5ca]">credit_card</span>
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
                  <span className="material-symbols-outlined text-[#c8c5ca]">account_balance</span>
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
                    <span className="material-symbols-outlined text-[12px]">info</span> {voucherError}
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

      <Footer />

      {isExpired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center border border-red-500/30 bg-[#111215] shadow-2xl space-y-4">
            <span className="material-symbols-outlined text-red-500 text-5xl">warning</span>
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
