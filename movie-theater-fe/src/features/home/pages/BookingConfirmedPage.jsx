import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { movieService } from '../../../shared/services/movieService';
import { getMoviePosterUrl, maskTicketCode } from '../utils/movieUtils';
import './BookingConfirmedPage.css';

export const BookingConfirmedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [fetchedPoster, setFetchedPoster] = useState('');

  // Check and extract state, redirect to profile if missing
  const bookingData = location.state;
  
  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (!bookingData || !bookingData.bookingUuid) {
      console.warn("No booking data found in location state. Redirecting to profile.");
      navigate('/profile', { replace: true });
    }
  }, [bookingData, navigate]);

  useEffect(() => {
    if (!bookingData?.isVod || !bookingData?.movieUuid || bookingData?.moviePoster) return;
    let cancelled = false;
    movieService
      .getMovieDetail(bookingData.movieUuid)
      .then((detail) => {
        if (!cancelled) setFetchedPoster(getMoviePosterUrl(detail));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingData]);



  const handlePrint = () => {
    window.print();
  };

  if (!bookingData) {
    return null;
  }

  const {
    bookingUuid = '',
    movie = 'Phim đã đặt',
    moviePoster = '',
    movieFormat = 'IMAX 3D',
    movieRating = 'T16',
    theater = 'NASA Film Cinema',
    date = '',
    showtime = '',
    selectedSeats = [],
    tickets = [],
    totalPrice = 0,
    isVod = false,
    movieUuid = ''
  } = bookingData;

  const bookingId = `#CL-${bookingUuid.substring(0, 8).toUpperCase()}`;
  const firstTicketCode = tickets[0]?.ticketCode || 'NASAFILM';
  const maskedTicketCode = maskTicketCode(firstTicketCode);
  
  // QR dùng mã đầy đủ để soát vé tại rạp; màn hình chỉ hiển thị mã đã che
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(firstTicketCode)}`;

  const displayPoster = moviePoster || fetchedPoster;

  return (
    <div className="bg-mesh min-h-screen flex flex-col justify-between">
      <Navbar />
      
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 md:px-16 lg:px-20 py-12 mt-12 w-full max-w-7xl mx-auto">
        <div 
          className="glass-panel max-w-4xl w-full rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl transition-all duration-300 text-left bg-[#101217]"
        >
          {/* Left Side: Movie Poster & Success Overlay */}
          <div className="relative w-full md:w-2/5 h-72 md:h-auto overflow-hidden shrink-0 border-r border-white/5">
            {displayPoster ? (
              <img 
                className="absolute inset-0 w-full h-full object-cover" 
                alt="Cinematic movie poster" 
                src={displayPoster}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-[#121212] to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent"></div>
            
            {/* Animated Checkmark Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="w-20 h-20 rounded-full border-4 border-[#ccc5bf] flex items-center justify-center neon-gold-glow bg-[#101217]/50">
                <svg className="w-12 h-12 text-[#ccc5bf]" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                  <path className="checkmark-animate" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Right Side: Confirmation Details */}
          <div className="flex-grow p-8 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-5 stagger-item" style={{ animationDelay: '0.1s' }}>
                <span className="text-[#ccc5bf] text-[10px] font-black tracking-widest uppercase">Trải nghiệm thượng lưu</span>
                <div className="h-[1px] flex-1 bg-white/10"></div>
              </div>
              
              <h1 className="text-3xl font-black text-white mb-2 stagger-item" style={{ animationDelay: '0.2s' }}>Đặt Vé Thành Công</h1>
              <p className="text-[#c8c5ca] text-xs font-semibold mb-8 stagger-item" style={{ animationDelay: '0.3s' }}>
                Hành trình điện ảnh của bạn đã sẵn sàng. Chào mừng bạn đến với suất chiếu.
              </p>
              
              {/* Movie Details Grid */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
                <div className="stagger-item" style={{ animationDelay: '0.4s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Phim</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white line-clamp-1">{movie}</span>
                    {movieRating && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        movieRating.toUpperCase() === 'P' ? 'bg-emerald-600 text-white' : 
                        movieRating.toUpperCase().includes('T18') ? 'bg-red-600 text-white' : 
                        'bg-amber-600 text-white'
                      }`}>
                        {movieRating}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="stagger-item" style={{ animationDelay: '0.5s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Thời gian</span>
                  <span className="text-sm font-bold text-white">{showtime} • {date}</span>
                </div>
                
                <div className="stagger-item" style={{ animationDelay: '0.6s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">{isVod ? 'Hình thức' : 'Rạp & Phòng chiếu'}</span>
                  <span className="text-sm font-bold text-white line-clamp-1">
                    {isVod ? 'Xem trực tuyến' : theater.replace('NASA ', '')} ({movieFormat})
                  </span>
                </div>
                
                <div className="stagger-item" style={{ animationDelay: '0.7s' }}>
                  <span className="block text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Ghế đã đặt</span>
                  <span className="text-sm font-bold text-[#ccc5bf]">
                    {isVod ? 'Không áp dụng (VOD)' : selectedSeats.map(s => s.id).join(', ')}
                  </span>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div 
                className="flex items-center gap-5 p-4 glass-panel rounded-xl border-white/5 qr-pulse stagger-item bg-white/[0.01]" 
                style={{ animationDelay: '0.8s' }}
              >
                <div className="bg-white p-1.5 rounded-lg w-20 h-20 flex-shrink-0 flex items-center justify-center shadow-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="Mã QR soát vé" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  {isVod ? (
                    <>
                      <span className="block text-white text-xs font-bold mb-1">Mã vé đã gửi qua email</span>
                      <span className="block text-gray-400 text-[10px] font-semibold mb-1">Mã đơn: {bookingId}</span>
                      <span className="text-[#c8c5ca] text-[9px] font-medium leading-relaxed block">
                        Kiểm tra hộp thư đăng ký để lấy mã VOD, sau đó vào trang kích hoạt và nhập mã để bắt đầu xem phim.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-white text-xs font-bold mb-1">Mã vé: {maskedTicketCode}</span>
                      <span className="block text-gray-400 text-[10px] font-semibold mb-1">Mã đơn: {bookingId}</span>
                      <span className="text-[#c8c5ca] text-[9px] font-medium leading-relaxed block">
                        Mã vé đầy đủ đã gửi qua email. Xuất trình mã QR tại lối vào VIP để soát vé vào phòng chiếu.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 action-buttons-group stagger-item" style={{ animationDelay: '0.9s' }}>
              {isVod ? (
                <button 
                  onClick={() => navigate(`/online/activate/${movieUuid}`)}
                  className="flex-grow bg-red-600 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-700 transition-all duration-300 cursor-pointer active:scale-95 text-center"
                >
                  Kích hoạt vé xem online
                </button>
              ) : (
                <button 
                  onClick={handlePrint}
                  className="flex-grow bg-[#ccc5bf] text-[#1c1b1d] font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-white transition-all duration-300 neon-gold-glow cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4 text-[#1c1b1d] shrink-0" />
                  In / Tải vé PDF
                </button>
              )}
              
              <button 
                onClick={() => navigate(isVod ? '/online' : '/movies')}
                className="flex-grow border border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer active:scale-95"
              >
                {isVod ? 'Về trang online' : 'Tiếp tục xem phim'}
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default BookingConfirmedPage;
