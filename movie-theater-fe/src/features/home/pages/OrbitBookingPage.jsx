import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Users,
  Share2,
  Copy,
  Rocket,
  Clock,
  Loader2,
  LogOut,
  Crown,
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { orbitService } from '../../../shared/services/orbitService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { stompSocketService, SEAT_MAP_REFRESH_MS } from '../../../shared/services/stompSocketService';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { parseLayoutConfig } from '../../../shared/utils/aisleLayoutUtils';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';
import './BookingPage.css';
import './OrbitBookingPage.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return Boolean(value && UUID_PATTERN.test(value));
}

function buildSelectedFromMap(rows, seatUuids) {
  const wanted = new Set(seatUuids);
  const selected = [];
  rows.forEach((row) => {
    row.seats.forEach((seat) => {
      if (!wanted.has(seat.seatUuid)) return;
      let type = 'Ghế Thường';
      if (seat.seatTypeName === 'VIP') type = 'Ghế VIP';
      if (seat.seatTypeName === 'COUPLE') type = 'Ghế Đôi';
      selected.push({
        seatUuid: seat.seatUuid,
        id: `${row.rowName}${seat.seatNumber}`,
        rowName: row.rowName,
        seatNumber: seat.seatNumber,
        price: seat.price,
        type,
      });
    });
  });
  return selected;
}

const OrbitBookingPage = () => {
  const { roomUuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [orbitState] = useState(() => {
    if (location.state) {
      try {
        sessionStorage.setItem('orbit_booking_state', JSON.stringify(location.state));
      } catch {
        /* ignore */
      }
      return location.state;
    }
    try {
      const saved = sessionStorage.getItem('orbit_booking_state');
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {};
  });
  const {
    theater = '',
    movie = '',
    movieUuid = '',
    moviePoster = '',
    movieRating = null,
    movieFormat = '',
    movieAgeRestriction = '',
    date = '',
    showtime = '',
  } = orbitState;

  const [room, setRoom] = useState(null);
  const [showtimeUuid, setShowtimeUuid] = useState('');
  const [seatRows, setSeatRows] = useState([]);
  const [aisleLayout, setAisleLayout] = useState(() => parseLayoutConfig(null));
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [hasGapViolation, setHasGapViolation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());
  const [roomExpiresIn, setRoomExpiresIn] = useState(null);

  const selectedSeatsRef = useRef([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const currentUserUuid = user?.id || user?.uuid;
  const isHostUser = Boolean(room?.host);
  const isCheckout = room?.status === 'CHECKOUT';
  const canEditSeats = room?.status === 'OPEN';

  const refreshRoom = useCallback(async () => {
    if (!isValidUuid(roomUuid)) return null;
    const data = await orbitService.getRoom(roomUuid);
    if (['EXPIRED', 'CANCELLED', 'CLOSED'].includes(data.status)) {
      notificationService.info('Phòng Orbit đã kết thúc.');
      navigate(movieUuid ? `/movie/${movieUuid}` : '/movies', { replace: true });
      return null;
    }
    setRoom(data);
    setShowtimeUuid(data.showtimeUuid);
    return data;
  }, [roomUuid, movieUuid, navigate]);

  const fetchSeatMap = useCallback(async (overrideUuids, options = {}) => {
    const { silent = false } = options;
    if (!showtimeUuid) return;
    try {
      const uuids = overrideUuids !== undefined
        ? overrideUuids
        : selectedSeatsRef.current.map((s) => s.seatUuid);
      const data = await bookingService.getSeatMap(showtimeUuid, uuids);
      if (data?.rows) {
        setSeatRows(data.rows);
        if (data.layoutConfig) {
          setAisleLayout(parseLayoutConfig(data.layoutConfig));
        }
        const offset = data._serverTimeOffset || 0;
        let expiresAtVal = null;
        let gapFound = false;
        const newSelected = [];
        data.rows.forEach((row) => {
          row.seats.forEach((seat) => {
            if (seat.blocked) {
              gapFound = true;
            }
            if (seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') {
              if (seat.lockedUntil) {
                const seatExpire = new Date(seat.lockedUntil).getTime() - offset;
                if (!expiresAtVal || seatExpire > expiresAtVal) expiresAtVal = seatExpire;
              }
              let type = 'Ghế Thường';
              if (seat.seatTypeName === 'VIP') type = 'Ghế VIP';
              if (seat.seatTypeName === 'COUPLE') type = 'Ghế Đôi';
              newSelected.push({
                seatUuid: seat.seatUuid,
                id: `${row.rowName}${seat.seatNumber}`,
                rowName: row.rowName,
                seatNumber: seat.seatNumber,
                price: seat.price,
                type,
              });
            }
          });
        });
        setSelectedSeats(newSelected);
        setHasGapViolation(gapFound);
        if (expiresAtVal) {
          const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
          setTimeLeft(Math.max(0, Math.floor((expiresAtVal - serverTime) / 1000)));
        } else {
          setTimeLeft(null);
        }
      }
    } catch (err) {
      if (!silent) notificationService.error('Không thể tải sơ đồ ghế');
    } finally {
      setIsLoading(false);
    }
  }, [showtimeUuid]);

  const fetchSeatMapRef = useRef(fetchSeatMap);
  fetchSeatMapRef.current = fetchSeatMap;

  useEffect(() => {
    if (!isValidUuid(roomUuid)) {
      notificationService.error('Phòng Orbit không hợp lệ.');
      navigate('/movies', { replace: true });
    }
  }, [roomUuid, navigate]);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setMaxSeatsPerBooking(getMaxSeatsPerBooking(cfg)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        setIsLoading(true);
        let data = await orbitService.getRoom(roomUuid);
        const isMember = data.members?.some((m) => m.userUuid === currentUserUuid);
        if (!isMember) {
          data = await orbitService.joinRoom(roomUuid);
          notificationService.success('Bạn đã tham gia phòng Orbit.');
        }
        if (cancelled) return;
        setRoom(data);
        setShowtimeUuid(data.showtimeUuid);
      } catch (err) {
        notificationService.error(err.message || 'Không thể mở phòng Orbit.');
        navigate('/movies', { replace: true });
      }
    };
    if (roomUuid && currentUserUuid) boot();
    return () => { cancelled = true; };
  }, [roomUuid, currentUserUuid, navigate]);

  useEffect(() => {
    if (!showtimeUuid) return undefined;
    fetchSeatMapRef.current();
    stompSocketService.ensureConnected().catch(() => {});
    bookingService.watchSeatMap(showtimeUuid).catch(() => {});
    const intervalId = setInterval(() => fetchSeatMapRef.current(undefined, { silent: true }), SEAT_MAP_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
      bookingService.unwatchSeatMap(showtimeUuid).catch(() => {});
    };
  }, [showtimeUuid]);

  useRealtimeTopic(
    showtimeUuid ? REALTIME_TOPICS.showtimeSeats(showtimeUuid) : null,
    () => fetchSeatMapRef.current(undefined, { silent: true }),
    400,
  );

  useRealtimeTopic(
    roomUuid ? REALTIME_TOPICS.orbitRoom(roomUuid) : null,
    () => refreshRoom().catch(() => {}),
    400,
  );

  useEffect(() => {
    if (!room?.expiresAt) return undefined;
    const tick = () => {
      const sec = Math.max(0, Math.floor((new Date(room.expiresAt).getTime() - Date.now()) / 1000));
      setRoomExpiresIn(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [room?.expiresAt]);

  useEffect(() => {
    if (timeLeft === null || !canEditSeats) return undefined;
    if (timeLeft === 0) {
      orbitService.updateMemberSeats(roomUuid, []).then(() => {
        setSelectedSeats([]);
        fetchSeatMapRef.current([], { silent: true });
        notificationService.error('Hết thời gian giữ ghế.');
      }).catch(() => {});
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, canEditSeats, roomUuid]);

  const syncMemberSeats = async (nextUuids) => {
    const updatedRoom = await orbitService.updateMemberSeats(roomUuid, nextUuids);
    setRoom(updatedRoom);
    await fetchSeatMap(nextUuids, { silent: true });
  };

  const handleCoupleClick = async (seats) => {
    if (!canEditSeats) return;
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
        notificationService.error(`Tối đa ${maxSeatsPerBooking} ghế mỗi thành viên.`);
        return;
      }
    }

    const nextUuids = bothSelected
      ? selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid)
      : [
        ...selectedSeats.filter((s) => !pairUuids.includes(s.seatUuid)).map((s) => s.seatUuid),
        ...pairUuids,
      ];

    try {
      await syncMemberSeats(nextUuids);
    } catch (err) {
      notificationService.error(err.message || 'Không thể giữ ghế.');
    }
  };

  const handleSeatClick = async (seat) => {
    if (!canEditSeats) return;
    const isSelected = selectedSeats.some((s) => s.seatUuid === seat.seatUuid);
    if (!isSelected && selectedSeats.length >= maxSeatsPerBooking) {
      notificationService.error(`Tối đa ${maxSeatsPerBooking} ghế mỗi thành viên.`);
      return;
    }
    const nextUuids = isSelected
      ? selectedSeats.filter((s) => s.seatUuid !== seat.seatUuid).map((s) => s.seatUuid)
      : [...selectedSeats.map((s) => s.seatUuid), seat.seatUuid];
    try {
      await syncMemberSeats(nextUuids);
    } catch (err) {
      notificationService.error(err.message || 'Không thể giữ ghế.');
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/booking/orbit/${roomUuid}`;
    try {
      await navigator.clipboard.writeText(url);
      notificationService.success('Đã sao chép link mời.');
    } catch {
      notificationService.info(url);
    }
  };

  const handleLeave = async () => {
    try {
      await orbitService.leaveRoom(roomUuid);
      notificationService.info('Bạn đã rời phòng Orbit.');
      navigate(`/movie/${movieUuid || ''}`);
    } catch (err) {
      notificationService.error(err.message || 'Không thể rời phòng.');
    }
  };

  const handleCancelRoom = async () => {
    try {
      await orbitService.cancelRoom(roomUuid);
      notificationService.info('Đã hủy phòng Orbit.');
      navigate(`/movie/${movieUuid || ''}`);
    } catch (err) {
      notificationService.error(err.message || 'Không thể hủy phòng.');
    }
  };

  const allMembersReady = useMemo(() => {
    if (!room?.members?.length) return false;
    return room.members.length >= 2 && room.members.every((m) => (m.seatUuids?.length || 0) > 0);
  }, [room?.members]);

  const totalRoomSeats = useMemo(
    () => room?.members?.reduce((acc, m) => acc + (m.seatUuids?.length || 0), 0) || 0,
    [room?.members],
  );

  const isGroupSeatLimitOk = totalRoomSeats <= maxSeatsPerBooking;

  const navigateToConcessions = async (preparedSeatUuids, lockExpiresAtMs) => {
    const mapData = await bookingService.getSeatMap(showtimeUuid, preparedSeatUuids);
    const aggregatedSeats = buildSelectedFromMap(mapData.rows || [], preparedSeatUuids);
    const totalAmount = aggregatedSeats.reduce((acc, s) => acc + (s.price || 0), 0);
    const checkoutPayload = {
      showtimeUuid,
      theater,
      movie,
      movieUuid,
      moviePoster,
      movieRating,
      movieFormat,
      movieAgeRestriction,
      date,
      showtime,
      selectedSeats: aggregatedSeats,
      totalAmount,
      lockExpiresAt: lockExpiresAtMs,
      orbitRoomUuid: roomUuid,
      isOrbit: true,
    };
    try {
      sessionStorage.setItem('orbit_booking_state', JSON.stringify(orbitState));
      sessionStorage.setItem('booking_state', JSON.stringify(checkoutPayload));
    } catch {
      /* ignore */
    }
    navigate('/concessions', { state: checkoutPayload });
  };

  const resolveLockExpiresAt = (mapData) => {
    if (!mapData?.rows) return null;
    const offset = mapData._serverTimeOffset || 0;
    let expiresAtVal = null;
    mapData.rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if ((seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') && seat.lockedUntil) {
          const seatExpire = new Date(seat.lockedUntil).getTime() - offset;
          if (!expiresAtVal || seatExpire > expiresAtVal) expiresAtVal = seatExpire;
        }
      });
    });
    if (!expiresAtVal) return null;
    const serverTime = mapData.serverTime ? new Date(mapData.serverTime).getTime() : Date.now();
    return serverTime + Math.max(0, expiresAtVal - serverTime);
  };

  const handleHostCheckout = async () => {
    if (!allMembersReady) {
      notificationService.warning('Mọi thành viên cần chọn ít nhất 1 ghế.');
      return;
    }
    if (!isGroupSeatLimitOk) {
      notificationService.error(`Tổng ghế nhóm tối đa ${maxSeatsPerBooking}.`);
      return;
    }
    setIsPreparing(true);
    try {
      const prepared = await orbitService.prepareCheckout(roomUuid);
      setRoom((prev) => (prev ? { ...prev, status: 'CHECKOUT' } : prev));
      const mapData = await bookingService.getSeatMap(showtimeUuid, prepared.seatUuids);
      await navigateToConcessions(prepared.seatUuids, resolveLockExpiresAt(mapData));
    } catch (err) {
      notificationService.error(err.message || 'Không thể chuẩn bị thanh toán nhóm.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleContinueCheckout = async () => {
    if (!isCheckout || !isHostUser) return;
    setIsPreparing(true);
    try {
      const data = await orbitService.getRoom(roomUuid);
      const allSeatUuids = (data.members || []).flatMap((m) => m.seatUuids || []);
      const mapData = await bookingService.getSeatMap(showtimeUuid, allSeatUuids);
      await navigateToConcessions(allSeatUuids, resolveLockExpiresAt(mapData));
    } catch (err) {
      notificationService.error(err.message || 'Không thể tiếp tục thanh toán.');
    } finally {
      setIsPreparing(false);
    }
  };

  if (isLoading && !room) {
    return (
      <div className="orbit-booking flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const statusClass = room?.status === 'OPEN'
    ? 'orbit-booking__status--open'
    : room?.status === 'CHECKOUT'
      ? 'orbit-booking__status--checkout'
      : 'orbit-booking__status--closed';

  return (
    <div className="orbit-booking booking-wrapper px-4 md:px-10 pb-16">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="orbit-booking__hero-badge mb-3">
              <Rocket className="w-3.5 h-3.5" />
              Orbit Seat
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
              {movie || 'Phòng đặt vé nhóm'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {theater} · {date} · {showtime}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`orbit-booking__status ${statusClass}`}>{room?.status}</span>
            {roomExpiresIn !== null && (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-4 h-4" />
                Phòng: {Math.floor(roomExpiresIn / 60)}:{String(roomExpiresIn % 60).padStart(2, '0')}
              </span>
            )}
            {timeLeft !== null && canEditSeats && (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Clock className="w-4 h-4" />
                Giữ ghế: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl orbit-booking__panel">
            <TheaterSeatMapPanel
              seatRows={seatRows}
              aisleLayout={aisleLayout}
              hasGapViolation={hasGapViolation}
              disabled={!canEditSeats}
              onSeatClick={handleSeatClick}
              onCoupleClick={handleCoupleClick}
              screenAccent="cyan"
              footerNote={
                !canEditSeats
                  ? (isCheckout ? 'Host đang thanh toán — ghế đã khóa cho nhóm.' : 'Phòng đã đóng.')
                  : null
              }
            />
          </section>

          <aside className="lg:col-span-4 flex flex-col gap-4">
            <div className="orbit-booking__panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Thành viên ({room?.members?.length || 0}/{room?.maxMembers})
                </h2>
              </div>
              <ul className="space-y-2">
                {room?.members?.map((member) => {
                  const isSelf = member.userUuid === currentUserUuid;
                  return (
                    <li
                      key={member.userUuid}
                      className={`orbit-booking__member ${isSelf ? 'orbit-booking__member--self' : ''} ${member.host ? 'orbit-booking__member--host' : ''}`}
                    >
                      <div>
                        <p className="orbit-booking__member-name text-sm font-bold text-white">
                          {member.displayName}
                          {member.host && <Crown className="inline w-3.5 h-3.5 ml-1 text-amber-400" />}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {(member.seatUuids?.length || 0) > 0
                            ? `${member.seatUuids.length} ghế`
                            : 'Chưa chọn ghế'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-zinc-500 mt-4">
                Tổng {totalRoomSeats}/{maxSeatsPerBooking} ghế · Host trả toàn bộ vé nhóm
              </p>
              {!isGroupSeatLimitOk && canEditSeats && (
                <p className="text-xs text-amber-400 mt-2 font-semibold">
                  Tổng ghế nhóm vượt giới hạn {maxSeatsPerBooking}.
                </p>
              )}
            </div>

            <div className="orbit-booking__panel p-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" />
                Mời bạn bè
              </h3>
              <p className="orbit-booking__share mb-3">{room?.sharePath}</p>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 text-sm font-bold hover:bg-white/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Sao chép link
              </button>
            </div>

            {isHostUser && canEditSeats && (
              <button
                type="button"
                disabled={!allMembersReady || isPreparing || hasGapViolation || !isGroupSeatLimitOk}
                onClick={handleHostCheckout}
                className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Xác nhận nhóm &amp; thanh toán
              </button>
            )}

            {isHostUser && isCheckout && (
              <button
                type="button"
                disabled={isPreparing}
                onClick={handleContinueCheckout}
                className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Tiếp tục thanh toán
              </button>
            )}

            {!isHostUser && isCheckout && (
              <p className="text-sm text-zinc-400 text-center px-2">
                Host đang thanh toán nhóm. Vui lòng chờ xác nhận vé.
              </p>
            )}

            {!room?.host && canEditSeats && (
              <button
                type="button"
                onClick={handleLeave}
                className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Rời phòng
              </button>
            )}

            {isHostUser && canEditSeats && (
              <button
                type="button"
                onClick={handleCancelRoom}
                className="w-full py-2 text-xs font-semibold text-red-400/80 hover:text-red-400"
              >
                Hủy phòng Orbit
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrbitBookingPage;
