import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Edit2, Loader2, MapPin, Plus, Tv, LayoutGrid } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  PrimaryButton,
  GhostButton,
} from '../components';

const AdminCinemaDetailPage = () => {
  const { cinemaUuid } = useParams();
  const navigate = useNavigate();
  const [cinema, setCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        notificationService.error('Khong the tai chi nhanh');
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
      <PageHeader title={cinema.name} description={`ID ${cinema.uuid}`} backTo="/admin/cinemas" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="w-full max-w-xs rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col items-center gap-3">
            <MapPin className="w-10 h-10 text-red-500" />
            <p className="text-sm text-gray-400 text-center">{cinema.address}</p>
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
              <GhostButton type="button" onClick={() => navigate(`/admin/cinemas/${cinemaUuid}/rooms/new`)}>
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
                        <p className="text-xs text-gray-500">{room.roomCode} · {room.roomType} · {room.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/admin/cinemas/${cinemaUuid}/rooms/${room.uuid}`}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/[0.05]"
                      >
                        So do ghe
                      </Link>
                      <GhostButton type="button" className="px-2 py-1 text-xs" onClick={() => navigate(`/admin/cinemas/${cinemaUuid}/rooms/${room.uuid}/edit`)}>
                        Sua
                      </GhostButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminCinemaDetailPage;
