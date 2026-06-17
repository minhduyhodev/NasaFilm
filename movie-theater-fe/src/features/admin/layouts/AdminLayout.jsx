import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Film, 
  User, 
  Calendar, 
  Tv, 
  Ticket, 
  Tag, 
  Users, 
  LogOut, 
  Menu,
  Popcorn
} from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import spaceAuthBg from '../../../shared/assets/space_auth_bg.png';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import '../pages/DashboardPage.css';
import './AdminLayout.css';

const Sidebar = ({ isOpen, onToggle, onClose }) => {
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
      className={`fixed inset-y-0 left-0 z-50 bg-[#0f172a] border-r border-[#1E293B]/20 flex flex-col overflow-hidden transition-all duration-300 ${
        isOpen 
          ? 'w-60 translate-x-0' 
          : 'w-72 -translate-x-full lg:translate-x-0 lg:w-16'
      }`}
    >
      <div className={`relative z-10 py-5 border-b border-[#1E293B]/20 flex items-center transition-all duration-300 ${
        isOpen ? 'px-6 justify-between' : 'px-0 justify-center'
      }`}>
        {isOpen ? (
          <Link to="/admin" className="flex items-center gap-3 hover:opacity-90 transition-opacity cursor-pointer shrink-0">
            <img src={nasaLogo} alt="NASAFILM Logo" className="h-7 w-auto object-contain rounded-lg" />
            <span className="text-lg font-black tracking-tight leading-none text-white">
              NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
            </span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B]/60 bg-[#121826] text-gray-250 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
            title="Mở rộng Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-[#1E293B]/60 bg-[#121826] text-gray-250 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
            title="Thu nhỏ Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="relative z-10 flex-1 py-5 px-4 space-y-6 overflow-y-auto no-scrollbar">
        {/* System Group */}
        <div>
          {isOpen && <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Hệ thống</div>}
          <div className="space-y-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-xs font-semibold ${
                  isOpen ? 'px-3 py-2 gap-3 justify-start' : 'p-2 justify-center'
                } ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-sky-400'}`} />
                  {isOpen && <span className="truncate">Tổng quan</span>}
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Content Group */}
        <div>
          {isOpen && <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Nội dung</div>}
          <div className="space-y-1">
            {[
              { to: '/admin/movies', icon: Film, label: 'Phim', colorClass: 'text-rose-400' },
              { to: '/admin/actors', icon: User, label: 'Diễn viên', colorClass: 'text-violet-400' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg transition-all duration-200 text-xs font-semibold ${
                      isOpen ? 'px-3 py-2 gap-3 justify-start' : 'p-2 justify-center'
                    } ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                  onClick={onClose}
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : item.colorClass}`} />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Operations Group */}
        <div>
          {isOpen && <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Vận hành</div>}
          <div className="space-y-1">
            {[
              { to: '/admin/showtimes', icon: Calendar, label: 'Lịch chiếu', colorClass: 'text-amber-400' },
              { to: '/admin/cinemas', icon: Tv, label: 'Rạp chiếu', colorClass: 'text-emerald-400' },
              { to: '/admin/combos', icon: Popcorn, label: 'Bắp nước', colorClass: 'text-yellow-400' },
              { to: '/admin/bookings', icon: Ticket, label: 'Đơn hàng', colorClass: 'text-orange-400' },
              { to: '/admin/vouchers', icon: Tag, label: 'Khuyến mãi', colorClass: 'text-pink-400' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg transition-all duration-200 text-xs font-semibold ${
                      isOpen ? 'px-3 py-2 gap-3 justify-start' : 'p-2 justify-center'
                    } ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                  onClick={onClose}
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : item.colorClass}`} />
                      {isOpen && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Users Group */}
        <div>
          {isOpen && <div className="px-3 mb-2 text-[9px] font-bold tracking-wider text-gray-500 uppercase">Người dùng</div>}
          <div className="space-y-1">
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center rounded-lg transition-all duration-200 text-xs font-semibold ${
                  isOpen ? 'px-3 py-2 gap-3 justify-start' : 'p-2 justify-center'
                } ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <Users className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                  {isOpen && <span className="truncate">Khách hàng</span>}
                </>
              )}
            </NavLink>
          </div>
        </div>
      </nav>

      <div className={`relative z-10 mt-auto border-t border-[#1A2238]/60 bg-black/20 transition-all duration-300 ${
        isOpen ? 'p-4' : 'p-2 flex justify-center'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black/40 border border-white/15 flex items-center justify-center overflow-hidden shrink-0" title={displayName}>
            <img
              alt="Admin Profile"
              className="w-full h-full object-cover"
              src={avatar}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          {isOpen && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[9px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">
                  {user?.roles?.includes('ADMIN') ? 'Quản trị viên' : user?.roles?.includes('STAFF') ? 'Nhân viên' : 'Quản trị viên'}
                </p>
              </div>
              <button 
                onClick={handleLogout} 
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/5 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="min-h-screen bg-[#0f172a] text-gray-100 overflow-hidden relative">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setSidebarOpen(prev => !prev)}
        onClose={() => {
          if (window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }} 
      />
      
      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      <main 
        ref={mainRef} 
        className={`min-h-screen flex flex-col overflow-y-auto custom-scrollbar relative z-10 bg-[#0f172a] transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-60' : 'lg:ml-16'
        }`}
      >
        {/* MOBILE STICKY HEADER WITH TOGGLE SIDEBAR BUTTON */}
        <div className="sticky top-0 z-40 w-full border-b border-[#1E293B]/60 bg-[#0B0F19]/90 backdrop-blur-[16px] shadow-sm lg:hidden">
          <div className="flex w-full items-center px-6 py-3 justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E293B]/60 bg-[#121826] text-gray-200 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
                title="Mở sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <Link to="/admin" className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer">
                <img src={nasaLogo} alt="NASAFILM Logo" className="h-6 w-auto object-contain rounded-lg" />
                <span className="text-sm font-black tracking-tight leading-none text-white">
                  NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
                </span>
              </Link>
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
