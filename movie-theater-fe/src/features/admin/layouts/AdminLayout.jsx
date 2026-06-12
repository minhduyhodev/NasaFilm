import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import spaceAuthBg from '../../../shared/assets/space_auth_bg.png';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || 'ADMIN';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const avatar = avatarLoadFailed ? huyAdmin : normalizeAvatarUrl(user?.avatar) || huyAdmin;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed inset-y-0 left-0 z-50 bg-[#0c1020]/95 border-r border-[#1A2238] flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl ${isHovered ? 'lg:w-[240px]' : 'lg:w-[70px]'} w-72`}
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70 pointer-events-none z-0" />

      <div className={`relative z-10 py-6 border-b border-[#1A2238] flex items-center transition-all duration-300 ${isHovered ? 'px-6 justify-start' : 'px-6 justify-start lg:px-0 lg:justify-center'}`}>
        {/* Logo content */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer shrink-0">
          <img src={nasaLogo} alt="NASAFILM Logo" className="h-9 w-auto object-contain rounded-lg" />
          <span className={`text-xl font-black tracking-tight leading-none text-white transition-all duration-300 whitespace-nowrap ${isHovered ? 'opacity-100 max-w-[150px]' : 'lg:opacity-0 lg:max-w-0 lg:overflow-hidden'}`}>
            NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
          </span>
        </Link>
      </div>

      <nav className={`relative z-10 flex-1 py-4 space-y-2 overflow-y-auto no-scrollbar transition-all duration-300 ${isHovered ? 'px-4' : 'px-4 lg:px-2'}`}>
        {[
          { to: '/admin', icon: 'dashboard', label: 'Tổng quan' },
          { to: '/admin/movies', icon: 'movie', label: 'Phim' },
          { to: '/admin/actors', icon: 'person', label: 'Diễn viên' },
          { to: '/admin/bookings', icon: 'confirmation_number', label: 'Đơn hàng' },
          { to: '/admin/showtimes', icon: 'schedule', label: 'Lịch chiếu' },
          { to: '/admin/cinemas', icon: 'theater_comedy', label: 'Rạp chiếu' },
          { to: '/admin/users', icon: 'group', label: 'Khách hàng' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              } ${isHovered ? 'px-4 py-3 gap-4 justify-start' : 'px-4 py-3 gap-4 lg:px-0 lg:py-3 lg:gap-0 lg:justify-center'}`
            }
            onClick={onClose}
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className={`font-label-md transition-all duration-300 whitespace-nowrap ${isHovered ? 'opacity-100 max-w-[150px]' : 'lg:opacity-0 lg:max-w-0 lg:overflow-hidden'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`relative z-10 mt-auto transition-all duration-300 ${isHovered ? 'p-3' : 'p-3 lg:p-2'}`}>
        <div className={`bg-white/5 rounded-xl border border-white/10 flex items-center backdrop-blur-md transition-all duration-300 ${isHovered ? 'p-2.5 gap-2.5' : 'p-2.5 gap-2.5 lg:p-2 lg:gap-0 lg:justify-center'}`}>
          <div className="w-9 h-9 rounded-full bg-black/40 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
            <img
              alt="Admin Profile"
              className="w-full h-full object-cover"
              src={avatar}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          <div className={`transition-all duration-300 min-w-0 flex-1 text-left ${isHovered ? 'opacity-100 max-w-[120px] ml-2' : 'opacity-100 max-w-[120px] ml-2 lg:opacity-0 lg:max-w-0 lg:overflow-hidden lg:ml-0'}`}>
            <p className="font-label-md text-white font-bold truncate leading-tight whitespace-nowrap">{displayName}</p>
            <p className="text-[9px] text-gray-400 font-medium tracking-wider uppercase mt-0.5 whitespace-nowrap">Quản trị</p>
          </div>
          <button 
            onClick={handleLogout} 
            className={`rounded-full border border-white/10 p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/10 transition-colors shrink-0 cursor-pointer ${isHovered ? 'ml-auto block' : 'ml-auto block lg:hidden'}`}
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    const scrollToTop = () => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToTop();

    const t1 = setTimeout(scrollToTop, 0);
    const t2 = setTimeout(scrollToTop, 50);
    const t3 = setTimeout(scrollToTop, 150);
    const t4 = setTimeout(scrollToTop, 300);
    const t5 = setTimeout(scrollToTop, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0B1020] text-gray-100 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main ref={mainRef} className="lg:ml-[70px] min-h-screen flex flex-col overflow-y-auto custom-scrollbar bg-[#0B1020]">
        <div className="sticky top-0 z-40 w-full border-b border-[#1A2238] bg-[#0c1020]/90 backdrop-blur-[16px] shadow-sm lg:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[#1A2238] bg-[#121826] text-gray-200 lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-8">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
