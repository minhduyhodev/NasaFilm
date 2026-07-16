import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, LogOut, Ticket, QrCode, Building2, Milestone, User } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { cinemaService } from '../../../shared/services/cinemaService';
import { CounterSelectDropdown } from '../components/CounterSelectDropdown';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import '../../admin/styles/admin-theme.css';
import '../styles/counter-staff-theme.css';

export default function CounterLayout() {
  const confirm = useConfirm();
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

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
  const handleCinemaChange = (cinemaUuid) => {
    setSelectedCinemaUuid(cinemaUuid);
    localStorage.setItem('counter_cinema_uuid', cinemaUuid);

    const cinema = cinemas.find((c) => c.uuid === cinemaUuid);
    if (cinema?.rooms?.length > 0) {
      const roomUuid = cinema.rooms[0].uuid;
      setSelectedRoomUuid(roomUuid);
      localStorage.setItem('counter_room_uuid', roomUuid);
      window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid, roomUuid } }));
    } else {
      setSelectedRoomUuid('');
      localStorage.removeItem('counter_room_uuid');
      window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid, roomUuid: '' } }));
    }
  };

  // Handle room change
  const handleRoomChange = (roomUuid) => {
    setSelectedRoomUuid(roomUuid);
    localStorage.setItem('counter_room_uuid', roomUuid);
    window.dispatchEvent(new CustomEvent('counter-location-changed', { detail: { cinemaUuid: selectedCinemaUuid, roomUuid } }));
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất?',
      confirmLabel: 'Đăng xuất',
      variant: 'warning',
    });
    if (!ok) return;
    logout();
    navigate('/login');
  };

  const activeCinema = cinemas.find((c) => c.uuid === selectedCinemaUuid);
  const rooms = activeCinema?.rooms || [];

  const cinemaOptions = useMemo(
    () => cinemas.map((cinema) => ({ value: cinema.uuid, label: cinema.name })),
    [cinemas],
  );

  const roomOptions = useMemo(
    () => rooms.map((room) => ({
      value: room.uuid,
      label: `${room.name} (${room.roomType})`,
    })),
    [rooms],
  );

  const displayName = user?.fullName || user?.email || 'Nhân viên';

  return (
    <div className="admin-shell min-h-screen bg-[#080B14] text-gray-100 flex flex-col font-sans antialiased">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-[#1E293B] bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center shadow-lg overflow-visible relative">
        <div className="flex items-center gap-4 shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/counter/pos" className="flex items-center gap-2.5">
            <img src={nasaLogo} alt="NASA Film" className="h-8 w-8 rounded-lg object-cover shadow" />
            <span className="text-lg font-black tracking-wider text-white">
              NASA<span className="text-red-500">FILM</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 tracking-widest font-bold uppercase font-mono">
                POS
              </span>
            </span>
          </Link>
        </div>

        {/* Dynamic Location selectors — căn giữa header */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-3 z-20">
          <CounterSelectDropdown
            id="counter-header-cinema"
            variant="header"
            label="Chọn rạp"
            leadingIcon={Building2}
            value={selectedCinemaUuid}
            options={cinemaOptions}
            placeholder="Chọn rạp"
            emptyMessage="Chưa có rạp"
            onChange={handleCinemaChange}
            menuMinWidth={240}
          />
          <CounterSelectDropdown
            id="counter-header-room"
            variant="header"
            label="Chọn phòng chiếu"
            leadingIcon={Milestone}
            value={selectedRoomUuid}
            options={roomOptions}
            placeholder="Chọn phòng"
            emptyMessage="Không có phòng"
            disabled={rooms.length === 0}
            onChange={handleRoomChange}
            menuMinWidth={260}
          />
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-[#0B0F19] border-r border-[#1E293B]/60 transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
          } flex flex-col shrink-0 overflow-hidden`}
        >
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
            <NavLink
              to="/counter/pos"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-sm font-bold ${
                  isSidebarOpen ? 'px-4 py-3 gap-3' : 'p-3 justify-center'
                } ${
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Ticket className="w-4 h-4 text-red-400 shrink-0" />
              {isSidebarOpen && <span>Giao diện bán vé</span>}
            </NavLink>

            <NavLink
              to="/counter/check-in"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-sm font-bold ${
                  isSidebarOpen ? 'px-4 py-3 gap-3' : 'p-3 justify-center'
                } ${
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <QrCode className="w-4 h-4 text-red-400 shrink-0" />
              {isSidebarOpen && <span>Soát vé & giám sát</span>}
            </NavLink>
          </nav>

          {/* Staff profile — cố định dưới cùng sidebar */}
          <div
            className={`counter-sidebar__profile mt-auto shrink-0 border-t border-[#1E293B]/40 bg-black/20 ${
              isSidebarOpen ? 'p-4' : 'p-2 flex flex-col items-center gap-2'
            }`}
          >
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2.5 flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                  title={displayName}
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-200 truncate leading-tight">
                      {displayName}
                    </p>
                    <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mt-0.5">
                      Staff
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg text-red-400 hover:text-red-500 transition-all cursor-pointer shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div
                  className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center"
                  title={displayName}
                >
                  <User className="w-4 h-4 text-red-400" />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-500 transition-all cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {/* Mobile warning/selection if layout hides selectors */}
          <div className="md:hidden flex flex-col gap-3 mb-4 p-3 bg-[#121826] border border-[#1E293B] rounded-lg">
            <CounterSelectDropdown
              id="counter-mobile-cinema"
              variant="header"
              label="Rạp"
              leadingIcon={Building2}
              value={selectedCinemaUuid}
              options={cinemaOptions}
              placeholder="Chọn rạp"
              onChange={handleCinemaChange}
              className="w-full"
            />
            <CounterSelectDropdown
              id="counter-mobile-room"
              variant="header"
              label="Phòng soát"
              leadingIcon={Milestone}
              value={selectedRoomUuid}
              options={roomOptions}
              placeholder="Chọn phòng"
              disabled={rooms.length === 0}
              onChange={handleRoomChange}
              className="w-full"
            />
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
