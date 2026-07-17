import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Search, Plus, Tv, Activity, Grid, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, AdminKpiGrid, StatusBadge, PrimaryButton } from '../components';
import AdminModal from '../components/AdminModal';
import CinemaFormPanel from '../components/panels/CinemaFormPanel';
import CinemaRoomFormPanel from '../components/panels/CinemaRoomFormPanel';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './CinemasPage.css';

const cinemaStatusVariant = (status) => {
  switch (status) {
    case 'MAINTENANCE': return 'warning';
    case 'DISABLED': return 'danger';
    case 'ACTIVE':
    default: return 'success';
  }
};

const cinemaStatusLabel = (status) => {
  switch (status) {
    case 'MAINTENANCE': return 'Bảo trì';
    case 'DISABLED': return 'Vô hiệu';
    case 'ACTIVE':
    default: return 'Đang mở';
  }
};

const CinemasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();

  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, _setStatusFilter] = useState('');
  const [cinemaModal, setCinemaModal] = useState({ open: false, mode: 'create', cinema: null });
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const roomsSectionRef = useRef(null);

  const fetchCinemasAndGlobalStats = async (keepSelection = true) => {
    setIsLoadingCinemas(true);
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      const list = data.content || data;
      setCinemas(list);

      if (list.length > 0) {
        if (keepSelection && selectedCinema) {
          const updatedSelected = list.find((c) => c.uuid === selectedCinema.uuid);
          if (updatedSelected) setSelectedCinema(updatedSelected);
        }

        const roomsPromises = list.map((c) => cinemaService.getRoomsByCinema(c.uuid));
        const roomsResults = await Promise.all(roomsPromises);
        setAllRooms(roomsResults.flat());
      }
    } catch (error) {
      console.error('Failed to fetch cinemas or global stats:', error);
      notificationService.error('Không thể tải danh sách rạp chiếu.');
    } finally {
      setIsLoadingCinemas(false);
    }
  };

  const fetchRooms = async (cinemaUuid) => {
    setIsLoadingRooms(true);
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      notificationService.error('Không thể tải danh sách phòng chiếu.');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchCinemasAndGlobalStats();
  }, []);

  useEffect(() => {
    const cinemaParam = searchParams.get('cinema');
    if (!cinemaParam || cinemas.length === 0) return;
    const match = cinemas.find((c) => c.uuid === cinemaParam);
    if (match) {
      setSelectedCinema(match);
      requestAnimationFrame(() => {
        roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams, cinemas]);

  useEffect(() => {
    if (selectedCinema) {
      fetchRooms(selectedCinema.uuid);
    } else {
      setRooms([]);
    }
  }, [selectedCinema]);

  const stats = useMemo(() => {
    const totalCinemas = cinemas.length;
    const totalRooms = allRooms.length;
    const activeRooms = allRooms.filter((r) => r.status === 'ACTIVE').length;
    const maintenanceRooms = allRooms.filter((r) => r.status === 'MAINTENANCE').length;
    const totalCapacity = allRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    return { totalCinemas, totalRooms, activeRooms, maintenanceRooms, totalCapacity };
  }, [cinemas, allRooms]);

  const getCinemaStats = (cinemaUuid) => {
    const cinemaRooms = allRooms.filter((r) => r.cinemaUuid === cinemaUuid);
    const capacity = cinemaRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const activeCount = cinemaRooms.filter((r) => r.status === 'ACTIVE').length;
    return {
      capacity,
      activeCount,
      totalRoomsCount: cinemaRooms.length,
    };
  };

  const cinemaKpis = useMemo(
    () => [
      {
        label: 'Tổng số chi nhánh',
        value: stats.totalCinemas,
        badge: 'đã đăng ký',
        icon: MapPin,
        color: 'text-pink-400',
        kpiClass: 'kpi-total',
      },
      {
        label: 'Tổng số phòng',
        value: stats.totalRooms,
        badge: 'trên toàn hệ thống',
        icon: Tv,
        color: 'text-indigo-400',
        kpiClass: 'kpi-showing',
      },
      {
        label: 'Phòng hoạt động',
        value: stats.activeRooms,
        badge: 'đang mở bán',
        icon: Activity,
        color: 'text-emerald-400',
        kpiClass: 'kpi-upcoming',
      },
      {
        label: 'Tổng sức chứa',
        value: stats.totalCapacity.toLocaleString('vi-VN'),
        badge: 'ghế ngồi',
        icon: Grid,
        color: 'text-slate-400',
        kpiClass: 'kpi-hidden',
      },
    ],
    [stats],
  );

  const filteredCinemas = cinemas.filter(
    (c) =>
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (!statusFilter || c.status === statusFilter)
  );

  const handleDeleteCinemaClick = async (cinema, e) => {
    e.stopPropagation();
    const confirmDelete = await confirm({
      title: 'Xóa chi nhánh rạp',
      message: `Bạn có chắc chắn muốn xóa rạp "${cinema.name}"? Hành động này sẽ xóa toàn bộ phòng chiếu và sơ đồ ghế liên quan, và không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!confirmDelete) return;

    try {
      await cinemaService.deleteCinema(cinema.uuid);
      notificationService.success('Xóa rạp chiếu thành công');
      if (selectedCinema?.uuid === cinema.uuid) {
        setSelectedCinema(null);
      }
      await fetchCinemasAndGlobalStats(false);
    } catch (err) {
      notificationService.error(err.message || 'Không thể xóa rạp chiếu');
    }
  };

  const handleAddCinemaClick = () => {
    setCinemaModal({ open: true, mode: 'create', cinema: null });
  };

  const handleEditCinemaClick = (cinema, e) => {
    e.stopPropagation();
    setCinemaModal({ open: true, mode: 'edit', cinema });
  };

  const closeCinemaModal = () => setCinemaModal({ open: false, mode: 'create', cinema: null });

  const handleCinemaSaved = async (savedCinema) => {
    closeCinemaModal();
    await fetchCinemasAndGlobalStats(true);
    if (savedCinema?.uuid && cinemaModal.mode === 'create') {
      setSelectedCinema(savedCinema);
      requestAnimationFrame(() => {
        roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleAddRoomClick = () => {
    if (!selectedCinema) return;
    setRoomModalOpen(true);
  };

  const handleRoomSaved = async () => {
    setRoomModalOpen(false);
    if (selectedCinema) {
      await fetchRooms(selectedCinema.uuid);
      await fetchCinemasAndGlobalStats(true);
    }
  };

  const handleSelectCinema = (cinema) => {
    setSelectedCinema(cinema);
    requestAnimationFrame(() => {
      roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSelectRoom = (room) => {
    if (!selectedCinema) return;
    navigate(`/admin/cinemas/${selectedCinema.uuid}/rooms/${room.uuid}`);
  };

  const handleDeleteRoom = async (room, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Xóa phòng chiếu',
      message: `Xóa phòng "${room.name}"? Hành động này không thể hoàn tác.`,
      detail: 'Chỉ xóa được khi phòng không còn suất chiếu tương lai và không có vé đã xác nhận.',
      confirmLabel: 'Xóa phòng',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await cinemaService.deleteRoom(room.uuid);
      notificationService.success('Đã xóa phòng chiếu.');
      if (selectedCinema) {
        await fetchRooms(selectedCinema.uuid);
        await fetchCinemasAndGlobalStats(true);
      }
    } catch (err) {
      notificationService.error(err.message || 'Không thể xóa phòng chiếu.');
    }
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Cơ sở vật chất"
        title="Kiến trúc rạp chiếu"
        description="Chọn chi nhánh rạp, sau đó chọn phòng chiếu để quản lý sơ đồ ghế."
        variant="display"
        primaryAction={{
          label: 'Thêm rạp mới',
          onClick: handleAddCinemaClick,
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <AdminKpiGrid items={cinemaKpis} />

      <div className="adm-panel">
        <div className="adm-panel__head">
          <div>
            <h2 className="adm-panel__title">Danh sách rạp chiếu</h2>
            <p className="text-xs text-[var(--adm-text-dim)] mt-1">Chọn một chi nhánh để xem danh sách phòng chiếu bên dưới.</p>
          </div>
          <StatusBadge variant="accent">
            Hoạt động: {cinemas.filter((c) => getCinemaStats(c.uuid).activeCount > 0).length}
          </StatusBadge>
        </div>
        <div className="adm-panel__body">
        <div className="adm-toolbar__search mb-4 max-w-md">
          <Search className="adm-toolbar__search-icon" />
          <input
            className="adm-input"
            placeholder="Tìm kiếm chi nhánh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoadingCinemas ? (
          <div className="adm-loading min-h-[160px]">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCinemas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCinemas.map((cinema) => {
              const isSelected = selectedCinema?.uuid === cinema.uuid;
              const cStats = getCinemaStats(cinema.uuid);

              return (
                <div
                  key={cinema.uuid}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectCinema(cinema)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectCinema(cinema)}
                  className={`p-4 border transition-all cursor-pointer rounded-[var(--adm-radius-sm)] text-left w-full cinema-card ${
                    isSelected
                      ? 'bg-[var(--adm-accent-soft)] border-[var(--adm-accent-border)] cinema-card--selected'
                      : 'bg-[var(--adm-bg-panel-solid)] border-[var(--adm-border)] hover:border-[#2C3B5E]'
                  }`}
                >
                  {cinema.imageUrl && (
                    <div className="-m-4 mb-3 h-24 overflow-hidden rounded-t-[var(--adm-radius-sm)]">
                      <img
                        src={cinema.imageUrl}
                        alt={cinema.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <h3 className="text-xs text-white font-black truncate">{cinema.name}</h3>
                    <StatusBadge variant={cinemaStatusVariant(cinema.status)}>
                      {cinemaStatusLabel(cinema.status)}
                    </StatusBadge>
                  </div>
                  <p className="text-[11px] text-[var(--adm-text-muted)] truncate" title={cinema.address}>
                    {cinema.address}
                  </p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--adm-border)] text-[9px] text-[var(--adm-text-dim)] font-mono">
                    <span>{cStats.totalRoomsCount} phòng chiếu</span>
                    <span>{cStats.capacity} ghế</span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[var(--adm-border)] flex justify-between items-center">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCinemaClick(cinema, e)}
                      className="text-[10px] text-red-500 hover:text-red-400 uppercase font-bold bg-transparent border-none cursor-pointer p-0"
                    >
                      Xóa rạp
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleEditCinemaClick(cinema, e)}
                      className="text-[10px] text-[var(--adm-text-dim)] hover:text-white uppercase font-bold bg-transparent border-none cursor-pointer p-0"
                    >
                      Chỉnh sửa rạp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="adm-empty border border-dashed border-[var(--adm-border)] rounded-[var(--adm-radius-sm)]">
            <p>Không tìm thấy chi nhánh</p>
          </div>
        )}
        </div>
      </div>

      {selectedCinema && (
        <div
          ref={roomsSectionRef}
          id="rooms-section"
          className="adm-panel scroll-mt-6"
        >
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-panel__title">Phòng chiếu</h2>
              <p className="text-xs text-[var(--adm-text-dim)] mt-1">
                Chi nhánh: <span className="text-[var(--adm-text-secondary)] font-semibold">{selectedCinema.name}</span>
              </p>
            </div>
            <PrimaryButton type="button" onClick={handleAddRoomClick}>
              <Plus className="w-3.5 h-3.5" />
              Thêm phòng
            </PrimaryButton>
          </div>
          <div className="adm-panel__body">

          {isLoadingRooms ? (
            <div className="adm-loading min-h-[80px]">
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rooms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <div key={room.uuid} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectRoom(room)}
                    className="adm-btn adm-btn--ghost px-4 py-2 text-xs uppercase"
                  >
                    {room.name} ({room.roomType})
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRoom(room, e)}
                    className="adm-btn adm-btn--ghost p-2"
                    title="Xóa phòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-empty border border-dashed border-[var(--adm-border)] rounded-[var(--adm-radius-sm)]">
              Chưa có phòng chiếu. Nhấn &quot;Thêm phòng&quot; để tạo mới.
            </p>
          )}

          {rooms.length > 0 && (
            <p className="text-xs text-[var(--adm-text-dim)] mt-4 text-center">
              Chọn một phòng chiếu để mở trang quản lý sơ đồ ghế.
            </p>
          )}
          </div>
        </div>
      )}

      <AdminModal
        open={cinemaModal.open}
        onClose={closeCinemaModal}
        title={cinemaModal.mode === 'edit' ? 'Chỉnh sửa chi nhánh' : 'Thêm rạp mới'}
        subtitle={cinemaModal.mode === 'edit' ? cinemaModal.cinema?.name : 'Thông tin chi nhánh rạp chiếu'}
        size="md"
      >
        <CinemaFormPanel
          cinema={cinemaModal.mode === 'edit' ? cinemaModal.cinema : null}
          onSuccess={handleCinemaSaved}
          onCancel={closeCinemaModal}
        />
      </AdminModal>

      <AdminModal
        open={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title="Thêm phòng chiếu mới"
        subtitle={selectedCinema?.name}
        size="lg"
      >
        {selectedCinema && (
          <CinemaRoomFormPanel
            cinemaUuid={selectedCinema.uuid}
            cinemaName={selectedCinema.name}
            onSuccess={handleRoomSaved}
            onCancel={() => setRoomModalOpen(false)}
          />
        )}
      </AdminModal>
    </AdminPage>
  );
};

export default CinemasPage;
