import React, { useState, useEffect } from 'react';
import { MapPin, SlidersHorizontal, Download, Search, Edit2, Plus, X, ChevronRight, Tv, Activity, Grid } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import './CinemasPage.css';

const CinemasPage = () => {
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoadingCinemas, setIsLoadingCinemas] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
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

  useEffect(() => {
    fetchCinemas();
  }, []);

  useEffect(() => {
    if (selectedCinema) {
      fetchRooms(selectedCinema.uuid);
    } else {
      setRooms([]);
    }
  }, [selectedCinema]);

  const fetchCinemas = async () => {
    setIsLoadingCinemas(true);
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      const list = data.content || data;
      setCinemas(list);
      if (list.length > 0 && !selectedCinema) {
        setSelectedCinema(list[0]);
      }
    } catch (error) {
      console.error('Failed to fetch cinemas:', error);
    } finally {
      setIsLoadingCinemas(false);
    }
  };

  const fetchRooms = async (cinemaUuid) => {
    setIsLoadingRooms(true);
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
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
      } else {
        await cinemaService.createCinema(cinemaFormData);
      }
      setIsCinemaModalOpen(false);
      fetchCinemas();
    } catch (error) {
      alert(error.message || 'Lỗi khi lưu rạp chiếu');
    }
  };

  // Room handlers
  const handleAddRoomClick = () => {
    if (!selectedCinema) return;
    setEditingRoom(null);
    setRoomFormData({ roomCode: '', name: '', roomType: 'STANDARD', capacity: 0, status: 'ACTIVE' });
    setIsRoomModalOpen(true);
  };

  const handleEditRoomClick = (room) => {
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
      } else {
        await cinemaService.createRoom(selectedCinema.uuid, roomFormData);
      }
      setIsRoomModalOpen(false);
      fetchRooms(selectedCinema.uuid);
    } catch (error) {
      alert(error.message || 'Lỗi khi lưu phòng chiếu');
    }
  };

  // Seat config handlers
  const handleConfigureSeatsClick = (roomUuid) => {
    setTargetRoomUuid(roomUuid);
    setSeatFormData({ rowCount: 8, seatsPerRow: 12 });
    setIsSeatModalOpen(true);
  };

  const handleSeatSubmit = async (e) => {
    e.preventDefault();
    try {
      await cinemaService.generateSeats(targetRoomUuid, seatFormData.rowCount, seatFormData.seatsPerRow);
      setIsSeatModalOpen(false);
      alert('Đã sinh sơ đồ ghế thành công!');
      fetchRooms(selectedCinema.uuid);
    } catch (error) {
      alert(error.message || 'Lỗi khi sinh sơ đồ ghế');
    }
  };

  const filteredCinemas = cinemas.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Hệ Thống Chi Nhánh Rạp & Phòng</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tổng chi nhánh: <span className="text-white font-bold">{cinemas.length}</span> · 
            Phòng chiếu hiện tại: <span className="text-rose-400 font-bold">{rooms.length}</span>
          </p>
        </div>
        <button 
          onClick={handleAddCinemaClick}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm Rạp Chiếu Mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Side: Cinema list */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Tìm kiếm rạp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
              {isLoadingCinemas ? (
                <p className="text-xs text-gray-400 text-center py-4">Đang tải danh sách rạp...</p>
              ) : filteredCinemas.length > 0 ? (
                filteredCinemas.map((cinema) => (
                  <div
                    key={cinema.uuid}
                    onClick={() => setSelectedCinema(cinema)}
                    className={`flex items-start justify-between p-3 rounded-lg border transition duration-200 cursor-pointer ${
                      selectedCinema?.uuid === cinema.uuid
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-[#0F1322]/40 border-[#1A2238] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${selectedCinema?.uuid === cinema.uuid ? 'text-red-500' : 'text-gray-400'}`} />
                      <div>
                        <h3 className="text-xs font-bold text-white leading-tight">{cinema.name}</h3>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] truncate">{cinema.address || 'Không có địa chỉ'}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleEditCinemaClick(cinema, e)}
                      className="p-1 rounded bg-[#151C30] text-gray-400 hover:text-white hover:bg-[#1A2238] transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Không tìm thấy rạp nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Rooms in Selected Cinema */}
        <div className="lg:col-span-2">
          {selectedCinema ? (
            <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md p-4">
              <div className="flex items-center justify-between border-b border-[#1A2238] pb-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                    Phòng Chiếu Tại: <span className="text-red-500">{selectedCinema.name}</span>
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">{selectedCinema.address}</p>
                </div>
                <button
                  onClick={handleAddRoomClick}
                  className="inline-flex items-center gap-1 rounded bg-[#0F1322] border border-[#1A2238] px-2.5 py-1.5 text-[10px] text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Thêm Phòng Mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                      <th className="py-2.5 px-3">Mã Phòng</th>
                      <th className="py-2.5 px-3">Tên Phòng</th>
                      <th className="py-2.5 px-3 text-center">Kiểu Phòng</th>
                      <th className="py-2.5 px-3 text-center">Sức Chứa (Ghế)</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2238]/40">
                    {isLoadingRooms ? (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-gray-400">Đang tải danh sách phòng...</td>
                      </tr>
                    ) : rooms.length > 0 ? (
                      rooms.map((room) => (
                        <tr key={room.uuid} className="hover:bg-white/[0.015] transition-colors align-middle">
                          <td className="py-3 px-3 font-mono text-gray-300 font-bold">{room.roomCode || 'ROOM-X'}</td>
                          <td className="py-3 px-3 font-bold text-white">{room.name}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1A2238] text-amber-400">
                              {room.roomType || 'STANDARD'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-white">{room.capacity}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[9px] font-bold transition duration-200 ${
                              room.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                : room.status === 'MAINTENANCE'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                room.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : room.status === 'MAINTENANCE'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`} />
                              <span>{room.status === 'ACTIVE' ? 'Hoạt động' : room.status === 'MAINTENANCE' ? 'Bảo trì' : 'Vô hiệu'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleConfigureSeatsClick(room.uuid)}
                                className="inline-flex items-center gap-1 rounded border border-purple-500/20 bg-purple-500/5 px-2 py-1 text-[10px] font-bold text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/30 transition duration-150 cursor-pointer"
                                title="Sơ đồ ghế"
                              >
                                <Grid className="w-3 h-3" /> Cấu hình
                              </button>
                              <button
                                onClick={() => handleEditRoomClick(room)}
                                className="inline-flex items-center justify-center rounded border border-blue-500/20 bg-blue-500/5 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer"
                                title="Sửa"
                              >
                                Sửa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-gray-500">Chưa có phòng chiếu nào được tạo</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#1A2238] p-8 text-center text-gray-500">
              Vui lòng chọn một rạp chiếu ở danh sách bên trái để xem và quản lý phòng.
            </div>
          )}
        </div>
      </div>

      {/* Cinema Modal */}
      {isCinemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1A2238] shadow-2xl p-6 text-left relative">
            <button
              onClick={() => setIsCinemaModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-white rounded bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider">
              {editingCinema ? 'Chỉnh Sửa Chi Nhánh Rạp' : 'Thêm Chi Nhánh Rạp Mới'}
            </h2>
            <form onSubmit={handleCinemaSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Tên Rạp Chiếu</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: NASA Landmark 81"
                  value={cinemaFormData.name}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Địa Chỉ</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  placeholder="Địa chỉ chi tiết..."
                  value={cinemaFormData.address}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: 19001080"
                  value={cinemaFormData.phoneNumber}
                  onChange={(e) => setCinemaFormData({ ...cinemaFormData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCinemaModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1A2238] shadow-2xl p-6 text-left relative">
            <button
              onClick={() => setIsRoomModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-white rounded bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider">
              {editingRoom ? 'Chỉnh Sửa Phòng Chiếu' : 'Thêm Phòng Chiếu Mới'}
            </h2>
            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Mã Phòng Chiếu</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: ROOM-IMAX-01"
                  value={roomFormData.roomCode}
                  onChange={(e) => setRoomFormData({ ...roomFormData, roomCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Tên Phòng Chiếu</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  placeholder="Ví dụ: Phòng Chiếu Số 1"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Kiểu Phòng</label>
                  <select
                    className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
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
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Trạng Thái</label>
                  <select
                    className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={roomFormData.status}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                    <option value="DISABLED">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#090D1A] border border-[#1A2238] shadow-2xl p-6 text-left relative">
            <button
              onClick={() => setIsSeatModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-white rounded bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-2 uppercase tracking-wider">Cấu Hình Sơ Đồ Ghế</h2>
            <p className="text-[10px] text-gray-400 mb-4">Sơ đồ ghế sẽ được tự động đồng bộ tỉ lệ 50% Thường, 30% VIP, 20% Ghế Đôi ở hàng cuối.</p>
            <form onSubmit={handleSeatSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Số Hàng Ghế</label>
                  <input
                    type="number"
                    min="1"
                    max="26"
                    required
                    className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={seatFormData.rowCount}
                    onChange={(e) => setSeatFormData({ ...seatFormData, rowCount: parseInt(e.target.value) || 8 })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Ghế Mỗi Hàng</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={seatFormData.seatsPerRow}
                    onChange={(e) => setSeatFormData({ ...seatFormData, seatsPerRow: parseInt(e.target.value) || 12 })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSeatModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs text-white font-bold cursor-pointer"
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
