import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { bookingService } from '../../../shared/services/bookingService';
import { orbitService } from '../../../shared/services/orbitService';
import { stompSocketService } from '../../../shared/services/stompSocketService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { getMaxSeatsPerBooking } from '../../../shared/utils/systemConfig';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import {
  BOOKING_SESSION_KEYS,
  clearAllBookingSessions,
  readBookingSession,
  writeBookingSession,
} from '../../../shared/utils/bookingSessionStorage';
import { useSeatMapState } from '../../../shared/hooks/useSeatMapState';
import {
  ORBIT_TERMINAL_STATUSES,
  buildOrbitSeatOwnerMap,
  buildSelectedFromMap,
  formatShowtimeDate,
  formatShowtimeLabel,
  resolveOrbitErrorMessage,
} from '../../../shared/utils/orbitUtils';
import OrbitBookingHeader from '../components/OrbitBookingHeader';
import OrbitMemberPanel from '../components/OrbitMemberPanel';
import OrbitSharePanel from '../components/OrbitSharePanel';
import OrbitCheckoutActions from '../components/OrbitCheckoutActions';
import OrbitSeatMapSection from '../components/OrbitSeatMapSection';
import {
  isValidUuid,
  metaFromRoom,
  persistOrbitMeta,
  resolveLockExpiresAt,
} from '../utils/orbitBookingUtils';
import './BookingPage.css';
import './OrbitBookingPage.css';

const OrbitBookingPage = () => {
  const { roomUuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [orbitState] = useState(() =>
    readBookingSession(BOOKING_SESSION_KEYS.ORBIT, location.state) ?? {},
  );
  const {
    movieUuid = '',
    moviePoster = '',
    movieRating = null,
    movieFormat = '',
    movieAgeRestriction = '',
  } = orbitState;

  const [room, setRoom] = useState(null);
  const [showtimeUuid, setShowtimeUuid] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [maxSeatsPerBooking, setMaxSeatsPerBooking] = useState(() => getMaxSeatsPerBooking());
  const [orbitMeta, setOrbitMeta] = useState(orbitState);

  const syncQueueRef = useRef(Promise.resolve());
  const seatMapActionsRef = useRef({
    fetchSeatMap: async () => {},
    setSelectedSeats: () => {},
  });

  const currentUserUuid = user?.id || user?.uuid;
  const isHostUser = room?.hostUserUuid === currentUserUuid || Boolean(room?.host);
  const isCheckout = room?.status === 'CHECKOUT';
  const canEditSeats = room?.status === 'OPEN';

  const {
    seatRows,
    aisleLayout,
    selectedSeats,
    setSelectedSeats,
    hasGapViolation,
    timeLeft,
    isMapLoading,
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

  const displayMovie = orbitMeta.movie || room?.movieTitle || 'Phòng đặt vé nhóm';
  const displayTheater = orbitMeta.theater || room?.theater || '';
  const displayDate = orbitMeta.date || formatShowtimeDate(room?.showtimeStartTime);
  const displayShowtime = orbitMeta.showtime || formatShowtimeLabel(room?.showtimeStartTime);
  const resolvedMovieUuid = orbitMeta.movieUuid || room?.movieUuid || movieUuid;

  const orbitSeatOwners = useMemo(
    () => buildOrbitSeatOwnerMap(room?.members, currentUserUuid),
    [room?.members, currentUserUuid],
  );

  const applyRoomPayload = useCallback((payload) => {
    if (!payload?.uuid) return;
    if (ORBIT_TERMINAL_STATUSES.includes(payload.status)) {
      clearAllBookingSessions();
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
      clearAllBookingSessions();
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
        notificationService.error(resolveOrbitErrorMessage(err, 'Không thể mở phòng Orbit.'));
        navigate('/movies', { replace: true });
      } finally {
        if (!cancelled) setIsPageLoading(false);
      }
    };
    if (roomUuid && currentUserUuid) boot();
    return () => { cancelled = true; };
  }, [roomUuid, currentUserUuid, navigate, applyRoomPayload]);

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

  const syncMemberSeats = useCallback(async (nextUuids) => {
    const task = syncQueueRef.current.then(async () => {
      setIsSyncing(true);
      try {
        const updatedRoom = await orbitService.updateMemberSeats(roomUuid, nextUuids);
        setRoom(updatedRoom);
        if (!stompSocketService.isConnected()) {
          await fetchSeatMap(nextUuids, { silent: true });
        }
        return updatedRoom;
      } finally {
        setIsSyncing(false);
      }
    });
    syncQueueRef.current = task.catch(() => {});
    return task;
  }, [roomUuid, fetchSeatMap]);

  const handleCoupleClick = async (seats) => {
    if (!canEditSeats || isSyncing) return;
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
    if (!canEditSeats || isSyncing) return;
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
      clearAllBookingSessions();
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
      clearAllBookingSessions();
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

  const handleHostCheckout = async () => {
    if (!allMembersReady || !isGroupSeatLimitOk) return;
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

  if ((isPageLoading && !room) || (isMapLoading && showtimeUuid && !seatRows.length)) {
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

  return (
    <div className="orbit-booking booking-wrapper px-4 md:px-10 pb-16">
      <div className="max-w-7xl mx-auto">
        <OrbitBookingHeader
          displayMovie={displayMovie}
          displayTheater={displayTheater}
          displayDate={displayDate}
          displayShowtime={displayShowtime}
          roomStatus={room?.status}
          expiresAt={room?.expiresAt}
          lockTimeLeft={timeLeft}
          showLockTimer={canEditSeats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <OrbitSeatMapSection
            seatRows={seatRows}
            aisleLayout={aisleLayout}
            hasGapViolation={hasGapViolation}
            disabled={!canEditSeats || isSyncing}
            isSyncing={isSyncing}
            isCheckout={isCheckout}
            canEditSeats={canEditSeats}
            orbitSeatOwners={orbitSeatOwners}
            members={room?.members}
            onSeatClick={handleSeatClick}
            onCoupleClick={handleCoupleClick}
          />

          <aside className="lg:col-span-4 flex flex-col gap-4">
            <OrbitMemberPanel
              members={room?.members}
              maxMembers={room?.maxMembers}
              currentUserUuid={currentUserUuid}
              seatRows={seatRows}
              totalRoomSeats={totalRoomSeats}
              maxSeatsPerBooking={maxSeatsPerBooking}
              canEditSeats={canEditSeats}
              isGroupSeatLimitOk={isGroupSeatLimitOk}
            />
            <OrbitSharePanel sharePath={room?.sharePath} onCopyLink={handleCopyLink} />
            <OrbitCheckoutActions
              isHostUser={isHostUser}
              canEditSeats={canEditSeats}
              isCheckout={isCheckout}
              isPreparing={isPreparing}
              allMembersReady={allMembersReady}
              hasGapViolation={hasGapViolation}
              isGroupSeatLimitOk={isGroupSeatLimitOk}
              checkoutBlockReason={checkoutBlockReason}
              showHost
              onHostCheckout={handleHostCheckout}
              onContinueCheckout={handleContinueCheckout}
              onAbortCheckout={handleAbortCheckout}
              onLeave={handleLeave}
              onCancelRoom={handleCancelRoom}
            />
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
