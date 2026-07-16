import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Armchair, Ticket, Coffee, MapPin, CalendarClock, Film } from 'lucide-react';
import { orbitService } from '../../../shared/services/orbitService';
import { bookingService } from '../../../shared/services/bookingService';
import { comboService } from '../../../shared/services/comboService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { notificationService } from '../../../shared/services/notificationService';
import { sameUuid, formatShowtimeDate, formatShowtimeLabel } from '../../../shared/utils/orbitUtils';
import { removeOrbitRoom } from '../../../shared/utils/orbitRecentStorage';
import OrbitChatBox from '../components/OrbitChatBox';
import OrbitBookingTimers from '../components/OrbitBookingTimers';
import { resolveLockExpiresAt } from '../utils/orbitBookingUtils';

const formatVnd = (value) => `${Math.max(0, Math.round(value || 0)).toLocaleString('vi-VN')}đ`;

const buildSeatInfoMap = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    (row.seats || []).forEach((seat) => {
      if (!seat?.seatUuid) return;
      const label = `${seat.rowName || row.rowName || ''}${seat.seatNumber ?? ''}`.trim();
      map.set(String(seat.seatUuid).toLowerCase(), {
        label: label || String(seat.seatUuid).slice(0, 8).toUpperCase(),
        price: Number(seat.price) || 0,
      });
    });
  });
  return map;
};

const OrbitWaitingPage = () => {
  const { roomUuid } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const currentUserUuid = user?.id || user?.uuid;

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [seatInfoMap, setSeatInfoMap] = useState(() => new Map());
  const [comboMetaMap, setComboMetaMap] = useState(() => new Map());
  const [lockTimeLeft, setLockTimeLeft] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchRoom = async () => {
      try {
        const data = await orbitService.getRoom(roomUuid);
        if (active) {
          setRoom(data);
          setLoading(false);
          if (data.status === 'CLOSED' && data.bookingUuid) {
            navigate(`/pre-show/boarding/${data.bookingUuid}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to load room details:', err);
        notificationService.error('Không thể tải thông tin phòng Orbit.');
        if (active) setLoading(false);
      }
    };
    fetchRoom();
    return () => {
      active = false;
    };
  }, [roomUuid, navigate]);

  useEffect(() => {
    let active = true;
    const loadLabels = async () => {
      if (!room?.showtimeUuid) return;
      const myMember = (room.members || []).find((m) => sameUuid(m.userUuid, currentUserUuid));
      const seatUuids = myMember?.seatUuids || [];
      try {
        const [mapData, combos] = await Promise.all([
          bookingService.getSeatMap(room.showtimeUuid, seatUuids),
          comboService.getActiveCombos().catch(() => []),
        ]);
        if (!active) return;
        setSeatInfoMap(buildSeatInfoMap(mapData?.rows || []));
        const lockMs = resolveLockExpiresAt(mapData);
        if (lockMs) {
          setLockTimeLeft(Math.max(0, Math.floor((lockMs - Date.now()) / 1000)));
        }
        const meta = new Map();
        (combos || []).forEach((combo) => {
          if (combo?.uuid) {
            meta.set(String(combo.uuid).toLowerCase(), {
              name: combo.name || 'Combo',
              price: Number(combo.price) || 0,
            });
          }
        });
        setComboMetaMap(meta);
      } catch (err) {
        console.error('Failed to resolve seat/combo labels:', err);
      }
    };
    loadLabels();
    return () => {
      active = false;
    };
  }, [room?.showtimeUuid, room?.members, currentUserUuid]);

  useEffect(() => {
    if (lockTimeLeft === null) return undefined;
    if (lockTimeLeft <= 0) return undefined;
    const id = setInterval(() => {
      setLockTimeLeft((prev) => (prev === null || prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [lockTimeLeft]);

  useRealtimeTopic(REALTIME_TOPICS.orbitRoom(roomUuid), (updatedRoom) => {
    if (updatedRoom) {
      setRoom(updatedRoom);

      if (updatedRoom.status === 'CLOSED' && updatedRoom.bookingUuid) {
        removeOrbitRoom(roomUuid);
        notificationService.addNotification(
          'Đặt vé Orbit thành công',
          'Host đã thanh toán xong. Vé của bạn đã sẵn sàng — kiểm tra email để lấy mã vé/QR.',
          'success',
        );
        notificationService.success('Đơn hàng nhóm đã được thanh toán thành công!');
        navigate(`/pre-show/boarding/${updatedRoom.bookingUuid}`, { replace: true });
      } else if (updatedRoom.status === 'OPEN') {
        notificationService.info('Host đã hủy thanh toán — bạn có thể chỉnh sửa lại ghế và combo.');
        navigate(`/booking/orbit/${roomUuid}`, { replace: true });
      } else if (updatedRoom.status === 'CANCELLED') {
        notificationService.addNotification(
          'Phòng Orbit đã bị hủy',
          'Host đã hủy thanh toán. Bạn được chuyển về trang chủ. Vui lòng đặt vé lại.',
          'error',
        );
        notificationService.error('Host đã hủy thanh toán. Phòng Orbit bị đóng.');
        navigate('/', { replace: true });
      } else if (updatedRoom.status === 'EXPIRED') {
        notificationService.addNotification(
          'Phòng Orbit đã hết hạn',
          'Phiên đặt vé nhóm đã quá thời gian cho phép. Vui lòng thử lại.',
          'error',
        );
        notificationService.error('Phiên Orbit đã hết hạn. Vui lòng đặt vé lại.');
        navigate('/', { replace: true });
      }
    }
  });

  const myMemberInfo = useMemo(
    () => (room?.members || []).find((m) => sameUuid(m.userUuid, currentUserUuid)),
    [room?.members, currentUserUuid],
  );

  const handleEditSelection = async () => {
    setChanging(true);
    try {
      let existingCombos = [];
      try {
        existingCombos = JSON.parse(myMemberInfo?.combosJson || '[]');
      } catch {
        existingCombos = [];
      }
      await orbitService.updateMemberCombos(roomUuid, existingCombos, false);
      notificationService.success('Đã mở khóa chỉnh sửa ghế & bắp nước.');
      navigate(`/booking/orbit/${roomUuid}`);
    } catch (err) {
      console.error('Failed to revert completed status:', err);
      notificationService.error(err.message || 'Không thể mở khóa lúc này.');
    } finally {
      setChanging(false);
    }
  };

  const mySeats = myMemberInfo?.seatUuids || [];
  const myCombosJson = myMemberInfo?.combosJson || '[]';
  let myCombos = [];
  try {
    myCombos = JSON.parse(myCombosJson);
  } catch {
    myCombos = [];
  }

  const seatDetails = mySeats.map((uuid) => {
    const key = String(uuid).toLowerCase();
    const info = seatInfoMap.get(key);
    return {
      uuid,
      label: info?.label || String(uuid).slice(0, 8).toUpperCase(),
      price: info?.price || 0,
    };
  });
  const seatLabels = seatDetails.map((seat) => seat.label);
  const seatsSubtotal = seatDetails.reduce((sum, seat) => sum + seat.price, 0);

  const comboLines = myCombos.map((combo, idx) => {
    const meta = comboMetaMap.get(String(combo.comboUuid || '').toLowerCase());
    const name = meta?.name || combo.name || 'Combo';
    const unitPrice = meta?.price ?? (Number(combo.price) || 0);
    const quantity = Number(combo.quantity) || 0;
    return {
      key: combo.comboUuid || idx,
      name,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
  const combosSubtotal = comboLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const mySummaryTotal = seatsSubtotal + combosSubtotal;

  const showtimeDateLabel = formatShowtimeDate(room?.showtimeStartTime);
  const showtimeTimeLabel = formatShowtimeLabel(room?.showtimeStartTime);
  const isCheckoutWaiting = room?.status === 'CHECKOUT';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
          <p className="text-sm font-semibold text-zinc-400">Đang tải thông tin phòng chờ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pt-24 pb-12 flex flex-col items-center px-4 md:px-8 relative z-10">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-red-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 ring-1 ring-white/5 flex flex-col md:flex-row">
        <div className="w-full md:w-7/12 bg-[#0b0f19]/90 p-8 flex flex-col justify-between border-r border-white/5 text-left">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                <Ticket className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Phòng Chờ Orbit</h2>
                <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                  Phòng {String(roomUuid).slice(0, 8)}
                </p>
              </div>
            </div>

            {/* MOVIE / SHOWTIME / THEATER SUMMARY — mirrors the checkout header */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
              {room?.moviePoster ? (
                <img
                  src={room.moviePoster}
                  alt={room?.movieTitle || 'Poster'}
                  className="w-14 h-20 object-cover rounded-lg border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-14 h-20 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                  <Film className="w-5 h-5 text-zinc-500" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white leading-snug truncate">
                  {room?.movieTitle || 'Đang tải thông tin phim…'}
                </h3>
                {room?.theater && (
                  <p className="text-[11px] text-zinc-400 font-semibold mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{room.theater}</span>
                  </p>
                )}
                {(showtimeDateLabel || showtimeTimeLabel) && (
                  <p className="text-[11px] text-amber-400 font-bold mt-1 flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3 shrink-0" />
                    {[showtimeDateLabel, showtimeTimeLabel].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin shrink-0" />
              <div className="flex-grow">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Đang chờ Host thanh toán</h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Bạn đã hoàn tất chọn ghế và nước. Đơn hàng của bạn sẽ được Host trả toàn bộ. Giữ trang này mở để nhận vé tự động sau khi Host thanh toán xong (mã vé cũng gửi qua email).
                </p>
                <div className="mt-3">
                  <OrbitBookingTimers
                    roomStatus={room?.status}
                    expiresAt={room?.expiresAt}
                    lockTimeLeft={lockTimeLeft}
                    showLockTimer={!isCheckoutWaiting && lockTimeLeft !== null}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-l-2 border-red-500 pl-2">
                Lựa chọn của bạn
              </h3>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Armchair className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white block">Ghế ngồi đã chọn</span>
                    {seatsSubtotal > 0 && (
                      <span className="text-xs font-black text-red-400 shrink-0">{formatVnd(seatsSubtotal)}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                    Số lượng: {mySeats.length}
                  </span>
                  {seatLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {seatLabels.map((label, idx) => (
                        <span
                          key={`${label}-${idx}`}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/25 text-[11px] font-black text-red-400"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Coffee className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white block">Bắp nước đã chọn</span>
                    {combosSubtotal > 0 && (
                      <span className="text-xs font-black text-yellow-400 shrink-0">{formatVnd(combosSubtotal)}</span>
                    )}
                  </div>
                  {comboLines.length === 0 ? (
                    <span className="text-xs text-zinc-400 italic block mt-1">Không mua kèm bắp nước</span>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      {comboLines.map((line) => (
                        <div key={line.key} className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-yellow-400 truncate">
                            {line.quantity}x {line.name}
                          </span>
                          <span className="text-[11px] font-semibold text-zinc-400 shrink-0">
                            {formatVnd(line.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Tổng cộng của bạn</span>
                <span className="text-sm font-black text-emerald-400">{formatVnd(mySummaryTotal)}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={handleEditSelection}
              disabled={changing}
              className="w-full md:w-auto px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-wider text-zinc-300 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              {changing ? 'Đang mở khóa...' : 'Chỉnh sửa vé & combo'}
            </button>
          </div>
        </div>

        <div className="w-full md:w-5/12 bg-[#0b0f19]/40 p-6 flex flex-col justify-center">
          <OrbitChatBox roomUuid={roomUuid} />
        </div>
      </div>
    </div>
  );
};

export default OrbitWaitingPage;
