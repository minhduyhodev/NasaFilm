import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Armchair, Ticket, Coffee } from 'lucide-react';
import { orbitService } from '../../../shared/services/orbitService';
import { bookingService } from '../../../shared/services/bookingService';
import { comboService } from '../../../shared/services/comboService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { notificationService } from '../../../shared/services/notificationService';
import { sameUuid } from '../../../shared/utils/orbitUtils';
import OrbitChatBox from '../components/OrbitChatBox';

const buildSeatLabelMap = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    (row.seats || []).forEach((seat) => {
      if (!seat?.seatUuid) return;
      const label = `${seat.rowName || row.rowName || ''}${seat.seatNumber ?? ''}`.trim();
      if (label) map.set(String(seat.seatUuid).toLowerCase(), label);
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
  const [seatLabelMap, setSeatLabelMap] = useState(() => new Map());
  const [comboNameMap, setComboNameMap] = useState(() => new Map());

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
        setSeatLabelMap(buildSeatLabelMap(mapData?.rows || []));
        const names = new Map();
        (combos || []).forEach((combo) => {
          if (combo?.uuid) names.set(String(combo.uuid).toLowerCase(), combo.name || 'Combo');
        });
        setComboNameMap(names);
      } catch (err) {
        console.error('Failed to resolve seat/combo labels:', err);
      }
    };
    loadLabels();
    return () => {
      active = false;
    };
  }, [room?.showtimeUuid, room?.members, currentUserUuid]);

  useRealtimeTopic(REALTIME_TOPICS.orbitRoom(roomUuid), (updatedRoom) => {
    if (updatedRoom) {
      setRoom(updatedRoom);

      if (updatedRoom.status === 'CLOSED' && updatedRoom.bookingUuid) {
        notificationService.addNotification(
          'Đặt vé Orbit thành công',
          'Host đã thanh toán xong. Vé của bạn đã sẵn sàng — kiểm tra email để lấy mã vé/QR.',
          'success',
        );
        notificationService.success('Đơn hàng nhóm đã được thanh toán thành công!');
        navigate(`/pre-show/boarding/${updatedRoom.bookingUuid}`, { replace: true });
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

  const handleEditSelection = async () => {
    setChanging(true);
    try {
      await orbitService.updateMemberCombos(roomUuid, [], false);
      notificationService.success('Đã mở khóa chỉnh sửa ghế & bắp nước.');
      navigate(`/booking/orbit/${roomUuid}`);
    } catch (err) {
      console.error('Failed to revert completed status:', err);
      notificationService.error(err.message || 'Không thể mở khóa lúc này.');
    } finally {
      setChanging(false);
    }
  };

  const myMemberInfo = useMemo(
    () => (room?.members || []).find((m) => sameUuid(m.userUuid, currentUserUuid)),
    [room?.members, currentUserUuid],
  );
  const mySeats = myMemberInfo?.seatUuids || [];
  const myCombosJson = myMemberInfo?.combosJson || '[]';
  let myCombos = [];
  try {
    myCombos = JSON.parse(myCombosJson);
  } catch {
    myCombos = [];
  }

  const seatLabels = mySeats.map((uuid) => {
    const key = String(uuid).toLowerCase();
    return seatLabelMap.get(key) || String(uuid).slice(0, 8);
  });

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
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <Ticket className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Phòng Chờ Orbit</h2>
                <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                  {room?.movieTitle ? room.movieTitle : `Phòng ${String(roomUuid).slice(0, 8)}`}
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Đang chờ Host thanh toán</h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Bạn đã hoàn tất chọn ghế và nước. Đơn hàng của bạn sẽ được Host trả toàn bộ. Giữ trang này mở để nhận vé tự động sau khi Host thanh toán xong (mã vé cũng gửi qua email).
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-l-2 border-red-500 pl-2">
                Lựa chọn của bạn
              </h3>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Armchair className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">Ghế ngồi đã chọn</span>
                  <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                    Số lượng: {mySeats.length}
                  </span>
                  {seatLabels.length > 0 && (
                    <span className="text-xs font-black text-red-400 block mt-1">
                      {seatLabels.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Coffee className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="flex-grow">
                  <span className="text-xs font-bold text-white block">Bắp nước đã chọn</span>
                  {myCombos.length === 0 ? (
                    <span className="text-xs text-zinc-400 italic block mt-1">Không mua kèm bắp nước</span>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {myCombos.map((combo, idx) => {
                        const name =
                          comboNameMap.get(String(combo.comboUuid || '').toLowerCase())
                          || combo.name
                          || 'Combo';
                        return (
                          <span key={idx} className="text-xs font-black text-yellow-400 block">
                            {combo.quantity}x {name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
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
