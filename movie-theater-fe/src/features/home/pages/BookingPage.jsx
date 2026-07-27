import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { getMoviePosterUrl } from '../utils/movieUtils';
import { BOOKING_SESSION_KEYS, readBookingSession, writeBookingSession } from '../../../shared/utils/bookingSessionStorage';
import { useSeatMapState } from '../../../shared/hooks/useSeatMapState';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';
import { logger } from '../../../shared/utils/logger';

import './BookingPage.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_SHOWTIME_UUID = '11111111-1111-1111-1111-111111111111';

function isValidShowtimeUuid(value) {
  return Boolean(value && value !== PLACEHOLDER_SHOWTIME_UUID && UUID_PATTERN.test(value));
}

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [bookingState] = useState(() =>
    readBookingSession(BOOKING_SESSION_KEYS.BOOKING, location.state) ?? {},
  );

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());

  const handleLockTimeout = useCallback(async () => {
    try {
      await bookingService.syncSeatLocks(showtimeUuid, []);
      notificationService.error('Hết thời gian giữ ghế. Vui lòng chọn lại.');
    } catch (error) {
      logger.error('Failed to load booking data:', error);
    }
  }, [showtimeUuid]);

  const {
    seatRows,
    aisleLayout,
    selectedSeats,
    hasGapViolation,
    timeLeft,
    isMapLoading,
    fetchSeatMap,
  } = useSeatMapState(showtimeUuid, {
    enabled: hasValidShowtime,
    onLockTimeout: handleLockTimeout,
  });

  useEffect(() => {
    if (!hasValidShowtime) {
      notificationService.error('Suất chiếu không hợp lệ. Vui lòng chọn lại từ trang phim hoặc rạp.');
      navigate('/movies', { replace: true });
    }
  }, [hasValidShowtime, navigate]);

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

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setMaxSeatsPerBooking(getMaxSeatsPerBooking(cfg)))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!hasValidShowtime) return;
    window.scrollTo(0, 0);
  }, [showtimeUuid, hasValidShowtime]);

  const handleCoupleClick = async (seats) => {
    const pairUuids = seats.map((s) => s.seatUuid);
    const bothSelected = pairUuids.every((uuid) =>
      selectedSeats.some((s) => s.seatUuid === uuid),
    );

    if (!bothSelected) {
      const seatsAfterAdd = new Set([
        ...selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid),
        ...pairUuids,
      ]);
      if (seatsAfterAdd.size > maxSeatsPerBooking) {
        notificationService.error(`Bạn chỉ được chọn tối đa ${maxSeatsPerBooking} ghế trong một lần đặt.`);
        return;
      }
    }

    const nextSelectedUuids = bothSelected
      ? selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid)
      : [
        ...selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid),
        ...pairUuids,
      ];

    try {
      await bookingService.syncSeatLocks(showtimeUuid, nextSelectedUuids);
      await fetchSeatMap(nextSelectedUuids);
    } catch (err) {
      logger.error('Failed to sync couple seat locks:', err);
      notificationService.error(err.message || 'Không thể giữ ghế này. Vui lòng chọn ghế khác.');
    }
  };

  const handleSeatClick = async (seat) => {
    const isAlreadySelected = selectedSeats.some((s) => s.seatUuid === seat.seatUuid);
    if (!isAlreadySelected && selectedSeats.length >= maxSeatsPerBooking) {
      notificationService.error(`Bạn chỉ được chọn tối đa ${maxSeatsPerBooking} ghế trong một lần đặt.`);
      return;
    }

    const nextSelectedUuids = isAlreadySelected
      ? selectedSeats.filter((s) => s.seatUuid !== seat.seatUuid).map((s) => s.seatUuid)
      : [...selectedSeats.map((s) => s.seatUuid), seat.seatUuid];

    try {
      await bookingService.syncSeatLocks(showtimeUuid, nextSelectedUuids);
      await fetchSeatMap(nextSelectedUuids);
    } catch (err) {
      logger.error('Failed to sync seat locks:', err);
      notificationService.error(err.message || 'Không thể giữ ghế này. Vui lòng chọn ghế khác.');
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    const payload = {
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
      lockExpiresAt: timeLeft !== null ? Date.now() + (timeLeft * 1000) : null,
    };
    writeBookingSession(BOOKING_SESSION_KEYS.BOOKING, payload);
    setTimeout(() => {
      setIsConfirming(false);
      navigate('/concessions', { state: payload });
    }, 800);
  };

  const resolvedPoster = moviePoster || movieMeta.poster;
  const resolvedAge = movieAgeRestriction || movieMeta.ageRestriction;
  const totalAmount = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);

  if (!hasValidShowtime) {
    return null;
  }

  if (isMapLoading) {
    return (
      <div className="booking-wrapper min-h-screen bg-[#0f121d] flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Đang tải sơ đồ ghế...</p>
      </div>
    );
  }

  return (
    <div className="booking-wrapper">

      <main className="py-24 px-4 md:px-12 lg:px-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left min-w-0">

        {/* min-w-0: prevent wide seat grid from expanding the column under the sticky aside */}
        <div className="lg:col-span-8 min-w-0 w-full flex flex-col items-center bg-[#111215]/30 border border-white/5 p-4 md:p-6 rounded-2xl overflow-hidden">
          <TheaterSeatMapPanel
            seatRows={seatRows}
            aisleLayout={aisleLayout}
            hasGapViolation={hasGapViolation}
            onSeatClick={handleSeatClick}
            onCoupleClick={handleCoupleClick}
            screenAccent="white"
            className="w-full min-w-0"
          />
        </div>

        <aside className="lg:col-span-4 min-w-0 relative z-10">
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
    </div>
  );
};

export default BookingPage;
