import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
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
  clearAllBookingSessions,
  readBookingSession,
  writeBookingSession,
} from '../../../shared/utils/bookingSessionStorage';
import { useSeatMapState } from '../../../shared/hooks/useSeatMapState';
import {
  ORBIT_TERMINAL_STATUSES,
  buildOrbitSeatOwnerMap,
  buildSelectedFromMap,
  countOrbitRoomSeats,
  countMyOrbitMemberSeats,
  formatShowtimeDate,
  formatShowtimeLabel,
  resolveOrbitErrorMessage,
  sameUuid,
  wouldExceedOrbitRoomSeatLimit,
} from '../../../shared/utils/orbitUtils';
import { stompSocketService } from '../../../shared/services/stompSocketService';
import OrbitBookingHeader from '../components/OrbitBookingHeader';
import OrbitMemberPanel from '../components/OrbitMemberPanel';
import OrbitSharePanel from '../components/OrbitSharePanel';
import OrbitCheckoutActions from '../components/OrbitCheckoutActions';
import OrbitChatBox from '../components/OrbitChatBox';
import OrbitSeatMapSection from '../components/OrbitSeatMapSection';
import {
  isValidUuid,
  metaFromRoom,
  persistOrbitMeta,
  resolveLockExpiresAt,
} from '../utils/orbitBookingUtils';
import {
  markOrbitRoomLeft,
  rememberOrbitRoom,
  removeOrbitRoom,
} from '../../../shared/utils/orbitRecentStorage';
import './BookingPage.css';
import './OrbitBookingPage.css';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const OrbitBookingPage = () => {
  const confirm = useConfirm();
  const { roomUuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

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
  const [realtimeConnected, setRealtimeConnected] = useState(() => stompSocketService.isConnected());

  const syncQueueRef = useRef(Promise.resolve());
  const seatMapActionsRef = useRef({
    fetchSeatMap: async () => {},
    setSelectedSeats: () => {},
  });
  const currentUserUuidRef = useRef(null);
  const orbitBootPromiseRef = useRef(null);
  const lastRoomSyncRef = useRef(0);

  const markRoomSynced = useCallback(() => {
    lastRoomSyncRef.current = Date.now();
  }, []);

  const currentUserUuid = user?.id || user?.uuid;
  currentUserUuidRef.current = currentUserUuid;
  const isHostUser = sameUuid(room?.hostUserUuid, currentUserUuid) || Boolean(room?.host);
  const isCheckout = room?.status === 'CHECKOUT';
  const myMember = room?.members?.find((m) => sameUuid(m.userUuid, currentUserUuid));
  const isMyMemberCompleted = myMember?.completed === true;
  const canEditSeats = room?.status === 'OPEN' && (!isMyMemberCompleted || isHostUser);

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
      if (!canEditSeats) return;
      try {
        await orbitService.updateMemberSeats(roomUuid, []);
      } catch (err) {
        console.error('Failed to release seats on lock timeout:', err);
      }
      seatMapActionsRef.current.setSelectedSeats([]);
      await seatMapActionsRef.current.fetchSeatMap([], { silent: true });
      notificationService.error('Hết thời gian giữ ghế. Vui lòng chọn lại ghế.');
    },
    onFetchError: () => notificationService.error('Không thể tải sơ đồ ghế'),
  });

  useEffect(() => {
    seatMapActionsRef.current = { fetchSeatMap, setSelectedSeats };
  }, [fetchSeatMap, setSelectedSeats]);

  const refreshSeatMapForRoom = useCallback((members, preferredUserUuid) => {
    const myMember = members?.find(
      (member) => sameUuid(member.userUuid, preferredUserUuid),
    );
    const mySeatUuids = myMember?.seatUuids || [];
    // Only pass current user's seats — passing the whole group's uuids marks them as "selected" locally.
    return fetchSeatMapRef.current(mySeatUuids, { silent: true }).catch(() => {});
  }, [fetchSeatMapRef]);

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
      removeOrbitRoom(payload.uuid);
      clearAllBookingSessions();
      notificationService.info('Phòng nhóm đã kết thúc.');
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
      host: sameUuid(payload.hostUserUuid, currentUserUuid) || payload.host,
    });
    if (payload.showtimeUuid) {
      setShowtimeUuid(payload.showtimeUuid);
    }
  }, [currentUserUuid, resolvedMovieUuid, navigate]);

  const refreshRoom = useCallback(async () => {
    if (!isValidUuid(roomUuid)) return null;
    const data = await orbitService.getRoom(roomUuid);
    if (ORBIT_TERMINAL_STATUSES.includes(data.status)) {
      removeOrbitRoom(roomUuid);
      clearAllBookingSessions();
      notificationService.info('Phòng nhóm đã kết thúc.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies', { replace: true });
      return null;
    }
    applyRoomPayload(data);
    markRoomSynced();
    return data;
  }, [roomUuid, resolvedMovieUuid, navigate, applyRoomPayload, markRoomSynced]);

  useEffect(() => {
    if (!isValidUuid(roomUuid)) {
      notificationService.error('Phòng nhóm không hợp lệ.');
      navigate('/movies', { replace: true });
    }
  }, [roomUuid, navigate]);

  useEffect(() => {
    systemConfigService.getConfig()
      .then((cfg) => setMaxSeatsPerBooking(getMaxSeatsPerBooking(cfg)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isValidUuid(roomUuid) || authLoading || !currentUserUuid) {
      return undefined;
    }

    let cancelled = false;

    const resolveMembership = (payload) => payload.viewerMember === true
      || payload.members?.some((member) => sameUuid(member.userUuid, currentUserUuid));

    const boot = async () => {
      setIsPageLoading(true);

      let data = await orbitService.getRoom(roomUuid);
      if (!resolveMembership(data)) {
        try {
          data = await orbitService.joinRoom(roomUuid);
          notificationService.success('Bạn đã tham gia phòng nhóm.');
        } catch (joinErr) {
          const retry = await orbitService.getRoom(roomUuid);
          if (resolveMembership(retry)) {
            data = retry;
          } else {
            throw joinErr;
          }
        }
      }

      return data;
    };

    const runBoot = async () => {
      if (!orbitBootPromiseRef.current) {
        orbitBootPromiseRef.current = boot().finally(() => {
          orbitBootPromiseRef.current = null;
        });
      }

      try {
        const data = await orbitBootPromiseRef.current;
        if (cancelled) return;
        applyRoomPayload(data);
        rememberOrbitRoom(data, orbitMeta);
        markRoomSynced();
      } catch (err) {
        if (cancelled) return;
        notificationService.error(resolveOrbitErrorMessage(err, 'Không thể mở phòng nhóm.'));
        navigate('/movies', { replace: true });
      } finally {
        if (!cancelled) setIsPageLoading(false);
      }
    };

    runBoot();

    return () => {
      cancelled = true;
    };
  }, [roomUuid, currentUserUuid, authLoading, navigate, applyRoomPayload, markRoomSynced]);

  useEffect(() => {
    if (!roomUuid || authLoading || !currentUserUuid) return undefined;
    stompSocketService.ensureConnected().catch(() => {});
    const unsubscribe = stompSocketService.addConnectionListener(setRealtimeConnected);
    return unsubscribe;
  }, [roomUuid, authLoading, currentUserUuid]);

  useEffect(() => {
    if (!roomUuid || !currentUserUuid) return undefined;
    const intervalId = window.setInterval(() => {
      const wsQuiet = Date.now() - lastRoomSyncRef.current > 5000;
      if (wsQuiet || !stompSocketService.isConnected()) {
        refreshRoom().catch(() => {});
      }
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [roomUuid, currentUserUuid, refreshRoom]);

  useRealtimeTopic(
    roomUuid ? REALTIME_TOPICS.orbitRoom(roomUuid) : null,
    (payload) => {
      if (payload?.uuid && payload?.status) {
        applyRoomPayload(payload);
        markRoomSynced();
        refreshSeatMapForRoom(payload.members, currentUserUuidRef.current);
        return;
      }
      refreshRoom().catch(() => {});
    },
    300,
  );

  useRealtimeTopic(
    showtimeUuid ? REALTIME_TOPICS.showtimeSeats(showtimeUuid) : null,
    () => {
      refreshRoom()
        .then((data) => {
          if (data?.members) {
            refreshSeatMapForRoom(data.members, currentUserUuidRef.current);
          }
        })
        .catch(() => {});
    },
    350,
  );

  const syncMemberSeats = useCallback(async (nextUuids) => {
    const task = syncQueueRef.current.then(async () => {
      setIsSyncing(true);
      try {
        const updatedRoom = await orbitService.updateMemberSeats(roomUuid, nextUuids);
        setRoom(updatedRoom);
        markRoomSynced();
        await fetchSeatMap(nextUuids, { silent: true });
        return updatedRoom;
      } finally {
        setIsSyncing(false);
      }
    });
    syncQueueRef.current = task.catch(() => {});
    return task;
  }, [roomUuid, fetchSeatMap, markRoomSynced]);

  const handleCoupleClick = async (seats) => {
    if (!canEditSeats || isSyncing) return;
    const pairUuids = seats.map((s) => s.seatUuid);
    const bothSelected = pairUuids.every((uuid) =>
      selectedSeats.some((s) => s.seatUuid === uuid),
    );
    if (!bothSelected) {
      const mySeatCount = countMyOrbitMemberSeats(room?.members, currentUserUuid, selectedSeats);
      const newInPair = pairUuids.filter(
        (uuid) => !selectedSeats.some((s) => s.seatUuid === uuid),
      ).length;
      const nextMyCount = mySeatCount + newInPair;
      if (wouldExceedOrbitRoomSeatLimit(
        room?.members,
        currentUserUuid,
        nextMyCount,
        maxSeatsPerBooking,
      )) {
        notificationService.error(`Phòng nhóm tối đa ${maxSeatsPerBooking} ghế cho cả nhóm.`);
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
    const mySeatCount = countMyOrbitMemberSeats(room?.members, currentUserUuid, selectedSeats);
    const nextMyCount = isSelected ? Math.max(0, mySeatCount - 1) : mySeatCount + 1;
    if (!isSelected && wouldExceedOrbitRoomSeatLimit(
      room?.members,
      currentUserUuid,
      nextMyCount,
      maxSeatsPerBooking,
    )) {
      notificationService.error(`Phòng nhóm tối đa ${maxSeatsPerBooking} ghế cho cả nhóm.`);
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
    () => countOrbitRoomSeats(room?.members),
    [room?.members],
  );

  const isGroupSeatLimitOk = totalRoomSeats <= maxSeatsPerBooking;

  const checkoutBlockReason = useMemo(() => {
    if (!isHostUser || !canEditSeats) return null;
    if ((room?.members?.length || 0) < 2) return 'Cần ít nhất 2 thành viên trong phòng.';
    if (!allMembersReady) return 'Mọi thành viên cần chọn ít nhất 1 ghế.';
    if (!isGroupSeatLimitOk) return `Tổng ghế nhóm tối đa ${maxSeatsPerBooking}.`;
    if (hasGapViolation) return 'Có ghế đơn bị kẹp giữa — vui lòng chọn thêm ghế trống hoặc đổi vị trí trước khi thanh toán.';
    
    // Removed early block check: host can proceed to concessions and checkout.
    // The check is now enforced on the final payment button inside CheckoutPage.jsx.
    
    return null;
  }, [isHostUser, canEditSeats, room?.members, allMembersReady, isGroupSeatLimitOk, hasGapViolation, maxSeatsPerBooking]);

  const handleLeave = async () => {
    const ok = await confirm({
      title: 'Rời phòng nhóm',
      message: 'Bạn có chắc muốn rời phòng nhóm? Ghế đang giữ của bạn sẽ được giải phóng.',
      confirmLabel: 'Rời phòng',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await orbitService.leaveRoom(roomUuid);
      if (room) {
        rememberOrbitRoom({ ...room, uuid: roomUuid }, orbitMeta);
      }
      markOrbitRoomLeft(roomUuid);
      clearAllBookingSessions();
      notificationService.info('Bạn đã rời phòng nhóm. Có thể vào lại từ trang phim hoặc link mời.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies');
    } catch (err) {
      notificationService.error(err.message || 'Không thể rời phòng.');
    }
  };

  const handleCancelRoom = async () => {
    const ok = await confirm({
      title: 'Hủy phòng nhóm',
      message: 'Hủy phòng nhóm? Mọi ghế đang giữ sẽ được giải phóng và phòng sẽ bị đóng.',
      confirmLabel: 'Hủy phòng',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await orbitService.cancelRoom(roomUuid);
      removeOrbitRoom(roomUuid);
      clearAllBookingSessions();
      notificationService.info('Đã hủy phòng nhóm.');
      navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies');
    } catch (err) {
      notificationService.error(err.message || 'Không thể hủy phòng.');
    }
  };



  const handleMemberProceedToConcessions = () => {
    if (!selectedSeats || selectedSeats.length === 0) {
      notificationService.error('Vui lòng chọn ít nhất 1 ghế trước khi tiếp tục.');
      return;
    }
    const lockExpiresAtMs = room?.expiresAt
      ? new Date(room.expiresAt).getTime()
      : null;
    const checkoutPayload = {
      showtimeUuid,
      theater: displayTheater,
      movie: displayMovie,
      movieUuid: resolvedMovieUuid,
      moviePoster: room?.moviePoster || orbitMeta.moviePoster,
      movieRating: room?.movieRating || orbitMeta.movieRating,
      movieFormat: room?.movieFormat || orbitMeta.movieFormat,
      movieAgeRestriction: room?.movieAgeRestriction || orbitMeta.movieAgeRestriction,
      date: displayDate,
      showtime: displayShowtime,
      selectedSeats: selectedSeats,
      totalAmount: selectedSeats.reduce((acc, s) => acc + (s.price || 0), 0),
      lockExpiresAt: lockExpiresAtMs,
      orbitRoomUuid: roomUuid,
      isOrbit: true,
      isHost: false,
    };
    writeBookingSession(BOOKING_SESSION_KEYS.BOOKING, checkoutPayload);
    navigate('/concessions', { state: checkoutPayload });
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
      isHost: true,
      orbitMembers: room?.members || [],
    };
    writeBookingSession(BOOKING_SESSION_KEYS.ORBIT, { ...orbitMeta, ...metaFromRoom(room) });
    writeBookingSession(BOOKING_SESSION_KEYS.BOOKING, checkoutPayload);
    navigate('/concessions', { state: checkoutPayload });
  };

  const handleHostCheckout = async () => {
    if (!allMembersReady || !isGroupSeatLimitOk || hasGapViolation) return;
    const ok = await confirm({
      title: 'Bắt đầu thanh toán nhóm',
      message: 'Mọi thành viên đã sẵn sàng. Chuyển sang bước bắp nước và thanh toán?',
      detail: 'Các thành viên sẽ không thể đổi ghế cho đến khi bạn hủy checkout.',
      confirmLabel: 'Tiếp tục thanh toán',
      variant: 'warning',
    });
    if (!ok) return;

    setIsPreparing(true);
    try {
      const prepared = await orbitService.prepareCheckout(roomUuid);
      setRoom((prev) => (prev ? { ...prev, status: 'CHECKOUT' } : prev));
      const mapData = await bookingService.getSeatMap(showtimeUuid, prepared.seatUuids);
      const checkoutExpiresAtMs = prepared.checkoutExpiresAt
        ? new Date(prepared.checkoutExpiresAt).getTime()
        : resolveLockExpiresAt(mapData);
      await navigateToConcessions(prepared.seatUuids, checkoutExpiresAtMs);
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
      const checkoutExpiresAtMs = data.expiresAt
        ? new Date(data.expiresAt).getTime()
        : resolveLockExpiresAt(mapData);
      await navigateToConcessions(allSeatUuids, checkoutExpiresAtMs);
    } catch (err) {
      notificationService.error(err.message || 'Không thể tiếp tục thanh toán.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleAbortCheckout = async () => {
    if (!isCheckout || !isHostUser) return;
    const ok = await confirm({
      title: 'Hủy thanh toán nhóm',
      message: 'Hủy bước thanh toán và quay lại chọn ghế? Các thành viên sẽ phải chọn lại.',
      confirmLabel: 'Hủy checkout',
      variant: 'danger',
    });
    if (!ok) return;

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
        {/* Breadcrumb quay lại trang chi tiết phim */}
        <div 
          className="mb-6 flex items-center gap-2 group cursor-pointer w-fit text-[#c8c5ca] hover:text-white transition-colors" 
          onClick={() => {
            navigate(resolvedMovieUuid ? `/movie/${resolvedMovieUuid}` : '/movies');
          }}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xs font-semibold">Quay lại trang phim</span>
        </div>

        <OrbitBookingHeader
          displayMovie={displayMovie}
          displayTheater={displayTheater}
          displayDate={displayDate}
          displayShowtime={displayShowtime}
          roomStatus={room?.status}
          expiresAt={room?.expiresAt}
          lockTimeLeft={timeLeft}
          showLockTimer={canEditSeats}
          realtimeConnected={realtimeConnected}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Trò chuyện */}
          <div className="lg:col-span-3 flex flex-col">
            <OrbitChatBox roomUuid={roomUuid} />
          </div>

          {/* Cột giữa: Sơ đồ ghế */}
          <div className="lg:col-span-6 flex flex-col">
            <OrbitSeatMapSection
              seatRows={seatRows}
              aisleLayout={aisleLayout}
              hasGapViolation={hasGapViolation}
              disabled={!canEditSeats || isSyncing}
              isSyncing={isSyncing}
              isCheckout={isCheckout}
              canEditSeats={canEditSeats}
              orbitSeatOwners={orbitSeatOwners}
              onSeatClick={handleSeatClick}
              onCoupleClick={handleCoupleClick}
            />
          </div>

          {/* Cột phải: Thông tin & Hành động */}
          <aside className="lg:col-span-3 flex flex-col gap-4">
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
              hasSelectedSeats={selectedSeats && selectedSeats.length > 0}
              onMemberConcessions={handleMemberProceedToConcessions}
              isMemberCompleted={isMyMemberCompleted}
              onGoToWaitingPage={() => navigate(`/booking/orbit/${roomUuid}/waiting`)}
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
            Xác nhận nhóm &amp; Tiếp tục
          </button>
        </div>
      )}
    </div>
  );
};

export default OrbitBookingPage;
