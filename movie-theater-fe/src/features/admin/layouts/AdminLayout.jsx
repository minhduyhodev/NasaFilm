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
  const avatar = avatarLoadFailed ? huyAdmin : normalizeAvatarUrl(user?.avatar) || huyAdmin;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#030307] border-r border-white/10 flex flex-col overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-xl`}>
      {/* Background image & animation identical to LoginPage */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none pointer-events-none z-0"
        style={{
          backgroundImage: `url(${spaceAuthBg})`,
          transform: 'scale(1.04)',
          animation: 'spaceBgPan 60s ease-in-out infinite',
          filter: 'brightness(0.55) contrast(1.15)',
        }}
      />
      {/* Dark gradient overlay to match visual depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60 pointer-events-none z-0" />

      <div className="relative z-10 px-6 py-6 border-b border-white/10 flex items-center justify-center">
        {/* Logo content */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer">
          <img src={nasaLogo} alt="NASAFILM Logo" className="h-11 w-auto object-contain rounded-xl" />
          <span className="text-2xl font-black tracking-tight leading-none text-white">
            NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
          </span>
        </Link>
      </div>
      <nav className="relative z-10 flex-1 px-4 py-4 space-y-2 overflow-y-auto no-scrollbar">
        {[
          { to: '/admin', icon: 'dashboard', label: 'Tổng quan' },
          { to: '/admin/movies', icon: 'movie', label: 'Phim' },
          { to: '/admin/showtimes', icon: 'schedule', label: 'Lịch chiếu' },
          { to: '/admin/cinemas', icon: 'theater_comedy', label: 'Rạp chiếu' },
          { to: '/admin/users', icon: 'group', label: 'Khách hàng' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-error text-white shadow-lg shadow-red-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            onClick={onClose}
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-label-md">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="relative z-10 p-4 mt-auto space-y-3">
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-black/40 border border-white/15 flex items-center justify-center overflow-hidden">
            <img
              alt="Admin Profile"
              className="w-full h-full object-cover"
              src={avatar}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          <div>
            <p className="font-label-md text-white font-bold">{displayName}</p>
            <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">Quản trị viên</p>
          </div>
          <button onClick={handleLogout} className="ml-auto rounded-full border border-white/10 p-2 text-gray-400 hover:text-error hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">logout</span>
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
    const t5 = setTimeout(scrollToTop, 600); // safety net for slow API queries

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main ref={mainRef} className="lg:ml-72 min-h-screen flex flex-col overflow-y-auto custom-scrollbar bg-gray-50">
        <div className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-[16px] shadow-sm lg:hidden">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 lg:hidden"
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
