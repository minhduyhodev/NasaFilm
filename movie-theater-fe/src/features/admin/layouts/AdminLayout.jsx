import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import spaceAuthBg from '../../../shared/assets/space_auth_bg.png';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import '../pages/DashboardPage.css';
import './AdminLayout.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || 'ADMIN';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
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
      className={`fixed inset-y-0 left-0 z-50 border-r border-[#1A2238] flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:w-60 w-72`}
    >
      {/* Space background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none pointer-events-none z-0"
        style={{
          backgroundImage: `url(${spaceAuthBg})`,
          filter: 'brightness(0.55) contrast(1.15)',
        }}
      />
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none z-0" />

      <div className="relative z-10 py-5 px-6 border-b border-[#1A2238]/60 flex items-center justify-start">
        <Link to="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer shrink-0">
          <img src={nasaLogo} alt="NASAFILM Logo" className="h-7 w-auto object-contain rounded-lg" />
          <span className="text-lg font-black tracking-tight leading-none text-white">
            NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
          </span>
        </Link>
      </div>

      <nav className="relative z-10 flex-1 py-5 px-4 space-y-6 overflow-y-auto no-scrollbar">
        {/* System Group */}
        <div>
          <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Hệ thống</div>
          <div className="space-y-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2 gap-3 transition-all duration-200 text-xs font-semibold ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined shrink-0 text-base" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    dashboard
                  </span>
                  <span>Tổng quan</span>
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Content Group */}
        <div>
          <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Nội dung</div>
          <div className="space-y-1">
            {[
              { to: '/admin/movies', icon: 'movie', label: 'Phim' },
              { to: '/admin/actors', icon: 'person', label: 'Diễn viên' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-3 py-2 gap-3 transition-all duration-200 text-xs font-semibold ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
                onClick={onClose}
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined shrink-0 text-base" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Operations Group */}
        <div>
          <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Vận hành</div>
          <div className="space-y-1">
            {[
              { to: '/admin/showtimes', icon: 'schedule', label: 'Lịch chiếu' },
              { to: '/admin/cinemas', icon: 'theater_comedy', label: 'Rạp chiếu' },
              { to: '/admin/bookings', icon: 'confirmation_number', label: 'Đơn hàng' },
              { to: '/admin/vouchers', icon: 'local_activity', label: 'Khuyến mãi' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-3 py-2 gap-3 transition-all duration-200 text-xs font-semibold ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
                onClick={onClose}
              >
                {({ isActive }) => (
                  <>
                    <span className="material-symbols-outlined shrink-0 text-base" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Users Group */}
        <div>
          <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Người dùng</div>
          <div className="space-y-1">
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2 gap-3 transition-all duration-200 text-xs font-semibold ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined shrink-0 text-base" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                    group
                  </span>
                  <span>Khách hàng</span>
                </>
              )}
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mt-auto p-4 border-t border-[#1A2238]/60 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black/40 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
            <img
              alt="Admin Profile"
              className="w-full h-full object-cover"
              src={avatar}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
            <p className="text-[9px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">Quản trị</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
            title="Đăng xuất"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
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
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main ref={mainRef} className="admin-light-theme lg:ml-60 min-h-screen flex flex-col overflow-y-auto custom-scrollbar relative z-10">
        <div className="sticky top-0 z-40 w-full border-b border-[#1A2238] bg-[#0B0F19]/90 backdrop-blur-[16px] shadow-sm lg:hidden">
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

        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8 px-6 py-8 sm:px-10">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
