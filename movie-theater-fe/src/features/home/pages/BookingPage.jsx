import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { stompSocketService, SEAT_MAP_REFRESH_MS } from '../../../shared/services/stompSocketService';
import { movieService } from '../../../shared/services/movieService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { getMoviePosterUrl } from '../utils/movieUtils';
import {
  buildRowPlacedItems,
  getCoupleLabel,
  getSeatMapGridStyle,
  getGridColumnStyle,
  seatNumberToGridColumn,
  computeHorizontalBandOverlays,
  getHorizontalBandOverlayStyle,
  getMaxSeatNumber,
} from '../../../shared/utils/seatMapDisplay';
import '../../../shared/components/seatmap/SeatMapGrid.css';
import {
  parseLayoutConfig,
  hasAisleSlot,
  slotKey,
  getAisleLabelAnchors,
  getCompleteVerticalCols,
  getCompleteHorizontalRows,
  getCompleteDiagonalCellKeys,
} from '../../../shared/utils/aisleLayoutUtils';
import {
  AISLE_LABEL,
  isInCompleteVerticalCol,
  renderVerticalAisleCellProps,
} from '../../../shared/components/aisle/aisleMapRender';
import '../../../shared/components/aisle/AisleMapStyles.css';

import './BookingPage.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_SHOWTIME_UUID = '11111111-1111-1111-1111-111111111111';

function isValidShowtimeUuid(value) {
  return Boolean(value && value !== PLACEHOLDER_SHOWTIME_UUID && UUID_PATTERN.test(value));
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
  const [aisleLayout, setAisleLayout] = useState(() => parseLayoutConfig(null));
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

  const fetchSeatMap = async (overrideSelectedUuids, options = {}) => {
    const { silent = false } = options;
    try {
      const currentSelectedUuids = overrideSelectedUuids !== undefined
        ? overrideSelectedUuids
        : selectedSeatsRef.current.map(s => s.seatUuid);
      const data = await bookingService.getSeatMap(showtimeUuid, currentSelectedUuids);
      if (data && data.rows) {
        setSeatRows(data.rows);
        if (data.layoutConfig) {
          setAisleLayout(parseLayoutConfig(data.layoutConfig));
        }

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
      if (!silent) {
        notificationService.error("Không thể tải sơ đồ ghế");
      }
    } finally {
      setIsLoading(false);
    }
  };

  fetchSeatMapRef.current = fetchSeatMap;

  useRealtimeTopic(
    hasValidShowtime ? REALTIME_TOPICS.showtimeSeats(showtimeUuid) : null,
    () => fetchSeatMapRef.current(undefined, { silent: true }),
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
    stompSocketService.ensureConnected().catch((err) => {
      console.warn('WebSocket unavailable, using HTTP polling:', err?.message ?? err);
    });
    bookingService.watchSeatMap(showtimeUuid).catch((err) => {
      console.error('Failed to register seat map watch:', err);
    });
    return () => {
      bookingService.unwatchSeatMap(showtimeUuid).catch(() => {});
    };
  }, [showtimeUuid, hasValidShowtime]);

  // Guaranteed refresh every 5s (visible in Network tab as seat-map XHR)
  useEffect(() => {
    if (!hasValidShowtime) return undefined;

    const intervalId = setInterval(() => {
      fetchSeatMapRef.current(undefined, { silent: true });
    }, SEAT_MAP_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [hasValidShowtime, showtimeUuid]);

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
      console.error('Failed to sync couple seat locks:', err);
      notificationService.error(err.message || 'Không thể giữ ghế này. Vui lòng chọn ghế khác.');
    }
  };

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

  const bookingSeatsByRow = React.useMemo(() => {
    const map = {};
    seatRows.forEach((rowItem) => {
      map[rowItem.rowName] = [...(rowItem.seats || [])].sort(
        (a, b) => (b.seatNumber || 0) - (a.seatNumber || 0),
      );
    });
    return map;
  }, [seatRows]);

  const bookingRowNames = React.useMemo(
    () => seatRows.map((r) => r.rowName).sort(),
    [seatRows],
  );

  const maxSeatNumber = React.useMemo(
    () => getMaxSeatNumber(bookingSeatsByRow, bookingRowNames),
    [bookingSeatsByRow, bookingRowNames],
  );

  const aisleLabelAnchors = React.useMemo(
    () => getAisleLabelAnchors(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const completeHorizontalRows = React.useMemo(
    () => getCompleteHorizontalRows(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const completeVerticalCols = React.useMemo(
    () => getCompleteVerticalCols(aisleLayout, bookingRowNames),
    [aisleLayout, bookingRowNames],
  );

  const completeDiagonalCells = React.useMemo(
    () => getCompleteDiagonalCellKeys(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const renderCoupleElement = (seats, rowName) => {
    const isOccupied = seats.some((s) =>
      s.availabilityStatus === 'BOOKED'
      || s.availabilityStatus === 'LOCKED_BY_OTHER'
      || s.availabilityStatus === 'UNAVAILABLE',
    );
    const isSelected = seats.some((s) => s.selected || s.availabilityStatus === 'LOCKED_BY_ME');
    const isBlocked = seats.some((s) => s.blocked);

    let seatClass = 'seat couple relative z-[1] w-full h-full';
    if (isOccupied) seatClass += ' occupied';
    else if (isSelected) seatClass += ' selected';
    else if (isBlocked) seatClass += ' blocked';

    const label = getCoupleLabel(rowName, seats).replace(rowName, '');

    return (
      <div
        key={seats.map((s) => s.seatUuid).join('-')}
        onClick={() => !isOccupied && handleCoupleClick(seats)}
        className={seatClass}
        title={`Sofa đôi ${getCoupleLabel(rowName, seats)}`}
      >
        {isOccupied ? <X className="h-3 w-3" /> : label}
      </div>
    );
  };

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

    let seatClass = `seat ${type} relative z-[1] w-full h-full`;

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
        <p className="text-xl font-bold animate-pulse">Đang tải sơ đồ ghế...</p>
      </div>
    );
  }

  return (
    <div className="booking-wrapper">

      <main className="py-24 px-4 md:px-12 lg:px-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">

        {/* Left Column: Seat Selection */}
        <div className="lg:col-span-8 flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl">

          {/* Screen Indicator */}
          <div className="w-full mb-16 text-center">
            <div className="screen-curve relative mx-auto w-3/4 h-2 bg-gradient-to-b from-white/45 to-transparent rounded-[50%] screen-glow"></div>
            <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-4 tracking-widest uppercase">MÀN HÌNH CHÍNH</p>
          </div>

          {/* Seat Grid */}
          <div className="flex flex-col gap-2.5 overflow-x-auto overflow-y-visible w-full items-center pb-4 py-6 scrollbar-hide select-none">
            {bookingRowNames.map((row) => {
              const seatsList = bookingSeatsByRow[row] || [];
              const isFullHorizontalAisle = completeHorizontalRows.includes(row);

              return (
                <div key={row} className="flex items-center gap-2 mb-1 justify-center min-w-max">
                  <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>

                  {isFullHorizontalAisle ? (
                    <div
                      className="seat-map-grid seat-map-grid--booking"
                      style={getSeatMapGridStyle(maxSeatNumber)}
                    >
                      {(() => {
                        const bandOverlays = computeHorizontalBandOverlays(
                          seatsList,
                          completeVerticalCols,
                          maxSeatNumber,
                        );
                        const labelOverlayIdx = bandOverlays.length
                          ? bandOverlays.reduce(
                            (bestIdx, overlay, idx, arr) => (
                              overlay.span > arr[bestIdx].span ? idx : bestIdx
                            ),
                            0,
                          )
                          : -1;

                        return (
                          <>
                            {bandOverlays.map((overlay, idx) => (
                              <div
                                key={`h-band-${overlay.gridStart}`}
                                className="seat-map-h-band aisle-band-complete aisle-band-horizontal-segment"
                                style={getHorizontalBandOverlayStyle(overlay)}
                              >
                                {idx === labelOverlayIdx && (
                                  <span className="aisle-label-horizontal">{AISLE_LABEL}</span>
                                )}
                              </div>
                            ))}
                            {seatsList.map((seat) => {
                              const isCrossing = completeVerticalCols.includes(seat.seatNumber);
                              return (
                                <div
                                  key={seat.seatUuid}
                                  className={`seat-map-grid-cell ${isCrossing ? 'aisle-band-crossing' : ''}`}
                                  style={getGridColumnStyle(
                                    seatNumberToGridColumn(seat.seatNumber, maxSeatNumber),
                                  )}
                                  aria-hidden
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      className="seat-map-grid seat-map-grid--booking seat-map-row-seats"
                      style={getSeatMapGridStyle(maxSeatNumber)}
                    >
                      {buildRowPlacedItems(
                        seatsList,
                        maxSeatNumber,
                        (seat) => hasAisleSlot(aisleLayout, row, seat.seatNumber),
                      ).map((item) => (
                        <div
                          key={item.key}
                          className="seat-map-grid-cell relative z-[1]"
                          style={getGridColumnStyle(item.gridStart, item.span)}
                        >
                          {item.kind === 'couple-invalid' ? (
                            <div
                              className="seat standard occupied relative z-[1] w-full h-full flex items-center justify-center text-[9px] font-bold opacity-50 cursor-not-allowed"
                              title="Ghế sofa chưa đủ cặp — không thể đặt"
                              aria-hidden
                            >
                              <X className="h-3 w-3" />
                            </div>
                          ) : item.kind === 'couple'
                            ? renderCoupleElement(item.seats, row)
                            : (() => {
                              const seat = item.seats[0];
                              const isAisle = hasAisleSlot(aisleLayout, row, seat.seatNumber);
                              const inCompleteVert = isInCompleteVerticalCol(
                                seat.seatNumber,
                                completeVerticalCols,
                              );
                              const inCompleteDiag = completeDiagonalCells.has(
                                slotKey(row, seat.seatNumber),
                              );
                              const showDiagonalBand = isAisle
                                && aisleLabelAnchors.has(slotKey(row, seat.seatNumber))
                                && inCompleteDiag
                                && !inCompleteVert;

                              if (!isAisle) {
                                return renderSeatElement(seat);
                              }

                              const verticalCell = inCompleteVert
                                ? renderVerticalAisleCellProps(
                                  row,
                                  seat.seatNumber,
                                  bookingRowNames,
                                  aisleLayout,
                                  completeHorizontalRows,
                                  'booking',
                                )
                                : null;

                              if (verticalCell) {
                                return (
                                  <div
                                    className={`seat-map-slot flex items-center justify-center ${verticalCell.cellClass} ${verticalCell.showLabel ? 'overflow-visible' : ''}`}
                                    aria-hidden
                                  >
                                    {verticalCell.showLabel && (
                                      <div
                                        className="aisle-label-vertical-wrap"
                                        style={verticalCell.labelStyle}
                                      >
                                        <span className="aisle-label-vertical">{AISLE_LABEL}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              if (showDiagonalBand) {
                                return (
                                  <div
                                    className="seat-map-slot aisle-band-complete flex items-center justify-center"
                                    aria-hidden
                                  >
                                    <span className="aisle-label-horizontal text-[10px] tracking-[0.28em]">{AISLE_LABEL}</span>
                                  </div>
                                );
                              }

                              if (inCompleteDiag) {
                                return <div className="seat-map-slot" aria-hidden />;
                              }

                              return (
                                <div className="seat-map-slot rounded-lg aisle-slot-incomplete" aria-hidden />
                              );
                            })()}
                        </div>
                      ))}
                    </div>
                  )}

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
              <div className="seat couple opacity-80 pointer-events-none flex items-center justify-center text-[9px] font-bold w-[calc(2.25rem*2+0.5rem)] h-6">12·11</div>
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
              <div className="w-16 h-6 rounded-lg aisle-band-complete flex items-center justify-center px-1">
                <span className="aisle-label-horizontal text-[8px] tracking-[0.22em]">Lối đi</span>
              </div>
              <span className="text-xs font-bold text-gray-300">Lối đi</span>
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
    </div>
  );
};

export default BookingPage;
