import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Search, Plus, Tv, Activity, Grid } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import AdminModal from '../components/AdminModal';
import CinemaFormPanel from '../components/panels/CinemaFormPanel';
import CinemaRoomFormPanel from '../components/panels/CinemaRoomFormPanel';

const CinemasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  const filteredCinemas = cinemas.filter(
    (c) =>
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))) &&
      (!statusFilter ||
        (statusFilter === 'ACTIVE'
          ? getCinemaStats(c.uuid).activeCount > 0
          : getCinemaStats(c.uuid).activeCount === 0))
  );

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

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kiến Trúc Rạp Chiếu</h1>
          <p className="text-xs text-gray-400 mt-1">
            Chọn chi nhánh rạp, sau đó chọn phòng chiếu để quản lý sơ đồ ghế.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddCinemaClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" />
            Thêm Rạp Mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-left">
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Chi Nhánh</span>
            <h3 className="text-2xl font-black text-white">{stats.totalCinemas}</h3>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <MapPin className="w-5 h-5 text-red-400" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Phòng</span>
            <h3 className="text-2xl font-black text-white">{stats.totalRooms}</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20">
            <Tv className="w-5 h-5 text-[#818cf8]" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Phòng Hoạt Động</span>
            <h3 className="text-2xl font-black text-emerald-400">{stats.activeRooms}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-[#0F1322] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-[#2C3B5E] transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Sức Chứa (Ghế)</span>
            <h3 className="text-2xl font-black text-amber-400">{stats.totalCapacity}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Grid className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="bg-[#0F1322] p-6 border border-[#1A2238] rounded-xl shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold uppercase text-white tracking-wide">Danh Sách Rạp Chiếu</h2>
            <p className="text-xs text-gray-500 mt-1">Chọn một chi nhánh để xem danh sách phòng chiếu bên dưới.</p>
          </div>
          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded shrink-0">
            HOẠT ĐỘNG: {cinemas.filter((c) => getCinemaStats(c.uuid).activeCount > 0).length}
          </span>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            className="w-full bg-[#0B0F19] border border-[#1A2238] text-xs py-2 pl-9 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all rounded-lg"
            placeholder="Tìm kiếm chi nhánh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoadingCinemas ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCinemas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCinemas.map((cinema) => {
              const isSelected = selectedCinema?.uuid === cinema.uuid;
              const cStats = getCinemaStats(cinema.uuid);
              const isBranchOpen = cStats.activeCount > 0;

              return (
                <div
                  key={cinema.uuid}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectCinema(cinema)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectCinema(cinema)}
                  className={`p-4 border transition-all cursor-pointer rounded-lg text-left w-full ${
                    isSelected
                      ? 'bg-[#1e293b]/30 border-red-500/50 shadow-md shadow-red-500/5'
                      : 'bg-[#0B0F19]/60 border-[#1A2238] hover:bg-[#1a2238]/30 hover:border-[#2C3B5E]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <h3 className="text-xs text-white uppercase font-black truncate">{cinema.name}</h3>
                    <span className={`flex items-center gap-1 text-[9px] uppercase font-bold shrink-0 ${isBranchOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isBranchOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      {isBranchOpen ? 'Đang Mở' : 'Bảo Trì'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 opacity-80 truncate" title={cinema.address}>
                    {cinema.address}
                  </p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#1A2238]/60 text-[9px] text-gray-500 font-mono">
                    <span>{cStats.totalRoomsCount} PHÒNG CHIẾU</span>
                    <span>{cStats.capacity} GHẾ</span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => handleEditCinemaClick(cinema, e)}
                      className="text-[10px] text-gray-500 hover:text-white uppercase font-bold bg-transparent border-none cursor-pointer"
                    >
                      Chỉnh sửa rạp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 border border-dashed border-[#1A2238] rounded-lg p-4 bg-[#0F1322]">
            <p className="text-xs uppercase tracking-wider">Không tìm thấy chi nhánh</p>
          </div>
        )}
      </div>

      {selectedCinema && (
        <div
          ref={roomsSectionRef}
          id="rooms-section"
          className="bg-[#0F1322] border border-[#1A2238] p-6 rounded-xl shadow-lg mb-6 scroll-mt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase text-white tracking-wide">Phòng Chiếu</h2>
              <p className="text-xs text-gray-500 mt-1">
                Chi nhánh: <span className="text-gray-300 font-semibold">{selectedCinema.name}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRoomClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 font-bold hover:bg-red-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm phòng
            </button>
          </div>

          {isLoadingRooms ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rooms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => (
                <button
                  key={room.uuid}
                  type="button"
                  onClick={() => handleSelectRoom(room)}
                  className="px-4 py-2 rounded-lg text-xs uppercase font-bold tracking-wider transition-all cursor-pointer border bg-[#0B0F19] border-[#1A2238] text-gray-400 hover:text-white hover:border-red-500/40 hover:bg-red-500/5"
                >
                  {room.name} ({room.roomType})
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-6 text-center border border-dashed border-[#1A2238] rounded-lg">
              Chưa có phòng chiếu. Nhấn &quot;Thêm phòng&quot; để tạo mới.
            </p>
          )}

          {rooms.length > 0 && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Chọn một phòng chiếu để mở trang quản lý sơ đồ ghế.
            </p>
          )}
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
    </>
  );
};

export default CinemasPage;
