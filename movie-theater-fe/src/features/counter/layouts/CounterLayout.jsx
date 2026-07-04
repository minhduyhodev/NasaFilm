import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, LogOut, Ticket, QrCode, Building2, Milestone, User } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { cinemaService } from '../../../shared/services/cinemaService';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import swal from 'sweetalert2';

export default function CounterLayout() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [cinemas, setCinemas] = useState([]);
  const [selectedCinemaUuid, setSelectedCinemaUuid] = useState(
    localStorage.getItem('counter_cinema_uuid') || ''
  );
  const [selectedRoomUuid, setSelectedRoomUuid] = useState(
    localStorage.getItem('counter_room_uuid') || ''
  );
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Fetch cinemas and rooms
  useEffect(() => {
    async function fetchCinemas() {
      try {
        const data = await cinemaService.getCinemasWithRooms('', 0, 100);
        setCinemas(data || []);

        // Default selection if empty
        if (data && data.length > 0) {
          if (!selectedCinemaUuid) {
            const defaultCinema = data[0];
            setSelectedCinemaUuid(defaultCinema.uuid);
            localStorage.setItem('counter_cinema_uuid', defaultCinema.uuid);

            if (defaultCinema.rooms && defaultCinema.rooms.length > 0) {
              setSelectedRoomUuid(defaultCinema.rooms[0].uuid);
              localStorage.setItem('counter_room_uuid', defaultCinema.rooms[0].uuid);
            }
          } else {
            // Find existing cinema to validate/default room
            const currentCinema = data.find(c => c.uuid === selectedCinemaUuid);
            if (currentCinema && currentCinema.rooms && currentCinema.rooms.length > 0 && !selectedRoomUuid) {
              setSelectedRoomUuid(currentCinema.rooms[0].uuid);
              localStorage.setItem('counter_room_uuid', currentCinema.rooms[0].uuid);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cinemas with rooms:', error);
      }
    }
    fetchCinemas();
  }, [selectedCinemaUuid, selectedRoomUuid]);

  // Handle cinema change
  const handleCinemaChange = (e) => {
    const cinemaUuid = e.target.value;
    setSelectedCinemaUuid(cinemaUuid);
    localStorage.setItem('counter_cinema_uuid', cinemaUuid);

    const cinema = cinemas.find(c => c.uuid === cinemaUuid);
    if (cinema && cinema.rooms && cinema.rooms.length > 0) {
      const roomUuid = cinema.rooms[0].uuid;
      setSelectedRoomUuid(roomUuid);
      localStorage.setItem('counter_room_uuid', roomUuid);
      // Dispatch custom event to notify child components of changes
      window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid, roomUuid } }));
    } else {
      setSelectedRoomUuid('');
      localStorage.removeItem('counter_room_uuid');
      window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid, roomUuid: '' } }));
    }
  };

  // Handle room change
  const handleRoomChange = (e) => {
    const roomUuid = e.target.value;
    setSelectedRoomUuid(roomUuid);
    localStorage.setItem('counter_room_uuid', roomUuid);
    window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid: selectedCinemaUuid, roomUuid } }));
  };

  const handleLogout = () => {
    swal.fire({
      title: 'Đăng xuất',
      text: 'Bạn có chắc chắn muốn đăng xuất?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đăng xuất',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#ef4444',
      background: '#0B0F19',
      color: '#f3f4f6',
      customClass: {
        popup: 'border border-[#1E293B] rounded-xl shadow-2xl'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/counter/login');
      }
    });
  };

  const activeCinema = cinemas.find(c => c.uuid === selectedCinemaUuid);
  const rooms = activeCinema?.rooms || [];

  return (
    <div className="min-h-screen bg-[#080B14] text-gray-100 flex flex-col font-sans antialiased">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-[#1E293B] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/counter/pos" className="flex items-center gap-2.5">
            <img src={nasaLogo} alt="NASA Film" className="h-8 w-8 rounded-lg object-cover shadow" />
            <span className="text-lg font-black tracking-wider text-white">
              NASA<span className="text-indigo-500">FILM</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 tracking-widest font-bold uppercase font-mono">
                POS
              </span>
            </span>
          </Link>
        </div>

        {/* Dynamic Location selectors */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#121826] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedCinemaUuid}
              onChange={handleCinemaChange}
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-gray-200 font-semibold cursor-pointer max-w-[180px]"
            >
              {cinemas.map(cinema => (
                <option key={cinema.uuid} value={cinema.uuid} className="bg-[#0B0F19] text-gray-200">
                  {cinema.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#121826] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs">
            <Milestone className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedRoomUuid}
              onChange={handleRoomChange}
              disabled={rooms.length === 0}
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-gray-200 font-semibold cursor-pointer min-w-[120px]"
            >
              {rooms.length === 0 ? (
                <option value="" className="bg-[#0B0F19] text-gray-500">Không có phòng</option>
              ) : (
                rooms.map(room => (
                  <option key={room.uuid} value={room.uuid} className="bg-[#0B0F19] text-gray-200">
                    {room.name} ({room.roomType})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Staff profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-gray-200 hidden sm:inline-block">
              {user?.fullName || user?.email || 'Nhân viên'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg text-red-400 hover:text-red-500 transition-all cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-[#0B0F19] border-r border-[#1E293B]/60 transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
          } flex flex-col shrink-0 overflow-y-auto no-scrollbar`}
        >
          <div className="p-4 space-y-1.5">
            <NavLink
              to="/counter/pos"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-sm font-bold ${
                  isSidebarOpen ? 'px-4 py-3 gap-3' : 'p-3 justify-center'
                } ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Ticket className="w-4 h-4 text-indigo-400 shrink-0" />
              {isSidebarOpen && <span>Giao diện bán vé</span>}
            </NavLink>

            <NavLink
              to="/counter/check-in"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-sm font-bold ${
                  isSidebarOpen ? 'px-4 py-3 gap-3' : 'p-3 justify-center'
                } ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
              {isSidebarOpen && <span>Soát vé QR</span>}
            </NavLink>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {/* Mobile warning/selection if layout hides selectors */}
          <div className="md:hidden flex flex-col gap-2 mb-4 p-3 bg-[#121826] border border-[#1E293B] rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Rạp:</span>
              <select
                value={selectedCinemaUuid}
                onChange={handleCinemaChange}
                className="bg-transparent border-none text-right focus:outline-none text-gray-200 font-bold"
              >
                {cinemas.map(cinema => (
                  <option key={cinema.uuid} value={cinema.uuid} className="bg-[#0B0F19] text-gray-200">
                    {cinema.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Phòng soát:</span>
              <select
                value={selectedRoomUuid}
                onChange={handleRoomChange}
                disabled={rooms.length === 0}
                className="bg-transparent border-none text-right focus:outline-none text-gray-200 font-bold"
              >
                {rooms.length === 0 ? (
                  <option value="" className="bg-[#0B0F19]">Không có phòng</option>
                ) : (
                  rooms.map(room => (
                    <option key={room.uuid} value={room.uuid} className="bg-[#0B0F19] text-gray-200">
                      {room.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
