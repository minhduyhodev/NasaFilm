import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Edit2, Loader2, MapPin, Plus, Tv, LayoutGrid, Trash2 } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from '../components';
import AdminModal from '../components/AdminModal';
import CinemaRoomFormPanel from '../components/panels/CinemaRoomFormPanel';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const AdminCinemaDetailPage = () => {
  const { cinemaUuid } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [cinema, setCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomModal, setRoomModal] = useState({ open: false, room: null });

  const closeRoomModal = () => setRoomModal({ open: false, room: null });

  const openCreateRoomModal = () => setRoomModal({ open: true, room: null });

  const openEditRoomModal = (room) => setRoomModal({ open: true, room });

  const handleRoomSaved = async () => {
    closeRoomModal();
    try {
      const roomList = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(roomList || []);
    } catch {
      notificationService.error('Không thể tải lại danh sách phòng');
    }
  };

  const handleDeleteRoom = async (room) => {
    const ok = await confirm({
      title: 'Xóa phòng chiếu',
      message: `Xóa phòng "${room.name}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa phòng',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await cinemaService.deleteRoom(room.uuid);
      notificationService.success('Đã xóa phòng chiếu.');
      setRooms((prev) => prev.filter((r) => r.uuid !== room.uuid));
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xóa phòng chiếu.');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [detail, roomList] = await Promise.all([
          cinemaService.getCinemaDetail(cinemaUuid),
          cinemaService.getRoomsByCinema(cinemaUuid),
        ]);
        if (!isMounted) return;
        setCinema(detail);
        setRooms(roomList || []);
      } catch (err) {
        notificationService.error('Không thể tải chi nhánh');
        navigate('/admin/cinemas');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [cinemaUuid, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dang tai...
      </div>
    );
  }

  if (!cinema) return null;

  return (
    <AdminPage>
      <PageHeader title={cinema.name} description={cinema.address} backTo="/admin/cinemas" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="w-full max-w-xs rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col items-center gap-3">
            <MapPin className="w-10 h-10 text-red-500" />
            <p className="text-sm text-gray-400 text-center">{cinema.address}</p>
            {cinema.entranceNote && (
              <p className="text-xs text-amber-300/90 text-center">{cinema.entranceNote}</p>
            )}
            <p className="text-xs text-gray-500">{cinema.phoneNumber}</p>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2">
            <PrimaryButton type="button" className="w-full justify-center py-2.5" onClick={() => navigate(`/admin/cinemas/${cinemaUuid}/edit`)}>
              <Edit2 className="w-3.5 h-3.5" />
              Chinh sua chi nhanh
            </PrimaryButton>
            <GhostButton type="button" className="w-full justify-center py-2.5" onClick={() => navigate(`/admin/cinemas?cinema=${cinemaUuid}`)}>
              <LayoutGrid className="w-3.5 h-3.5" />
              Quan ly so do ghe
            </GhostButton>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Section title="Thong tin co ban">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow label="Ten" value={cinema.name} />
              <MetadataRow label="Dien thoai" value={cinema.phoneNumber || '—'} />
              <MetadataRow label="Dia chi" value={cinema.address || '—'} className="md:col-span-2" />
            </dl>
          </Section>

          <Section
            title="Phong chieu"
            description={`${rooms.length} phong`}
            action={
              <GhostButton type="button" onClick={openCreateRoomModal}>
                <Plus className="w-3.5 h-3.5" />
                Them phong
              </GhostButton>
            }
            divided
          >
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-500">Chua co phong chieu.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {rooms.map((room) => (
                  <li key={room.uuid} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <Tv className="w-4 h-4 text-gray-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{room.name}</p>
                        <p className="text-xs text-gray-500">
                          {room.roomCode} · {room.roomType} ·{' '}
                          <StatusBadge variant={room.status === 'ACTIVE' ? 'success' : 'warning'}>
                            {room.status === 'ACTIVE' ? 'Đang mở' : room.status}
                          </StatusBadge>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/admin/cinemas/${cinemaUuid}/rooms/${room.uuid}`}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/[0.05]"
                      >
                        So do ghe
                      </Link>
                      <GhostButton type="button" className="px-2 py-1 text-xs" onClick={() => openEditRoomModal(room)}>
                        Sua
                      </GhostButton>
                      <GhostButton type="button" className="px-2 py-1 text-xs text-rose-400 hover:text-rose-300" onClick={() => handleDeleteRoom(room)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </GhostButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <AdminModal
        open={roomModal.open}
        onClose={closeRoomModal}
        title={roomModal.room ? 'Chỉnh sửa phòng chiếu' : 'Thêm phòng chiếu mới'}
        subtitle={cinema.name}
        size="lg"
      >
        <CinemaRoomFormPanel
          cinemaUuid={cinemaUuid}
          cinemaName={cinema.name}
          room={roomModal.room}
          onSuccess={handleRoomSaved}
          onCancel={closeRoomModal}
        />
      </AdminModal>
    </AdminPage>
  );
};

export default AdminCinemaDetailPage;
