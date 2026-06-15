import React, { useState, useEffect } from 'react';
import { MapPin, Search, Edit2, Plus, X, Tv, Activity, Grid, Phone, Layers, Armchair, Hammer, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import './CinemasPage.css';

const CinemasPage = () => {
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]); // All rooms in system for global KPIs
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedRoomSeats, setSelectedRoomSeats] = useState([]);
  
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCinemaModalOpen, setIsCinemaModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [cinemaFormData, setCinemaFormData] = useState({ name: '', address: '', phoneNumber: '' });

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({ roomCode: '', name: '', roomType: 'STANDARD', capacity: 0, status: 'ACTIVE' });

  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [seatFormData, setSeatFormData] = useState({ rowCount: 8, seatsPerRow: 12 });
  const [targetRoomUuid, setTargetRoomUuid] = useState(null);

  const fetchCinemasAndGlobalStats = async () => {
    setIsLoadingCinemas(true);
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      const list = data.content || data;
      setCinemas(list);
      
      if (list.length > 0) {
        // Find if we should keep or select first cinema
        if (!selectedCinema) {
          setSelectedCinema(list[0]);
        }
        
        // Fetch all rooms globally to compute KPIs
        const roomsPromises = list.map(c => cinemaService.getRoomsByCinema(c.uuid));
        const roomsResults = await Promise.all(roomsPromises);
        const flatRooms = roomsResults.flat();
        setAllRooms(flatRooms);
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
      setRooms(data);
      // Automatically select the first room
      if (data.length > 0) {
        setSelectedRoom(data[0]);
      } else {
        setSelectedRoom(null);
        setSelectedRoomSeats([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      notificationService.error('Không thể tải danh sách phòng chiếu.');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchSeats = async (roomUuid) => {
    setIsLoadingSeats(true);
    try {
      const data = await cinemaService.getSeatsByRoom(roomUuid);
      setSelectedRoomSeats(data || []);
    } catch (error) {
      console.error('Failed to load seats for preview:', error);
      setSelectedRoomSeats([]);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchCinemasAndGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedCinema) {
      fetchRooms(selectedCinema.uuid);
    } else {
      setRooms([]);
      setSelectedRoom(null);
      setSelectedRoomSeats([]);
    }
  }, [selectedCinema]);

  useEffect(() => {
    if (selectedRoom) {
      fetchSeats(selectedRoom.uuid);
    } else {
      setSelectedRoomSeats([]);
    }
  }, [selectedRoom]);

  // Global KPI calculations
  const stats = React.useMemo(() => {
    const totalCinemas = cinemas.length;
    const totalRooms = allRooms.length;
    const activeRooms = allRooms.filter(r => r.status === 'ACTIVE').length;
    const maintenanceRooms = allRooms.filter(r => r.status === 'MAINTENANCE').length;
    const totalCapacity = allRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    return {
      totalCinemas,
      totalRooms,
      activeRooms,
      maintenanceRooms,
      totalCapacity
    };
  }, [cinemas, allRooms]);

  // Individual Cinema stats
  const getCinemaStats = (cinemaUuid) => {
    const cinemaRooms = allRooms.filter(r => r.cinemaUuid === cinemaUuid);
    const capacity = cinemaRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const activeCount = cinemaRooms.filter(r => r.status === 'ACTIVE').length;
    return {
      capacity,
      activeCount,
      totalRoomsCount: cinemaRooms.length
    };
  };

  // Cinema handlers
  const handleAddCinemaClick = () => {
    setEditingCinema(null);
    setCinemaFormData({ name: '', address: '', phoneNumber: '' });
    setIsCinemaModalOpen(true);
  };

  const handleEditCinemaClick = (cinema, e) => {
    e.stopPropagation();
    setEditingCinema(cinema);
    setCinemaFormData({
      name: cinema.name,
      address: cinema.address || '',
      phoneNumber: cinema.phoneNumber || '',
    });
    setIsCinemaModalOpen(true);
  };

  const handleCinemaSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCinema) {
        await cinemaService.updateCinema(editingCinema.uuid, cinemaFormData);
        notificationService.success(`Cập nhật thành công rạp "${cinemaFormData.name}"`);
      } else {
        await cinemaService.createCinema(cinemaFormData);
        notificationService.success(`Thêm mới thành công rạp "${cinemaFormData.name}"`);
      }
      setIsCinemaModalOpen(false);
      fetchCinemasAndGlobalStats();
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi lưu rạp chiếu');
    }
  };

  // Room handlers
  const handleAddRoomClick = () => {
    if (!selectedCinema) return;
    setEditingRoom(null);
    setRoomFormData({ roomCode: '', name: '', roomType: 'STANDARD', capacity: 0, status: 'ACTIVE' });
    setIsRoomModalOpen(true);
  };

  const handleEditRoomClick = (room, e) => {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomFormData({
      roomCode: room.roomCode || '',
      name: room.name,
      roomType: room.roomType || 'STANDARD',
      capacity: room.capacity || 0,
      status: room.status || 'ACTIVE',
    });
    setIsRoomModalOpen(true);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await cinemaService.updateRoom(editingRoom.uuid, roomFormData);
        notificationService.success(`Cập nhật thành công phòng "${roomFormData.name}"`);
      } else {
        await cinemaService.createRoom(selectedCinema.uuid, roomFormData);
        notificationService.success(`Thêm mới thành công phòng "${roomFormData.name}"`);
      }
      setIsRoomModalOpen(false);
      fetchCinemasAndGlobalStats();
      if (selectedCinema) {
        fetchRooms(selectedCinema.uuid);
      }
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi lưu phòng chiếu');
    }
  };

  // Seat config handlers
  const handleConfigureSeatsClick = (roomUuid, e) => {
    e.stopPropagation();
    setTargetRoomUuid(roomUuid);
    setSeatFormData({ rowCount: 8, seatsPerRow: 12 });
    setIsSeatModalOpen(true);
  };

  const handleSeatSubmit = async (e) => {
    e.preventDefault();
    try {
      await cinemaService.generateSeats(targetRoomUuid, seatFormData.rowCount, seatFormData.seatsPerRow);
      setIsSeatModalOpen(false);
      notificationService.success('Đã cấu hình sơ đồ ghế thành công!');
      fetchCinemasAndGlobalStats();
      if (selectedCinema) {
        fetchRooms(selectedCinema.uuid);
      }
    } catch (error) {
      notificationService.error(error.message || 'Lỗi khi sinh sơ đồ ghế');
    }
  };

  // Room Type Styling Config
  const getRoomTypeConfig = (type) => {
    const t = type?.toUpperCase() || 'STANDARD';
    switch (t) {
      case 'IMAX':
        return {
          label: 'IMAX',
          className: 'bg-blue-600/10 border border-blue-600/30 text-blue-400 font-extrabold shadow-[0_0_10px_rgba(37,99,235,0.1)] px-2.5 py-0.5 rounded text-[10px]'
        };
      case 'VIP':
        return {
          label: 'VIP',
          className: 'bg-amber-600/10 border border-amber-600/30 text-amber-400 font-extrabold shadow-[0_0_10px_rgba(217,119,6,0.1)] px-2.5 py-0.5 rounded text-[10px]'
        };
      case 'DOLBY_ATMOS':
        return {
          label: 'Dolby Atmos',
          className: 'bg-purple-600/10 border border-purple-600/30 text-purple-400 font-extrabold shadow-[0_0_10px_rgba(147,51,234,0.1)] px-2.5 py-0.5 rounded text-[10px]'
        };
      case 'FOUR_DX':
        return {
          label: '4DX',
          className: 'bg-pink-600/10 border border-pink-600/30 text-pink-400 font-extrabold shadow-[0_0_10px_rgba(219,39,119,0.1)] px-2.5 py-0.5 rounded text-[10px]'
        };
      default:
        return {
          label: t,
          className: 'bg-zinc-600/10 border border-zinc-600/30 text-zinc-400 font-bold px-2.5 py-0.5 rounded text-[10px]'
        };
    }
  };

  // Organise seats into rows for drawing preview grid
  const seatsByRow = React.useMemo(() => {
    const rows = {};
    selectedRoomSeats.forEach(seat => {
      const r = seat.rowName || 'A';
      if (!rows[r]) {
        rows[r] = [];
      }
      rows[r].push(seat);
    });
    // Sort seats in each row by seatNumber
    Object.keys(rows).forEach(r => {
      rows[r].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
    });
    // Sort rows alphabetically
    return Object.keys(rows).sort().reduce((acc, key) => {
      acc[key] = rows[key];
      return acc;
    }, {});
  }, [selectedRoomSeats]);

  const filteredCinemas = cinemas.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Quản lý Chi Nhánh & Phòng Chiếu</h1>
          <p className="text-xs text-gray-400 mt-1">
            Thiết lập cơ sở hạ tầng, quản lý danh sách phòng và sơ đồ ghế ngồi của các phòng chiếu thuộc hệ thống NASA Cinema.
          </p>
        </div>
        <button 
          onClick={handleAddCinemaClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold transition shadow-md cursor-pointer shrink-0"
        >
          <Plus size={16} /> Thêm Rạp Chiếu Mới
        </button>
      </div>

      {/* Infrastructure KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 text-left">
        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Rạp Chiếu</span>
            <h3 className="text-2xl font-black text-white">{stats.totalCinemas}</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-red-500">
            <MapPin className="w-5 h-5 text-red-500" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Số Phòng</span>
            <h3 className="text-2xl font-black text-blue-400">{stats.totalRooms}</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-blue-500">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Phòng Hoạt Động</span>
            <h3 className="text-2xl font-black text-emerald-400">{stats.activeRooms}</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-emerald-500">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Phòng Đang Bảo Trì</span>
            <h3 className="text-2xl font-black text-amber-400">{stats.maintenanceRooms}</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-amber-500">
            <Hammer className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng Sức Chứa Ghế</span>
            <h3 className="text-2xl font-black text-purple-400 font-mono">{stats.totalCapacity.toLocaleString('vi-VN')}</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-purple-500">
            <Armchair className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left items-start">
        {/* Left column: Cinema Cards list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] p-4 shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Danh sách chi nhánh</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Tìm kiếm rạp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
              {isLoadingCinemas ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                </div>
              ) : filteredCinemas.length > 0 ? (
                filteredCinemas.map((cinema) => {
                  const cStats = getCinemaStats(cinema.uuid);
                  const isSelected = selectedCinema?.uuid === cinema.uuid;
                  return (
                    <div
                      key={cinema.uuid}
                      onClick={() => setSelectedCinema(cinema)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                          : 'bg-[#0F1322]/40 border-[#1A2238] hover:bg-white/[0.02] hover:border-gray-700'
                      }`}
                    >
                      {/* Title & Edit */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-black text-white leading-tight uppercase group-hover:text-red-400 transition-colors">
                          {cinema.name}
                        </h3>
                        <button
                          onClick={(e) => handleEditCinemaClick(cinema, e)}
                          className="p-1.5 rounded-lg bg-[#151C30] border border-[#1A2238] text-gray-400 hover:text-white hover:bg-[#1A2238] transition cursor-pointer shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      {/* Address */}
                      <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-3">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" />
                        <p className="line-clamp-2 leading-relaxed" title={cinema.address}>
                          {cinema.address || 'Không có địa chỉ'}
                        </p>
                      </div>

                      {/* Phone */}
                      {cinema.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-4 font-mono font-bold">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <span>{cinema.phoneNumber}</span>
                        </div>
                      )}

                      {/* Scale stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1A2238]/60 text-[10px] text-gray-400 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-400" />
                          <span>{cStats.totalRoomsCount} Phòng chiếu</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Armchair className="w-3.5 h-3.5 text-purple-400" />
                          <span>{cStats.capacity} Ghế ngồi</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 mt-1 font-bold text-[9px] uppercase tracking-wider text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Đang mở cửa: {cStats.activeCount} / {cStats.totalRoomsCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-25 text-red-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Không tìm thấy rạp nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Selected Cinema Details (Rooms and Seats Map) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedCinema ? (
            <>
              {/* Rooms in Selected Cinema */}
              <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-[#1A2238] pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                      Phòng Chiếu Tại: <span className="text-red-500">{selectedCinema.name}</span>
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{selectedCinema.address}</p>
                  </div>
                  <button
                    onClick={handleAddRoomClick}
                    className="inline-flex items-center gap-1 rounded bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-xs text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm Phòng Mới
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                        <th className="py-3 px-4">Mã Phòng</th>
                        <th className="py-3 px-4">Tên Phòng</th>
                        <th className="py-3 px-4 text-center">Kiểu Phòng</th>
                        <th className="py-3 px-4 text-center">Sức Chứa (Ghế)</th>
                        <th className="py-3 px-4 text-center">Trạng Thái</th>
                        <th className="py-3 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2238]/30">
                      {isLoadingRooms ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-gray-400">
                            <Loader2 className="w-6 h-6 mx-auto text-red-500 animate-spin" />
                          </td>
                        </tr>
                      ) : rooms.length > 0 ? (
                        rooms.map((room) => {
                          const isRoomSelected = selectedRoom?.uuid === room.uuid;
                          const roomTypeConfig = getRoomTypeConfig(room.roomType);
                          return (
                            <tr 
                              key={room.uuid} 
                              onClick={() => setSelectedRoom(room)}
                              className={`hover:bg-white/[0.015] transition-colors align-middle cursor-pointer ${
                                isRoomSelected ? 'bg-white/[0.025] border-l-2 border-l-red-500' : ''
                              }`}
                            >
                              <td className="py-4 px-4 font-mono text-gray-300 font-bold">{room.roomCode || 'ROOM-X'}</td>
                              <td className="py-4 px-4 font-bold text-white text-sm">{room.name}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={roomTypeConfig.className}>
                                  {roomTypeConfig.label}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center font-mono font-bold text-white text-sm">{room.capacity || 0}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-[10px] font-bold transition duration-200 ${
                                  room.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                    : room.status === 'MAINTENANCE'
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    room.status === 'ACTIVE'
                                      ? 'bg-emerald-450 animate-pulse bg-emerald-400'
                                      : room.status === 'MAINTENANCE'
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                                  }`} />
                                  <span>{room.status === 'ACTIVE' ? 'Hoạt động' : room.status === 'MAINTENANCE' ? 'Bảo trì' : 'Vô hiệu'}</span>
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={(e) => handleConfigureSeatsClick(room.uuid, e)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/5 px-2.5 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition duration-150 cursor-pointer"
                                    title="Sơ đồ ghế"
                                  >
                                    <Grid className="w-3.5 h-3.5" /> Ghế
                                  </button>
                                  <button
                                    onClick={(e) => handleEditRoomClick(room, e)}
                                    className="inline-flex items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-xs font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer"
                                    title="Sửa"
                                  >
                                    Sửa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-10 text-center text-gray-500">
                            <Tv className="w-8 h-8 mx-auto mb-2 opacity-25 text-red-500" />
                            <p className="text-xs font-bold uppercase tracking-wider text-white">Chưa có phòng chiếu nào được tạo</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Room Seat Layout Preview */}
              {selectedRoom && (
                <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-[#1A2238] pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <Tv className="w-4 h-4 text-red-500" />
                        Sơ Đồ Ghế Xem Trước: <span className="text-red-500">{selectedRoom.name}</span>
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Bản xem trước trực quan cấu trúc sơ đồ ghế thực tế.</p>
                    </div>
                    
                    {/* Legend */}
                    {selectedRoomSeats.length > 0 && (
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-zinc-500/10 border border-zinc-500/30 inline-block" />
                          <span className="text-gray-400">Thường</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-amber-500/15 border border-amber-500/40 inline-block" />
                          <span className="text-amber-400">VIP</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-rose-500/15 border border-rose-500/40 inline-block" />
                          <span className="text-rose-400">Đôi</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isLoadingSeats ? (
                    <div className="flex justify-center items-center py-16">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : selectedRoomSeats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border border-dashed border-[#1A2238] rounded-xl p-6">
                      <Tv className="w-10 h-10 mx-auto mb-3 opacity-20 text-red-500" />
                      <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">Chưa có sơ đồ ghế nào được sinh</p>
                      <p className="text-xs text-gray-500 mb-4">Nhấp vào nút dưới đây hoặc nút "Ghế" ở trên để sinh sơ đồ ghế tự động.</p>
                      <button
                        onClick={(e) => handleConfigureSeatsClick(selectedRoom.uuid, e)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs text-white font-bold transition shadow-md cursor-pointer"
                      >
                        <Grid className="w-4 h-4" /> Cấu hình sơ đồ ghế
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center overflow-x-auto">
                      {/* Curved Screen Element */}
                      <div className="w-full max-w-[320px] sm:max-w-[420px] flex flex-col items-center mb-10">
                        <div className="w-full h-1.5 bg-gradient-to-r from-transparent via-red-500 to-transparent rounded-full shadow-[0_3px_15px_rgba(239,68,68,0.7)]" />
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest mt-2">Màn Hình Chiếu / Screen</span>
                      </div>

                      {/* Seats Layout Grid */}
                      <div className="flex flex-col gap-2.5 select-none w-full max-w-[320px] sm:max-w-[420px]">
                        {Object.entries(seatsByRow).map(([rowName, rowSeats]) => (
                          <div key={rowName} className="flex items-center justify-between gap-3 min-w-max">
                            {/* Left Row Header */}
                            <span className="w-4 font-mono font-black text-xs text-gray-500 text-center shrink-0">{rowName}</span>
                            
                            {/* Row Seats list */}
                            <div className="flex items-center gap-1.5">
                              {rowSeats.map((seat) => {
                                const stTypeName = seat.seatTypeName?.toUpperCase() || 'STANDARD';
                                const isActive = seat.status === 'ACTIVE';
                                
                                let seatStyle = 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400';
                                if (stTypeName === 'VIP') {
                                  seatStyle = 'bg-amber-500/10 border-amber-500/35 text-amber-400';
                                } else if (stTypeName === 'COUPLE') {
                                  seatStyle = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
                                }

                                if (!isActive) {
                                  seatStyle = 'bg-red-950/20 border-red-900/30 text-red-700 opacity-40 cursor-not-allowed';
                                }

                                return (
                                  <span
                                    key={seat.uuid}
                                    className={`w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center border font-mono transition-all duration-150 shadow-sm shrink-0 ${seatStyle}`}
                                    title={`${rowName}${seat.seatNumber} (${stTypeName}) - ${isActive ? 'Hoạt động' : 'Bảo trì/Khóa'}`}
                                  >
                                    {seat.seatNumber}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Right Row Header */}
                            <span className="w-4 font-mono font-black text-xs text-gray-500 text-center shrink-0">{rowName}</span>
                          </div>
                        ))}
                      </div>

                      {/* Screen Footer Legend note */}
                      <div className="mt-8 pt-4 border-t border-[#1A2238]/60 w-full max-w-[320px] sm:max-w-[420px] text-center text-[10px] text-gray-500 font-semibold flex justify-center gap-4">
                        <span>Lối đi ở giữa các hàng được phân chia chuẩn NASA.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#1A2238] p-12 text-center text-gray-500 flex flex-col items-center justify-center min-h-[300px]">
              <MapPin className="w-12 h-12 mb-3 opacity-20 text-red-500 animate-pulse" />
              <p className="text-sm font-bold uppercase tracking-wider text-white mb-1">Chưa chọn chi nhánh rạp</p>
              <p className="text-xs text-gray-500">Vui lòng chọn một rạp chiếu ở danh sách bên trái để quản lý các phòng và cấu hình ghế.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cinema Modal */}
      {isCinemaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsCinemaModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingCinema ? 'Chỉnh Sửa Chi Nhánh Rạp' : 'Thêm Chi Nhánh Rạp Mới'}
              </h2>
              <button
                onClick={() => setIsCinemaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCinemaSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tên Rạp Chiếu *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  placeholder="Ví dụ: NASA Landmark 81"
                  value={cinemaFormData.name}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Địa Chỉ *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  placeholder="Địa chỉ chi tiết..."
                  value={cinemaFormData.address}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Số Điện Thoại *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  placeholder="Ví dụ: 19001080"
                  value={cinemaFormData.phoneNumber}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, phoneNumber: e.target.value })}
                />
              </div>
              
              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCinemaModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsRoomModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingRoom ? 'Chỉnh Sửa Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
              </h2>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mã Phòng Chiếu *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  placeholder="Ví dụ: ROOM-IMAX-01"
                  value={roomFormData.roomCode}
                  onChange={(e) => setRoomFormData({ ...roomFormData, roomCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tên Phòng Chiếu *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                  placeholder="Ví dụ: Phòng Chiếu Số 1"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kiểu Phòng *</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
                    value={roomFormData.roomType}
                    onChange={(e) => setRoomFormData({ ...roomFormData, roomType: e.target.value })}
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="IMAX">IMAX</option>
                    <option value="FOUR_DX">4DX</option>
                    <option value="DOLBY_ATMOS">Dolby Atmos</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trạng Thái *</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                    <option value="DISABLED">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seat layout generation modal */}
      {isSeatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsSeatModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300">
            <button
              onClick={() => setIsSeatModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Cấu Hình Sơ Đồ Ghế</h2>
            <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">
              Sơ đồ ghế sẽ được tự động sinh ngẫu nhiên tỉ lệ: 50% Thường (STANDARD), 30% VIP, và 20% Ghế Đôi (COUPLE) ở hàng cuối.
            </p>
            <form onSubmit={handleSeatSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Số Hàng Ghế</label>
                  <input
                    type="number"
                    min="1"
                    max="26"
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50"
                    value={seatFormData.rowCount}
                    onChange={(e) => setSeatFormData({ ...seatFormData, rowCount: parseInt(e.target.value) || 8 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ghế Mỗi Hàng</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50"
                    value={seatFormData.seatsPerRow}
                    onChange={(e) => setSeatFormData({ ...seatFormData, seatsPerRow: parseInt(e.target.value) || 12 })}
                  />
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsSeatModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Sinh Sơ Đồ Ghế
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CinemasPage;
