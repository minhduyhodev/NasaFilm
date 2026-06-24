import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';
import { comboService } from '../../../shared/services/comboService';
import { movieService } from '../../../shared/services/movieService';
import { getMoviePosterUrl } from '../utils/movieUtils';

// Định nghĩa thông tin mô tả và hình ảnh bổ sung cho các combo để UI sinh động hơn
const comboMeta = {
  "combo bắp nước": {
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60",
    description: "1 Bắp lớn + 2 Nước ngọt cỡ vừa. Sự lựa chọn hoàn hảo cho các cặp đôi khi đi xem phim."
  },
  "combo solo": {
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60",
    description: "1 Bắp lớn + 1 Nước ngọt cỡ vừa. Thích hợp cho trải nghiệm một mình trọn vẹn."
  },
  "combo gia đình": {
    image: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=500&auto=format&fit=crop&q=60",
    description: "2 Bắp lớn + 4 Nước ngọt lớn. Đủ dùng thoải mái cho cả gia đình hoặc nhóm bạn thân."
  }
};

const ConcessionsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Khôi phục booking state từ sessionStorage nếu trang bị reload
  const getBookingState = () => {
    if (location.state) {
      try {
        sessionStorage.setItem('booking_state', JSON.stringify(location.state));
      } catch (e) {
        console.error("Failed to save booking state to sessionStorage:", e);
      }
      return location.state;
    }
    try {
      const saved = sessionStorage.getItem('booking_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse booking state from sessionStorage:", e);
    }
    return {};
  };

  const bookingState = getBookingState();

  const {
    showtimeUuid = '11111111-1111-1111-1111-111111111111',
    theater = 'NASA Landmark 81 - Phòng chiếu IMAX',
    movie = 'GALACTIC VANGUARD: RISING TIDE',
    movieUuid = '',
    moviePoster = '',
    movieRating = null,
    movieFormat = '',
    movieAgeRestriction = '',
    date = 'Hôm nay, 10/06',
    showtime = '19:30',
    selectedSeats = [],
    totalAmount = 0, // Giá trị tiền vé
    lockExpiresAt = null
  } = bookingState;

  const [movieMeta, setMovieMeta] = useState({ poster: '', ageRestriction: '' });

  useEffect(() => {
    if (!movieUuid) return;
    let cancelled = false;
    movieService
      .getMovieDetail(movieUuid)
      .then((detail) => {
        if (!cancelled) {
          setMovieMeta({
            poster: getMoviePosterUrl(detail),
            ageRestriction: detail.ageRestriction || '',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [movieUuid]);

  const resolvedPoster = moviePoster || movieMeta.poster;
  const resolvedAge = movieAgeRestriction || movieMeta.ageRestriction;

  const [combos, setCombos] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  const scrollContainerRef = React.useRef(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  // Khởi tạo bộ đếm thời gian giữ ghế
  useEffect(() => {
    if (lockExpiresAt) {
      const calculateTimeLeft = () => {
        const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
        setTimeLeft(diff);
      };
      calculateTimeLeft();
      const interval = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [lockExpiresAt]);

  // Điều hướng ngược về nếu hết hạn giữ ghế
  useEffect(() => {
    if (timeLeft === 0) {
      notificationService.error("Hết thời gian giữ ghế. Vui lòng chọn lại.");
      navigate(-1);
    }
  }, [timeLeft, navigate]);

  // Lấy danh sách Combo hoạt động từ Backend API
  useEffect(() => {
    const fetchCombos = async () => {
      try {
        const data = await comboService.getActiveCombos();
        setCombos(data || []);
        
        // Mặc định số lượng ban đầu của tất cả combo là 0
        const initialQuantities = {};
        data.forEach(item => {
          initialQuantities[item.uuid] = 0;
        });
        setQuantities(initialQuantities);
      } catch (err) {
        console.error("Failed to load combos:", err);
        notificationService.error("Không thể tải danh sách bắp nước.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCombos();
  }, []);

  // Xử lý tăng số lượng combo
  const handleIncrease = (comboUuid) => {
    setQuantities(prev => ({
      ...prev,
      [comboUuid]: (prev[comboUuid] || 0) + 1
    }));
  };

  // Xử lý giảm số lượng combo (đảm bảo không âm)
  const handleDecrease = (comboUuid) => {
    setQuantities(prev => ({
      ...prev,
      [comboUuid]: Math.max(0, (prev[comboUuid] || 0) - 1)
    }));
  };

  // Tính tổng số tiền bắp nước đã chọn
  const comboTotal = combos.reduce((sum, item) => {
    const qty = quantities[item.uuid] || 0;
    return sum + (item.price * qty);
  }, 0);

  // Tổng tiền đơn hàng = Tiền vé + Tiền bắp nước
  const overallTotal = totalAmount + comboTotal;

  // Lọc ra các combo có số lượng > 0 để hiển thị bên Summary Panel
  const selectedCombosList = combos
    .filter(c => quantities[c.uuid] > 0)
    .map(c => ({
      comboUuid: c.uuid, // Giữ nguyên key comboUuid để khớp payload gửi API của Backend
      name: c.name,
      price: c.price,
      quantity: quantities[c.uuid]
    }));

  // Xử lý chuyển tiếp sang trang Checkout
  const handleContinue = () => {
    navigate('/checkout', {
      state: {
        ...bookingState,
        selectedCombos: selectedCombosList,
        totalAmount: overallTotal
      }
    });
  };

  // Lấy ảnh minh họa và mô tả cho từng combo dựa trên tên
  const getMeta = (name) => {
    const key = Object.keys(comboMeta).find(k => name.toLowerCase().includes(k));
    return key ? comboMeta[key] : {
      image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=60",
      description: "Sản phẩm bắp và nước ngọt chất lượng cao đi kèm suất chiếu."
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f121d] flex flex-col items-center justify-center text-white">
        <Navbar />
        <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-4" />
        <p className="text-xl font-bold animate-pulse">Đang tải menu bắp nước...</p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f121d] text-white flex flex-col">
      <Navbar />

      <main className="flex-grow py-24 px-4 md:px-12 lg:px-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Cột trái: Danh sách Combo bắp nước */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Nút quay lại chọn ghế */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group cursor-pointer w-fit"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold">Quay lại chọn ghế</span>
          </button>

          <div className="flex justify-between items-end mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider mb-2 text-white border-l-4 border-red-600 pl-3">
                Chọn Bắp & Nước
              </h1>
              <p className="text-xs text-gray-400">
                Tiết kiệm lên đến 20% khi mua combo trực tuyến. Áp dụng ưu đãi giảm giá theo hạng thành viên ngay tại trang thanh toán.
              </p>
            </div>
            
            {/* Slider Navigation Buttons */}
            {combos.length > 0 && (
              <div className="flex gap-2.5 shrink-0">
                <button 
                  onClick={scrollLeft}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-gray-300 hover:text-white cursor-pointer"
                  title="Xem trước"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={scrollRight}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-gray-300 hover:text-white cursor-pointer"
                  title="Xem tiếp"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Slider View: Horizontal Scrollable/Swipeable List (Lướt được) */}
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory scroll-smooth pr-4 no-scrollbar"
          >
            {combos.map((combo) => {
              const qty = quantities[combo.uuid] || 0;
              const meta = getMeta(combo.name);
              const displayImage = combo.imageUrl || meta.image;
              const displayDescription = combo.description || meta.description;
              
              return (
                <div 
                  key={combo.uuid} 
                  className="min-w-[280px] md:min-w-[320px] max-w-[320px] snap-start bg-[#111215]/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-300 shadow-xl flex flex-col backdrop-blur-md"
                >
                  {/* Ảnh Combo */}
                  <div className="w-full h-44 overflow-hidden relative bg-[#0f121d]">
                    <img 
                      src={displayImage} 
                      alt={combo.name} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {qty > 0 && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-full shadow-lg shadow-red-600/30">
                        Đã chọn: {qty}
                      </span>
                    )}
                  </div>

                  {/* Chi tiết Combo */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide line-clamp-1">
                        {combo.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 min-h-[34px]">
                        {displayDescription}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-base font-black text-yellow-400">
                        {combo.price.toLocaleString('vi-VN')} đ
                      </span>

                      {/* Bộ điều khiển số lượng (Quantity Controller) */}
                      <div className="flex items-center gap-3">
                        <button
                          disabled={qty === 0}
                          onClick={() => handleDecrease(combo.uuid)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-all select-none ${
                            qty === 0
                              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-white/5'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer active:scale-95'
                          }`}
                        >
                          -
                        </button>
                        
                        <span className="w-6 text-center text-sm font-black text-white font-mono">
                          {qty}
                        </span>

                        <button
                          onClick={() => handleIncrease(combo.uuid)}
                          className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center font-bold text-white transition-all select-none cursor-pointer active:scale-95 shadow-md shadow-red-600/25"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cột phải: Summary Panel (Màn hình Desktop) */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-full sticky top-28 border border-white/5 bg-[#111215]/40 shadow-2xl">
            {/* Countdown timer giữ ghế */}
            {timeLeft !== null && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold mb-4 animate-pulse">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Thời gian giữ ghế:</span>
                </div>
                <span className="font-mono text-sm font-black">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Thông tin phim */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-6 items-start">
              <img 
                alt="Movie Poster" 
                className="w-20 h-28 rounded-lg object-cover shadow-xl border border-white/5 bg-[#0f121d]" 
                src={resolvedPoster || undefined} 
              />
              <div className="space-y-1">
                <h2 className="text-sm font-black text-white uppercase tracking-wide leading-tight line-clamp-2">{movie}</h2>
                <div className="flex items-center gap-2 pt-0.5">
                  {movieFormat && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{movieFormat}</span>
                  )}
                  {resolvedAge && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      resolvedAge.toUpperCase() === 'P' ? 'bg-emerald-600/90 text-white' : 
                      resolvedAge.toUpperCase().includes('T18') ? 'bg-red-600/90 text-white' : 
                      'bg-amber-600/90 text-white'
                    }`}>
                      {resolvedAge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-red-500 mt-1">{showtime} • {date}</p>
                <p className="text-[9px] font-semibold text-gray-500 leading-normal">{theater}</p>
              </div>
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="flex-grow flex flex-col space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {/* Danh sách ghế đã chọn */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Vé đã chọn</h3>
                <div className="space-y-1.5">
                  {selectedSeats.map(seat => (
                    <div key={seat.seatUuid} className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">Ghế {seat.id} ({seat.type})</span>
                      <span className="font-bold text-white">{seat.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danh sách combo đã chọn */}
              {selectedCombosList.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Bắp nước</h3>
                  <div className="space-y-1.5">
                    {selectedCombosList.map(combo => (
                      <div key={combo.comboUuid} className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">{combo.quantity}x {combo.name}</span>
                        <span className="font-bold text-white">{(combo.price * combo.quantity).toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phần hiển thị giá tiền & CTA */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">Tổng cộng</span>
                <span className="text-xl font-black text-white">{overallTotal.toLocaleString('vi-VN')} đ</span>
              </div>
              
              <button 
                onClick={handleContinue}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.35)] active:scale-[0.98]"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </aside>

        {/* Sticky Bottom Bar (Màn hình Mobile & Máy tính bảng) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121318]/95 border-t border-white/5 backdrop-blur-lg px-6 py-4 flex items-center justify-between shadow-2xl">
          <div className="text-left">
            <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Tổng tạm tính</span>
            <span className="text-lg font-black text-yellow-400">{overallTotal.toLocaleString('vi-VN')} đ</span>
          </div>
          
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)] cursor-pointer"
          >
            Tiếp tục
          </button>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default ConcessionsPage;
