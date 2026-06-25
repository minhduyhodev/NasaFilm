import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { movieService } from '../../../shared/services/movieService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { getMoviePosterUrl } from '../utils/movieUtils';

import './BookingPage.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_SHOWTIME_UUID = '11111111-1111-1111-1111-111111111111';

function isValidShowtimeUuid(value) {
  return Boolean(value && value !== PLACEHOLDER_SHOWTIME_UUID && UUID_PATTERN.test(value));
}

function partitionSeatsForAisle(seatsList) {
  const n = seatsList.length;
  if (n === 0) {
    return { left: [], center: [], right: [] };
  }
  if (n <= 4) {
    return { left: [], center: seatsList, right: [] };
  }
  if (n === 12) {
    return {
      left: seatsList.slice(0, 2),
      center: seatsList.slice(2, 10),
      right: seatsList.slice(10, 12),
    };
  }
  const leftCount = Math.max(1, Math.floor(n * 0.15));
  const rightCount = Math.max(1, Math.floor(n * 0.15));
  if (leftCount + rightCount >= n) {
    return { left: [], center: seatsList, right: [] };
  }
  return {
    left: seatsList.slice(0, leftCount),
    center: seatsList.slice(leftCount, n - rightCount),
    right: seatsList.slice(n - rightCount),
  };
}

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [bookingState] = useState(() => {
    if (location.state) {
      try {
        sessionStorage.setItem('booking_state', JSON.stringify(location.state));
      } catch (e) {
        console.error('Failed to save booking state to sessionStorage:', e);
      }
      return location.state;
    }
    try {
      const saved = sessionStorage.getItem('booking_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse booking state from sessionStorage:', e);
    }
    return {};
  });

  const {
    showtimeUuid = '',
    theater = '',
    movie = '',
    movieUuid = '',
    moviePoster = '',
    movieRating = null,
    movieFormat = '',
    movieAgeRestriction = '',
    date = '',
    showtime = '',
  } = bookingState;

  const hasValidShowtime = isValidShowtimeUuid(showtimeUuid);

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
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [movieUuid]);

  const resolvedPoster = moviePoster || movieMeta.poster;
  const resolvedAge = movieAgeRestriction || movieMeta.ageRestriction;

  const [seatRows, setSeatRows] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGapViolation, setHasGapViolation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());

  const selectedSeatsRef = React.useRef([]);
  useEffect(() => {
    if (!hasValidShowtime) {
      notificationService.error('Suất chiếu không hợp lệ. Vui lòng chọn lại từ trang phim hoặc rạp.');
      navigate('/movies', { replace: true });
    }
  }, [hasValidShowtime, navigate]);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setMaxSeatsPerBooking(getMaxSeatsPerBooking(cfg)))
      .catch(() => { });
  }, []);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const fetchSeatMapRef = React.useRef(() => {});

  const fetchSeatMap = async (overrideSelectedUuids) => {
    try {
      const currentSelectedUuids = overrideSelectedUuids !== undefined
        ? overrideSelectedUuids
        : selectedSeatsRef.current.map(s => s.seatUuid);
      const data = await bookingService.getSeatMap(showtimeUuid, currentSelectedUuids);
      if (data && data.rows) {
        setSeatRows(data.rows);

        const offset = data._serverTimeOffset || 0;
        let gapFound = false;
        let expiresAtVal = null;

        // Synchronize selected seats from BE response (seats marked selected: true or locked by me)
        const newSelected = [];
        data.rows.forEach(row => {
          row.seats.forEach(seat => {
            if (seat.blocked) {
              gapFound = true;
            }
            if (seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') {
              if (seat.lockedUntil) {
                const seatExpire = new Date(seat.lockedUntil).getTime() - offset;
                if (!expiresAtVal || seatExpire > expiresAtVal) {
                  expiresAtVal = seatExpire;
                }
              }
              let vietnameseType = 'Ghế Thường';
              if (seat.seatTypeName === 'VIP') vietnameseType = 'Ghế VIP';
              if (seat.seatTypeName === 'COUPLE') vietnameseType = 'Ghế Đôi';

              newSelected.push({
                seatUuid: seat.seatUuid,
                id: `${row.rowName}${seat.seatNumber}`,
                rowName: row.rowName,
                seatNumber: seat.seatNumber,
                price: seat.price,
                type: vietnameseType
              });
            }
          });
        });
        setSelectedSeats(newSelected);
        setHasGapViolation(gapFound);

        if (expiresAtVal) {
          const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
          const secondsLeft = Math.max(0, Math.floor((expiresAtVal - serverTime) / 1000));
          setTimeLeft(secondsLeft);
        } else {
          setTimeLeft(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch seat map:", err);
      notificationService.error("Không thể tải sơ đồ ghế");
    } finally {
      setIsLoading(false);
    }
  };

  fetchSeatMapRef.current = fetchSeatMap;

  useRealtimeTopic(
    hasValidShowtime ? REALTIME_TOPICS.showtimeSeats(showtimeUuid) : null,
    () => fetchSeatMapRef.current(),
    400
  );

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft === 0) {
      const handleTimeout = async () => {
        try {
          await bookingService.syncSeatLocks(showtimeUuid, []);
          setSelectedSeats([]);
          setHasGapViolation(false);
          setTimeLeft(null);
          notificationService.error("Hết thời gian giữ ghế. Vui lòng chọn lại.");
        } catch (e) {
          console.error(e);
        }
      };
      handleTimeout();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, showtimeUuid]);

  useEffect(() => {
    if (!hasValidShowtime) return;
    window.scrollTo(0, 0);
    fetchSeatMap();
  }, [showtimeUuid, hasValidShowtime]);

  const handleSeatClick = async (seat) => {
    const isAlreadySelected = selectedSeats.some(s => s.seatUuid === seat.seatUuid);
    if (!isAlreadySelected && selectedSeats.length >= maxSeatsPerBooking) {
      notificationService.error(`Bạn chỉ được chọn tối đa ${maxSeatsPerBooking} ghế trong một lần đặt.`);
      return;
    }

    const nextSelectedUuids = isAlreadySelected
      ? selectedSeats.filter((s) => s.seatUuid !== seat.seatUuid).map((s) => s.seatUuid)
      : [...selectedSeats.map((s) => s.seatUuid), seat.seatUuid];

    try {
      await bookingService.syncSeatLocks(showtimeUuid, nextSelectedUuids);
      // Reload seat map after successful lock request with the next selection list
      await fetchSeatMap(nextSelectedUuids);
    } catch (err) {
      console.error("Failed to sync seat locks:", err);
      notificationService.error(err.message || "Không thể giữ ghế này. Vui lòng chọn ghế khác.");
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      navigate('/concessions', {
        state: {
          showtimeUuid,
          theater,
          movie,
          movieUuid,
          moviePoster: resolvedPoster,
          movieRating,
          movieFormat,
          movieAgeRestriction: resolvedAge,
          date,
          showtime,
          selectedSeats,
          totalAmount,
          lockExpiresAt: timeLeft !== null ? Date.now() + (timeLeft * 1000) : null
        }
      });
    }, 800);
  };

  const totalAmount = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);

  const renderSeatElement = (seat) => {
    const isOccupied = seat.availabilityStatus === 'BOOKED' || seat.availabilityStatus === 'LOCKED_BY_OTHER' || seat.availabilityStatus === 'UNAVAILABLE';
    const isSelected = seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME';
    let type = (seat.seatTypeName || '').toLowerCase();
    if (type.includes('thường') || type.includes('standard') || type.includes('regular')) {
      type = 'standard';
    } else if (type.includes('vip')) {
      type = 'vip';
    } else if (type.includes('đôi') || type.includes('couple')) {
      type = 'couple';
    }

    let seatClass = `seat ${type}`;

    if (isOccupied) {
      seatClass += ' occupied';
    } else if (isSelected) {
      seatClass += ' selected';
    } else if (seat.blocked) {
      seatClass += ' blocked';
    }

    return (
      <div
        key={seat.seatUuid}
        onClick={() => !isOccupied && handleSeatClick(seat)}
        className={seatClass}
      >
        {isOccupied ? <X className="h-3 w-3" /> : seat.seatNumber}
      </div>
    );
  };

  if (!hasValidShowtime) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="booking-wrapper min-h-screen bg-[#0f121d] flex items-center justify-center text-white">
        <Navbar />
        <p className="text-xl font-bold animate-pulse">Đang tải sơ đồ ghế...</p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="booking-wrapper">
      <Navbar />

      <main className="py-24 px-4 md:px-12 lg:px-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">

        {/* Left Column: Seat Selection */}
        <div className="lg:col-span-8 flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl">

          {/* Screen Indicator */}
          <div className="w-full mb-16 text-center">
            <div className="screen-curve relative mx-auto w-3/4 h-2 bg-gradient-to-b from-white/45 to-transparent rounded-[50%] screen-glow"></div>
            <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-4 tracking-widest uppercase">MÀN HÌNH CHÍNH</p>
          </div>

          {/* Seat Grid */}
          <div className="flex flex-col gap-2.5 overflow-x-auto w-full items-center pb-4 scrollbar-hide select-none">
            {seatRows.map((rowItem) => {
              const row = rowItem.rowName;
              const seatsList = rowItem.seats || [];
              const { left: leftSeats, center: centerSeats, right: rightSeats } =
                partitionSeatsForAisle(seatsList);

              let centerClasses = 'flex gap-2 px-1';
              if (row === 'C') {
                centerClasses += " border-t-2 border-x-2 border-emerald-500/30 bg-emerald-500/5 rounded-t-xl py-0.5";
              } else if (row === 'D' || row === 'E') {
                centerClasses += " border-x-2 border-emerald-500/30 bg-emerald-500/5 py-0.5";
              } else if (row === 'F') {
                centerClasses += " border-b-2 border-x-2 border-emerald-500/30 bg-emerald-500/5 rounded-b-xl py-0.5";
              }

              return (
                <div key={row} className="flex items-center gap-2 mb-1 justify-center min-w-max">
                  {/* Row Label Left */}
                  <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>

                  {/* Left Block */}
                  <div className="flex gap-2">
                    {leftSeats.map((seat) => renderSeatElement(seat))}
                  </div>

                  {/* Center Block with optional border */}
                  <div className={centerClasses}>
                    {centerSeats.map((seat) => renderSeatElement(seat))}
                  </div>

                  {/* Right Block */}
                  <div className="flex gap-2">
                    {rightSeats.map((seat) => renderSeatElement(seat))}
                  </div>

                  {/* Row Label Right */}
                  <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>
                </div>
              );
            })}
          </div>

          {/* Gap Violation Warning */}
          {hasGapViolation && (
            <div className="w-full mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-black text-center flex items-center justify-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>Không được để trống 1 ghế đơn bị kẹp giữa các ghế đã chọn/đã đặt. Vui lòng chọn ghế trống đó hoặc thay đổi vị trí ghế.</span>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 glass-panel p-6 rounded-xl w-full border border-white/5 bg-[#121215]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-white/25 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-zinc-500">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế Thường (85k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-yellow-500/35 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-yellow-500/70">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế VIP (120k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-16 h-6 border-2 border-red-500/35 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-red-500/70">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế Đôi (160k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 bg-white/5 border-2 border-red-500/20 rounded-lg flex items-center justify-center text-red-500/25 opacity-60">
                <X className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-gray-300">Đã đặt</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 bg-white border border-white rounded-lg flex items-center justify-center text-[9px] font-bold text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]">1</div>
              <span className="text-xs font-bold text-gray-300">Đang chọn</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-dashed border-red-500 bg-red-500/5 rounded-lg flex items-center justify-center text-[9px] font-bold text-red-500">1</div>
              <span className="text-xs font-bold text-gray-300">Cảnh báo khe hở</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-emerald-500/40 bg-emerald-500/10 rounded-lg"></div>
              <span className="text-xs font-bold text-gray-300">Vùng trung tâm</span>
            </div>
          </div>
        </div>

        {/* Right Column: Summary Panel */}
        <aside className="lg:col-span-4">
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-full sticky top-28 border border-white/5 bg-[#111215]/40 shadow-2xl">
            {timeLeft !== null && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold mb-4 animate-pulse">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Thời gian giữ ghế:</span>
                </div>
                <span className="font-mono text-sm font-black">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Movie Details */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-6 items-start">
              <img
                alt="Movie Poster"
                className="w-20 h-28 rounded-lg object-cover shadow-xl border border-white/5 bg-[#0f121d]"
                src={resolvedPoster || undefined}
              />
              <div className="text-left space-y-1">
                <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight line-clamp-2">{movie}</h2>
                <div className="flex items-center gap-2 pt-0.5">
                  {movieFormat && (
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                      {movieFormat}
                    </span>
                  )}
                  {resolvedAge && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${resolvedAge.toUpperCase() === 'P' ? 'bg-emerald-600/90 text-white' :
                        resolvedAge.toUpperCase().includes('T18') ? 'bg-red-600/90 text-white' :
                          'bg-amber-600/90 text-white'
                      }`}>
                      {resolvedAge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-red-500 mt-1">{showtime} • {date}</p>
                <p className="text-[10px] font-semibold text-gray-500">{theater}</p>
              </div>
            </div>

            {/* Selected Seats List */}
            <div className="flex-grow flex flex-col min-h-[160px]">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">Ghế đã chọn</h3>
              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1 flex-grow">
                {selectedSeats.length === 0 ? (
                  <div className="text-gray-500 font-medium text-xs py-8 text-center italic">
                    Chưa chọn ghế nào.
                  </div>
                ) : (
                  selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors animate-fade-in">
                      <div className="text-left">
                        <span className="text-xs font-black text-white block">Ghế {seat.id}</span>
                        <span className="text-[10px] font-bold text-gray-400">{seat.type}</span>
                      </div>
                      <span className="text-xs font-black text-yellow-400">{(seat.price).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Price & Checkout */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">Tổng cộng</span>
                <span className="text-xl font-black text-white">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>

              <button
                onClick={handleConfirm}
                disabled={selectedSeats.length === 0 || hasGapViolation || isConfirming}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${selectedSeats.length === 0 || hasGapViolation
                    ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : isConfirming
                      ? 'bg-red-700 text-white cursor-wait opacity-80'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] cursor-pointer active:scale-[0.98]'
                  }`}
              >
                {isConfirming
                  ? 'Đang xử lý...'
                  : hasGapViolation
                    ? 'Lỗi khoảng trống ghế'
                    : selectedSeats.length === 0
                      ? 'Xác nhận ghế'
                      : `Xác nhận đặt (${selectedSeats.length} ghế)`}
              </button>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;
