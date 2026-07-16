import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authService } from '../auth/api/authService';
import { bookingService } from '../../shared/services/bookingService';
import { vodService } from '../../shared/services/vodService';
import { notificationService } from '../../shared/services/notificationService';
import { orbitService } from '../../shared/services/orbitService';
import { showMissionCompletionToasts } from '../../shared/services/missionService';
import { clearAllBookingSessions } from '../../shared/utils/bookingSessionStorage';
import { removeOrbitRoom } from '../../shared/utils/orbitRecentStorage';
import { useConfirm } from '../../shared/context/ConfirmDialogContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ amount, checkoutState, onSuccess, onFail }) {
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

    setLoading(false);

    if (error) {
      setMessage(error.message || 'Thanh toán thất bại');
      if (onFail) onFail(error);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Thanh toán thành công! Đang xác nhận đặt vé...');
      if (onSuccess) onSuccess(paymentIntent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <PaymentElement />
      </div>

      {/* Bỏ tóm tắt đơn hàng ở form nhỏ, chuyển sang cột bên trái ở giao diện chính */}

      <button
        disabled={!stripe || loading}
        className="w-full bg-[#E61E2A] hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
      >
        {loading ? 'Đang xử lý...' : `Thanh toán ${amount.toLocaleString('vi-VN')} đ`}
      </button>

      {message && (
        <div className={`text-center text-sm mt-2 font-medium ${message.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </div>
      )}
    </form>
  );
}

export default function PaymentFlow() {
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  // Full checkout state passed from CheckoutPage
  const checkoutState = location.state?.checkoutState || {};
  const [clientSecret, setClientSecret] = useState('');
  const [amount, setAmount] = useState(location.state?.amount || 150000);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleBack = async () => {
    if (checkoutState.isOrbit && checkoutState.orbitRoomUuid) {
      const ok = await confirm({
        title: 'Rời trang thanh toán',
        message: 'Quay lại sẽ hủy phiên thanh toán nhóm. Bạn có chắc muốn tiếp tục?',
        confirmLabel: 'Quay lại',
        variant: 'warning',
      });
      if (!ok) return;
      try {
        await orbitService.abortCheckout(checkoutState.orbitRoomUuid);
      } catch (err) {
        console.error('Failed to abort checkout on back navigation:', err);
      }
      navigate(`/booking/orbit/${checkoutState.orbitRoomUuid}`);
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (location.state?.amount && !clientSecret && !isInitializing) {
      handleCreateIntent();
    }
  }, []);

  const handleCreateIntent = async () => {
    setIsInitializing(true);
    try {
      const { data } = await authService.api.post('/v1/payments/payment-intents', {
        amount,
        currency: 'vnd',
      });
      if (data.success && data.data?.clientSecret) {
        setClientSecret(data.data.clientSecret);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể khởi tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSuccess = async (paymentIntent) => {
    setIsConfirming(true);
    try {
      const {
        isVod, movieUuid, showtimeUuid, selectedSeats,
        selectedCombos, orbitRoomUuid, movie, theater,
        date, showtime, moviePoster, voucherCode,
      } = checkoutState;

      let response;
      if (isVod && movieUuid) {
        response = await vodService.confirmOnlineBooking(movieUuid, voucherCode || null, 'card');
      } else if (showtimeUuid) {
        const seatUuids = selectedSeats?.map(s => s.seatUuid) || [];
        const combos = selectedCombos?.map(c => ({ comboUuid: c.comboUuid, quantity: c.quantity })) || [];
        response = await bookingService.confirmBooking(
          showtimeUuid,
          seatUuids,
          combos,
          voucherCode || null,
          'card',
          orbitRoomUuid || null,
          paymentIntent?.id || null,
        );
      } else {
        // Fallback: no booking state – just show success
        navigate(`/payment-success?payment_intent=${paymentIntent.id}&status=${paymentIntent.status}`);
        return;
      }

      notificationService.addNotification(
        'Đặt vé thành công',
        `Thanh toán thành công cho vé xem phim ${movie}.`,
        'success',
      );
      notificationService.success(`Đặt vé thành công! Đã thanh toán ${amount.toLocaleString('vi-VN')} đ qua Thẻ Visa/Mastercard.`);
      showMissionCompletionToasts(response?.missionCompletions);
      clearAllBookingSessions();
      if (orbitRoomUuid) {
        removeOrbitRoom(orbitRoomUuid);
      }

      if (isVod) {
        navigate('/booking-confirmed', {
          state: {
            bookingUuid: response.bookingUuid,
            movie,
            moviePoster,
            movieFormat: 'VOD Online',
            theater: 'Trình phát video NASA VOD',
            date: 'Mọi lúc, mọi nơi',
            showtime: 'Xem trực tuyến',
            selectedSeats: selectedSeats || [],
            tickets: response.tickets || [],
            totalPrice: amount,
            combos: response.combos || [],
            isVod: true,
            movieUuid,
          },
          replace: true,
        });
      } else {
        navigate(`/pre-show/boarding/${response.bookingUuid}`, {
          state: { justConfirmed: true },
          replace: true,
        });
      }
    } catch (err) {
      console.error('Booking confirmation failed after Stripe payment:', err);
      notificationService.error(err.message || 'Stripe thanh toán thành công nhưng xác nhận vé thất bại. Vui lòng liên hệ hỗ trợ.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFail = (error) => {
    notificationService.error(error.message || 'Thanh toán thất bại.');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pt-24 pb-12 flex flex-col items-center px-4 md:px-8 relative z-10">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 flex flex-col md:flex-row">
        
        {/* LEFT COLUMN: Order Details */}
        <div className="w-full md:w-5/12 bg-[#0b0f19]/90 p-8 flex flex-col border-r border-white/5">
          <div 
            className="mb-6 flex items-center gap-2 group cursor-pointer w-fit text-slate-400 hover:text-white transition-colors" 
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold">Quay lại chọn ghế</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">Đơn Hàng Của Bạn</h2>
          </div>

          {checkoutState?.movie ? (
            <div className="flex-1 flex flex-col">
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-36 rounded-lg overflow-hidden shrink-0 shadow-lg relative">
                  <img src={checkoutState.moviePoster || 'https://via.placeholder.com/150'} alt={checkoutState.movie} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border border-white/10 rounded-lg"></div>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-black text-white leading-tight mb-2">{checkoutState.movie}</h3>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-white">2D Phụ Đề</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-slate-400 text-sm">Thời gian</span>
                  <span className="text-white font-medium text-sm text-right">
                    <span className="text-red-400 font-bold">{checkoutState.showtime}</span><br />
                    {checkoutState.date}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-slate-400 text-sm">Ghế ngồi</span>
                  <span className="text-white font-medium text-sm text-right max-w-[60%] truncate">
                    {checkoutState.selectedSeats?.map(s => s.id).join(', ')}
                  </span>
                </div>

                {checkoutState.selectedCombos?.length > 0 && (
                  <div className="flex justify-between items-start pb-4 border-b border-white/10">
                    <span className="text-slate-400 text-sm">Bắp nước</span>
                    <span className="text-white font-medium text-sm text-right flex flex-col gap-1">
                      {checkoutState.selectedCombos.map(c => (
                        <span key={c.comboUuid}>{c.quantity}x {c.name || 'Combo'}</span>
                      ))}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-dashed border-white/20">
                <div className="flex justify-between items-end">
                  <span className="text-slate-300 font-medium">Tổng thanh toán</span>
                  <span className="text-3xl font-black text-red-500">{amount.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm text-center">
              Chưa có thông tin đơn hàng
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Stripe Form */}
        <div className="w-full md:w-7/12 bg-white flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 text-slate-800 p-6 text-center border-b border-slate-200 shadow-sm relative z-10">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-lg font-black uppercase tracking-wider">Thanh toán thẻ quốc tế</h2>
            </div>
            <p className="text-slate-500 text-xs">Được bảo mật toàn diện bởi Stripe</p>
          </div>

          <div className="p-8 flex-1 flex flex-col justify-center">
            {isConfirming ? (
              <div className="flex flex-col items-center py-12 space-y-5">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600 font-bold text-base animate-pulse">Đang xác nhận đặt vé...</p>
                <p className="text-slate-400 text-sm text-center max-w-xs">Vui lòng không đóng trình duyệt trong quá trình này.</p>
              </div>
            ) : !clientSecret ? (
              <div className="flex flex-col items-center py-12 space-y-5">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium text-sm">
                  {isInitializing ? 'Đang kết nối cổng thanh toán...' : 'Chuẩn bị...'}
                </p>
              </div>
            ) : (
              <div className="max-w-md w-full mx-auto">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    amount={amount}
                    checkoutState={checkoutState}
                    onSuccess={handleSuccess}
                    onFail={handleFail}
                  />
                </Elements>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center justify-center gap-4 opacity-100">
                  <div className="flex items-center gap-6">
                    {/* Visa SVG */}
                    <svg className="h-4" viewBox="0 0 320 100" fill="currentColor">
                      <path d="M141.22 2.768L121.36 97.432h-31.52l19.86-94.664h31.52zm87.42 91.136c-5.74 2.656-15.7 5.28-27.12 5.28-30.82 0-52.54-16.104-52.74-39.184-.24-12.456 11.02-19.4 19.5-23.472 8.68-4.176 11.62-6.84 11.6-10.584-.04-5.736-6.98-8.28-13.44-8.28-11.24 0-17.84 3.016-23.76 5.76l-4.14-19.344c6-2.736 17.18-5.184 28.84-5.28 32.54 0 53.94 15.792 54.18 40.248.1 10.968-7.78 18.264-18.72 23.448-7.8 3.792-12.58 6.312-12.54 10.152.06 3.696 4.34 7.608 13.06 7.608 8.92-.072 15.54-2.016 21-4.584l4.28 18.216zm89.5-88.752c-6.14 0-10.74 3.336-13.38 9.384l-45.74 81.336H293l6.5-17.76h39.72l3.8 17.76H375l-33.02-90.72h-33.84zm11.3 24.36l9.64 45.432h-27l17.36-45.432zM102.3 2.768L72.2 67.24 64.96 15.528C63.64 6.792 56.5 2.768 47.96 2.768H.66L0 5.864c9.74 2.016 20.8 5.376 27.68 8.952 4.18 2.184 5.34 4.08 6.46 8.52l20.48 74.096h33.22L135.96 2.768h-33.66z" fill="#1434CB"/>
                    </svg>
                    
                    {/* Mastercard SVG */}
                    <svg className="h-6" viewBox="0 0 256 158" fill="currentColor">
                      <path d="M157.067 79a78.89 78.89 0 01-29.067 61 79.06 79.06 0 000-122 78.89 78.89 0 0129.067 61z" fill="#FF5F00"/>
                      <path d="M103.067 140A79.056 79.056 0 0124 79 79.056 79.056 0 01103.067 18a78.89 78.89 0 00-29.067 61 78.89 78.89 0 0029.067 61z" fill="#EB001B"/>
                      <path d="M256 79a79.056 79.056 0 01-79.067 61A78.89 78.89 0 01147.866 79a78.89 78.89 0 0129.067-61A79.056 79.056 0 01256 79z" fill="#F79E1B"/>
                    </svg>
                    
                    {/* Stripe SVG */}
                    <svg className="h-5" viewBox="0 0 321 133" fill="currentColor">
                      <path d="M138.83 58.74c0-6.73-5.2-11.23-14-11.23-14.85 0-24.8 10.15-24.8 24.36 0 14.85 10 24.5 24.96 24.5 10.74 0 18.57-4.6 22.86-12l-10-6.1c-2.43 3.65-6.55 6.4-12.7 6.4-7.04 0-11.4-4-12.06-10.42h35.25c.3-2.1.45-5.22.45-7.65zm-14-22.1c6.56 0 10.6 3.68 11.24 9.7h-23.75c1-6.1 5.68-9.7 12.5-9.7zm57.26-9.56c-6.87 0-12.56 3.37-15.65 9.04V28.7H154.5v65.65h11.9v-25.1c3.1 5.67 8.8 9.04 15.65 9.04 12.7 0 22.1-10.6 22.1-25.56s-9.4-25.66-22.1-25.66zm-4.3 40.16c-8.25 0-14.53-6.4-14.53-14.5s6.3-14.5 14.54-14.5c8.24 0 14.52 6.4 14.52 14.5s-6.3 14.5-14.53 14.5zm49.9-10.3h10v-10h-10v-15.5l-11.9 2.5v13h-6.72v10h6.73v14c0 7.8 3.5 11.75 11.4 11.75 3.38 0 5.66-.46 6.87-.77v-10c-.76.3-2.28.3-3.67.3-3.06 0-4.58-1.5-4.58-4.4v-10.9zm13.1-28.8h11.92v65.65H240.8V28.1zm12.35-15l-12.35 2.6v9.38l12.35-2.6V13.1zm67.84 57.56c0-6.73-5.2-11.23-14-11.23-14.85 0-24.8 10.15-24.8 24.36 0 14.85 10 24.5 24.96 24.5 10.74 0 18.57-4.6 22.86-12l-10-6.1c-2.43 3.65-6.55 6.4-12.7 6.4-7.04 0-11.4-4-12.06-10.42h35.25c.3-2.1.45-5.22.45-7.65zm-14-22.1c6.56 0 10.6 3.68 11.24 9.7h-23.75c1-6.1 5.68-9.7 12.5-9.7zm-27.18 10.74v-11H268v49.25h11.9V64.6c0-7.8 4.75-12.87 11.9-12.87 1.83 0 3.37.3 4.28.75v-10.9c-1.37-.6-3.2-.9-4.88-.9-6.4 0-10.14 3.05-11.44 8.7zM69.05 48.7c-3.2-1.7-5.5-2.9-5.5-5.83 0-2.9 2.6-4.9 6.74-4.9 4.3 0 7.8 1.4 10.74 3.23l4.3-10.14C81.8 28.6 76 27 70.45 27c-11.8 0-19.48 6.6-19.48 16.4 0 11.5 10 15.1 17.5 18.7 3.66 1.83 5.35 3.37 5.35 6 0 2.9-2.9 5.2-7.5 5.2-5.36 0-9.8-2.16-12.87-4.14l-4.44 10.3c3.8 2.3 9.34 3.8 14.7 3.8 12.4 0 20.35-6.27 20.35-17.15 0-9.37-7.2-13.8-15-17.42z" fill="#635BFF"/>
                    </svg>
                  </div>
                  {checkoutState.isOrbit && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Quay lại chọn ghế
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
