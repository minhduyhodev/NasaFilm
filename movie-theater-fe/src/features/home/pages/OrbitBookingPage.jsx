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
  Trash2,
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { orbitService } from '../../../shared/services/orbitService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import {
  BOOKING_SESSION_KEYS,
  readBookingSession,
  writeBookingSession,
} from '../../../shared/utils/bookingSessionStorage';
import { useSeatMapState } from '../../../shared/hooks/useSeatMapState';
import {
  ORBIT_TERMINAL_STATUSES,
  buildSelectedFromMap,
  formatOrbitStatus,
  formatShowtimeDate,
  formatShowtimeLabel,
  resolveSeatLabels,
} from '../../../shared/utils/orbitUtils';
import TheaterSeatMapPanel from '../../../shared/components/seatmap/TheaterSeatMapPanel';
import './BookingPage.css';
import './OrbitBookingPage.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return Boolean(value && UUID_PATTERN.test(value));
}

function persistOrbitMeta(meta) {
  writeBookingSession(BOOKING_SESSION_KEYS.ORBIT, meta);
}

function metaFromRoom(room) {
  if (!room) return {};
  return {
    theater: room.theater || '',
    movie: room.movieTitle || '',
    movieUuid: room.movieUuid || '',
    moviePoster: room.moviePoster || '',
    date: formatShowtimeDate(room.showtimeStartTime),
    showtime: formatShowtimeLabel(room.showtimeStartTime),
  };
}

const OrbitBookingPage = () => {
  const { roomUuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [orbitState] = useState(() =>
    readBookingSession(BOOKING_SESSION_KEYS.ORBIT, location.state) ?? {},
  );
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
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());
  const [roomExpiresIn, setRoomExpiresIn] = useState(null);

  const currentUserUuid = user?.id || user?.uuid;
  const isHostUser = room?.hostUserUuid === currentUserUuid || Boolean(room?.host);
  const isCheckout = room?.status === 'CHECKOUT';
  const canEditSeats = room?.status === 'OPEN';

  const seatMapActionsRef = useRef({
    fetchSeatMap: async () => {},
    setSelectedSeats: () => {},
  });

  const {
    seatRows,
    aisleLayout,
    selectedSeats,
    setSelectedSeats,
    hasGapViolation,
    timeLeft,
    fetchSeatMap,
    fetchSeatMapRef,
  } = useSeatMapState(showtimeUuid, {
    enabled: Boolean(showtimeUuid),
    dedupeInFlight: true,
    lockTimerEnabled: canEditSeats,
    onLockTimeout: async () => {
      await orbitService.updateMemberSeats(roomUuid, []);
      seatMapActionsRef.current.setSelectedSeats([]);
      await seatMapActionsRef.current.fetchSeatMap([], { silent: true });
      notificationService.error('Hết thời gian giữ ghế.');
    },
    onFetchError: () => notificationService.error('Không thể tải sơ đồ ghế'),
  });

  useEffect(() => {
    seatMapActionsRef.current = { fetchSeatMap, setSelectedSeats };
  }, [fetchSeatMap, setSelectedSeats]);

  const [orbitMeta, setOrbitMeta] = useState(orbitState);

  const displayMovie = orbitMeta.movie || room?.movieTitle || 'Phòng đặt vé nhóm';
  const displayTheater = orbitMeta.theater || room?.theater || '';
  const displayDate = orbitMeta.date || formatShowtimeDate(room?.showtimeStartTime);
  const displayShowtime = orbitMeta.showtime || formatShowtimeLabel(room?.showtimeStartTime);
  const resolvedMovieUuid = orbitMeta.movieUuid || room?.movieUuid || movieUuid;

  const applyRoomPayload = useCallback((payload) => {
    if (!payload?.uuid) return;
    if (ORBIT_TERMINAL_STATUSES.includes(payload.status)) {
      notificationService.info('Phòng Orbit đã kết thúc.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies', { replace: true });
      return;
    }
    const meta = metaFromRoom(payload);
    if (meta.movie || meta.theater) {
      setOrbitMeta((prev) => {
        const next = { ...prev, ...meta };
        persistOrbitMeta(next);
        return next;
      });
    }
    setRoom({
      ...payload,
      host: payload.hostUserUuid === currentUserUuid || payload.host,
    });
    if (payload.showtimeUuid) {
      setShowtimeUuid(payload.showtimeUuid);
    }
  }, [currentUserUuid, resolvedMovieUuid, navigate]);

  const refreshRoom = useCallback(async () => {
    if (!isValidUuid(roomUuid)) return null;
    const data = await orbitService.getRoom(roomUuid);
    if (ORBIT_TERMINAL_STATUSES.includes(data.status)) {
      notificationService.info('Phòng Orbit đã kết thúc.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies', { replace: true });
      return null;
    }
    applyRoomPayload(data);
    return data;
  }, [roomUuid, resolvedMovieUuid, navigate, applyRoomPayload]);

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
        setIsPageLoading(true);
        let data = await orbitService.getRoom(roomUuid);
        const isMember = data.viewerMember === true
          || data.members?.some((m) => m.userUuid === currentUserUuid);
        if (!isMember) {
          data = await orbitService.joinRoom(roomUuid);
          notificationService.success('Bạn đã tham gia phòng Orbit.');
        }
        if (cancelled) return;
        applyRoomPayload(data);
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('đầy') || msg.includes('du day')) {
          notificationService.error('Phòng Orbit đã đủ thành viên.');
        } else if (msg.includes('hết hạn') || msg.includes('het han')) {
          notificationService.error('Phòng Orbit đã hết hạn.');
        } else if (msg.includes('chưa được bật') || msg.includes('chua duoc bat')) {
          notificationService.error('Tính năng Orbit Seat chưa được bật.');
        } else {
          notificationService.error(msg || 'Không thể mở phòng Orbit.');
        }
        navigate('/movies', { replace: true });
      } finally {
        if (!cancelled) setIsPageLoading(false);
      }
    };
    if (roomUuid && currentUserUuid) boot();
    return () => { cancelled = true; };
  }, [roomUuid, currentUserUuid, navigate]);

  useRealtimeTopic(
    roomUuid ? REALTIME_TOPICS.orbitRoom(roomUuid) : null,
    (payload) => {
      if (payload?.uuid && payload?.status) {
        applyRoomPayload(payload);
        return;
      }
      refreshRoom().catch(() => {});
    },
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

  const allMembersReady = useMemo(() => {
    if (!room?.members?.length) return false;
    return room.members.length >= 2 && room.members.every((m) => (m.seatUuids?.length || 0) > 0);
  }, [room?.members]);

  const totalRoomSeats = useMemo(
    () => room?.members?.reduce((acc, m) => acc + (m.seatUuids?.length || 0), 0) || 0,
    [room?.members],
  );

  const isGroupSeatLimitOk = totalRoomSeats <= maxSeatsPerBooking;

  const checkoutBlockReason = useMemo(() => {
    if (!isHostUser || !canEditSeats) return null;
    if ((room?.members?.length || 0) < 2) return 'Cần ít nhất 2 thành viên trong phòng.';
    if (!allMembersReady) return 'Mọi thành viên cần chọn ít nhất 1 ghế.';
    if (!isGroupSeatLimitOk) return `Tổng ghế nhóm tối đa ${maxSeatsPerBooking}.`;
    if (hasGapViolation) return 'Sơ đồ ghế có khe hở không hợp lệ.';
    return null;
  }, [isHostUser, canEditSeats, room?.members, allMembersReady, isGroupSeatLimitOk, hasGapViolation, maxSeatsPerBooking]);

  const handleLeave = async () => {
    if (!window.confirm('Bạn có chắc muốn rời phòng Orbit?')) return;
    try {
      await orbitService.leaveRoom(roomUuid);
      notificationService.info('Bạn đã rời phòng Orbit.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies');
    } catch (err) {
      notificationService.error(err.message || 'Không thể rời phòng.');
    }
  };

  const handleCancelRoom = async () => {
    if (!window.confirm('Hủy phòng Orbit? Mọi ghế đang giữ sẽ được giải phóng.')) return;
    try {
      await orbitService.cancelRoom(roomUuid);
      notificationService.info('Đã hủy phòng Orbit.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies');
    } catch (err) {
      notificationService.error(err.message || 'Không thể hủy phòng.');
    }
  };

  const navigateToConcessions = async (preparedSeatUuids, lockExpiresAtMs) => {
    const mapData = await bookingService.getSeatMap(showtimeUuid, preparedSeatUuids);
    const aggregatedSeats = buildSelectedFromMap(mapData.rows || [], preparedSeatUuids);
    const totalAmount = aggregatedSeats.reduce((acc, s) => acc + (s.price || 0), 0);
    const checkoutPayload = {
      showtimeUuid,
      theater: displayTheater,
      movie: displayMovie,
      movieUuid: resolvedMovieUuid,
      moviePoster: orbitMeta.moviePoster || moviePoster,
      movieRating,
      movieFormat,
      movieAgeRestriction,
      date: displayDate,
      showtime: displayShowtime,
      selectedSeats: aggregatedSeats,
      totalAmount,
      lockExpiresAt: lockExpiresAtMs,
      orbitRoomUuid: roomUuid,
      isOrbit: true,
      orbitMembers: room?.members || [],
    };
    writeBookingSession(BOOKING_SESSION_KEYS.ORBIT, { ...orbitMeta, ...metaFromRoom(room) });
    writeBookingSession(BOOKING_SESSION_KEYS.BOOKING, checkoutPayload);
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

  const handleAbortCheckout = async () => {
    if (!isCheckout || !isHostUser) return;
    setIsPreparing(true);
    try {
      const updated = await orbitService.abortCheckout(roomUuid);
      setRoom(updated);
      notificationService.info('Đã hủy checkout — phòng quay lại chọn ghế.');
      await fetchSeatMapRef.current(undefined, { silent: true });
    } catch (err) {
      notificationService.error(err.message || 'Không thể hủy checkout.');
    } finally {
      setIsPreparing(false);
    }
  };

  if (isPageLoading && !room) {
    return (
      <div className="orbit-booking px-4 md:px-10 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pt-8">
          <div className="lg:col-span-8 orbit-booking__skeleton h-[420px]" />
          <div className="lg:col-span-4 space-y-4">
            <div className="orbit-booking__skeleton h-48" />
            <div className="orbit-booking__skeleton h-32" />
          </div>
        </div>
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
              {displayMovie}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {[displayTheater, displayDate, displayShowtime].filter(Boolean).join(' · ') || 'Đang tải thông tin suất chiếu…'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
            <span className={`orbit-booking__status ${statusClass}`}>{formatOrbitStatus(room?.status)}</span>
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
              screenAccent="white"
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
                  <Users className="w-4 h-4 text-red-400" />
                  Thành viên ({room?.members?.length || 0}/{room?.maxMembers})
                </h2>
              </div>
              {(room?.members?.length || 0) < 2 && canEditSeats && (
                <p className="text-xs text-amber-400 mb-3">
                  Mời thêm {Math.max(0, 2 - (room?.members?.length || 0))} thành viên để host có thể thanh toán nhóm.
                </p>
              )}
              <ul className="space-y-2">
                {room?.members?.map((member) => {
                  const isSelf = member.userUuid === currentUserUuid;
                  const seatLabels = resolveSeatLabels(member.seatUuids, seatRows);
                  return (
                    <li
                      key={member.userUuid}
                      className={`orbit-booking__member ${isSelf ? 'orbit-booking__member--self' : ''}`}
                    >
                      <div>
                        <p className="orbit-booking__member-name text-sm font-bold text-white">
                          {member.displayName}
                          {member.host && <Crown className="inline w-3.5 h-3.5 ml-1 text-amber-400" aria-hidden />}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {seatLabels.length > 0
                            ? `Ghế ${seatLabels.join(', ')}`
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

            {isHostUser && canEditSeats && checkoutBlockReason && (
              <p className="text-xs text-zinc-400 text-center px-2">{checkoutBlockReason}</p>
            )}

            {isHostUser && canEditSeats && (
              <button
                type="button"
                disabled={!allMembersReady || isPreparing || hasGapViolation || !isGroupSeatLimitOk}
                onClick={handleHostCheckout}
                className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 hidden lg:flex"
              >
                {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Xác nhận nhóm &amp; thanh toán
              </button>
            )}

            {isHostUser && isCheckout && (
              <>
                <button
                  type="button"
                  disabled={isPreparing}
                  onClick={handleContinueCheckout}
                  className="orbit-booking__cta-host w-full py-4 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Tiếp tục thanh toán
                </button>
                <button
                  type="button"
                  disabled={isPreparing}
                  onClick={handleAbortCheckout}
                  className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-zinc-300 hover:bg-white/5"
                >
                  Quay lại chọn ghế
                </button>
              </>
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
                className="orbit-booking__cta-cancel w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hủy phòng Orbit
              </button>
            )}
          </aside>
        </div>
      </div>

      {isHostUser && canEditSeats && (
        <div className="orbit-booking__sticky-cta lg:hidden">
          <button
            type="button"
            disabled={!allMembersReady || isPreparing || hasGapViolation || !isGroupSeatLimitOk}
            onClick={handleHostCheckout}
            className="orbit-booking__cta-host w-full py-3.5 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {isPreparing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Xác nhận nhóm &amp; thanh toán
          </button>
        </div>
      )}
    </div>
  );
};

export default OrbitBookingPage;
