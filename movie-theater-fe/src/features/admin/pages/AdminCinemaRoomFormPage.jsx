import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getEnabledRoomTypes } from '../../../shared/utils/systemConfig';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const ROOM_STATUSES = [
  { value: 'ACTIVE', label: 'Hoat dong' },
  { value: 'MAINTENANCE', label: 'Bao tri' },
  { value: 'DISABLED', label: 'Vo hieu' },
];

const AdminCinemaRoomFormPage = () => {
  const navigate = useNavigate();
  const { cinemaUuid, roomUuid } = useParams();
  const isEditing = Boolean(roomUuid);

  const [cinemaName, setCinemaName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roomTypes, setRoomTypes] = useState(() => getEnabledRoomTypes());
  const [form, setForm] = useState({
    roomCode: '',
    name: '',
    roomType: 'STANDARD',
    capacity: 120,
    status: 'ACTIVE',
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const cinema = await cinemaService.getCinemaDetail(cinemaUuid);
        if (!isMounted) return;
        setCinemaName(cinema.name || '');
        if (isEditing) {
          const rooms = await cinemaService.getRoomsByCinema(cinemaUuid);
          const room = (rooms || []).find((r) => r.uuid === roomUuid);
          if (!room) {
            notificationService.error('Khong tim thay phong chieu');
            navigate(`/admin/cinemas/${cinemaUuid}`);
            return;
          }
          setForm({
            roomCode: room.roomCode || '',
            name: room.name || '',
            roomType: room.roomType || 'STANDARD',
            capacity: room.capacity || 0,
            status: room.status || 'ACTIVE',
          });
        }
      } catch (err) {
        notificationService.error('Khong the tai du lieu');
        navigate(`/admin/cinemas/${cinemaUuid}`);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    systemConfigService.getConfig()
      .then((cfg) => setRoomTypes(getEnabledRoomTypes(cfg)))
      .catch(() => {});
    return () => { isMounted = false; };
  }, [cinemaUuid, roomUuid, isEditing, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEditing) {
        await cinemaService.updateRoom(roomUuid, form);
        notificationService.success('Cap nhat phong thanh cong');
        navigate(`/admin/cinemas/${cinemaUuid}/rooms/${roomUuid}`);
      } else {
        await cinemaService.createRoom(cinemaUuid, form);
        notificationService.success('Tao phong thanh cong');
        navigate(`/admin/cinemas?cinema=${cinemaUuid}`);
      }
    } catch (err) {
      notificationService.error(err.message || 'Luu that bai');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dang tai...
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title={isEditing ? 'Chinh sua phong chieu' : 'Them phong chieu moi'}
        description={cinemaName}
        backTo={isEditing ? `/admin/cinemas/${cinemaUuid}/rooms/${roomUuid}` : `/admin/cinemas?cinema=${cinemaUuid}`}
      />
      <form onSubmit={handleSubmit}>
        <Section title="Thong tin phong">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className={labelClass}>Ma phong *</label>
              <input className={inputClass} value={form.roomCode} onChange={(e) => setForm((p) => ({ ...p, roomCode: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Ten phong *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Kieu phong *</label>
              <select className={`${inputClass} cursor-pointer`} value={form.roomType} onChange={(e) => setForm((p) => ({ ...p, roomType: e.target.value }))}>
                {roomTypes.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: '#0F1322' }}>
                    {t.label || t.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Trang thai *</label>
              <select className={`${inputClass} cursor-pointer`} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {ROOM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value} style={{ background: '#0F1322' }}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>
        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <GhostButton type="button" onClick={() => navigate(isEditing ? `/admin/cinemas/${cinemaUuid}/rooms/${roomUuid}` : `/admin/cinemas?cinema=${cinemaUuid}`)}>Huy</GhostButton>
          <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>{isEditing ? 'Cap nhat' : 'Tao phong'}</PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminCinemaRoomFormPage;
