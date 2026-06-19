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
  Popcorn,
  ChevronDown,
  ChevronRight,
  Sliders,
  Shield,
  Home,
  Database,
  TrendingUp,
  UserCheck,
  DollarSign
} from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import './AdminLayout.css';

const Sidebar = ({ isOpen, onToggle, onClose }) => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || 'ADMIN';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatar = avatarLoadFailed ? huyAdmin : normalizeAvatarUrl(user?.avatar) || huyAdmin;

  const [openGroups, setOpenGroups] = useState({
    content: true,
    facility: true,
    business: true,
    hrm: true,
    security: true
  });

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const renderLink = (to, Icon, label, colorClass = 'text-gray-400') => (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        `flex items-center rounded-lg transition-all duration-200 text-xs font-semibold ${
          isOpen ? 'px-3 py-2.5 gap-3 justify-start' : 'p-2 justify-center'
        } ${
          isActive
            ? 'bg-amber-500/15 text-amber-450 border border-amber-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`
      }
      onClick={onClose}
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-amber-450' : colorClass}`} />
          {isOpen && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );

  const renderGroupHeader = (title, groupKey, Icon) => {
    if (!isOpen) return null;
    const isGroupOpen = openGroups[groupKey];
    return (
      <button
        type="button"
        onClick={() => toggleGroup(groupKey)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase hover:text-white transition-colors cursor-pointer select-none border-none bg-transparent"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span>{title}</span>
        </span>
        {isGroupOpen ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
      </button>
    );
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-[#0B0F19] border-r border-[#1E293B]/20 flex flex-col overflow-hidden transition-all duration-300 ${
        isOpen 
          ? 'w-64 translate-x-0' 
          : 'w-72 -translate-x-full lg:translate-x-0 lg:w-16'
      }`}
    >
      {/* Sidebar Header Brand */}
      <div className={`relative z-10 py-5 border-b border-[#1E293B]/20 flex items-center transition-all duration-300 ${
        isOpen ? 'px-6 justify-between' : 'px-0 justify-center'
      }`}>
        {isOpen ? (
          <Link to="/admin" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer shrink-0">
            <img src={nasaLogo} alt="NASAFILM Logo" className="h-7 w-7 rounded-lg object-cover shadow-md" />
            <span className="text-lg font-black tracking-tight leading-none text-white font-sans">
              NASA<span className="text-red-500">Film</span>
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 tracking-wider uppercase ml-1 shrink-0 font-mono">
              ADMIN
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

      {/* Navigation list */}
      <nav className="relative z-10 flex-1 py-5 px-4 space-y-6 overflow-y-auto no-scrollbar">
        
        {/* Dashboard Link (Direct link) */}
        <div className="space-y-1">
          {renderLink('/admin', LayoutDashboard, 'DASHBOARD', 'text-sky-400')}
        </div>

        {/* Content Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader('Quản lý nội dung', 'content', Film)}
          {(!isOpen || openGroups.content) && (
            <div className={`${isOpen ? 'pl-2 border-l border-[#1E293B]/10 ml-4.5 space-y-1' : 'space-y-1'}`}>
              {renderLink('/admin/movies', Film, 'Quản lý phim', 'text-rose-400')}
              {renderLink('/admin/actors', User, 'Diễn viên', 'text-violet-400')}
              {renderLink('/admin/vouchers', Tag, 'Sự kiện & Khuyến mãi', 'text-pink-400')}
            </div>
          )}
        </div>

        {/* Facility Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader('Quản lý cơ sở', 'facility', Tv)}
          {(!isOpen || openGroups.facility) && (
            <div className={`${isOpen ? 'pl-2 border-l border-[#1E293B]/10 ml-4.5 space-y-1' : 'space-y-1'}`}>
              {renderLink('/admin/cinemas', Tv, 'Cụm rạp & Phòng chiếu', 'text-emerald-400')}
              {renderLink('/admin/showtimes', Calendar, 'Quản lý suất chiếu', 'text-amber-400')}
            </div>
          )}
        </div>

        {/* Business Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader('Vận hành kinh doanh', 'business', Ticket)}
          {(!isOpen || openGroups.business) && (
            <div className={`${isOpen ? 'pl-2 border-l border-[#1E293B]/10 ml-4.5 space-y-1' : 'space-y-1'}`}>
              {renderLink('/admin/bookings', Ticket, 'Quản lý vé bán', 'text-orange-400')}
              {renderLink('/admin/combos/revenue', TrendingUp, 'Doanh thu bắp nước', 'text-emerald-500')}
              {renderLink('/admin/combos', Popcorn, 'Danh mục bắp nước', 'text-yellow-400')}
            </div>
          )}
        </div>

        {/* Human Resource Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader('Nhân sự & Khách hàng', 'hrm', Users)}
          {(!isOpen || openGroups.hrm) && (
            <div className={`${isOpen ? 'pl-2 border-l border-[#1E293B]/10 ml-4.5 space-y-1' : 'space-y-1'}`}>
              {renderLink('/admin/users', Users, 'Danh sách khách hàng', 'text-cyan-400')}
              {renderLink('/admin/staff', UserCheck, 'Quản lý nhân sự', 'text-indigo-400')}
            </div>
          )}
        </div>

        {/* System Settings Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader('Cấu hình & Bảo mật', 'security', Shield)}
          {(!isOpen || openGroups.security) && (
            <div className={`${isOpen ? 'pl-2 border-l border-[#1E293B]/10 ml-4.5 space-y-1' : 'space-y-1'}`}>
              {renderLink('/admin/config', Sliders, 'Cấu hình hệ thống', 'text-amber-400')}
            </div>
          )}
        </div>

      </nav>

      {/* User profile footer */}
      <div className={`relative z-10 mt-auto border-t border-[#1E293B]/20 bg-black/20 transition-all duration-300 ${
        isOpen ? 'p-4' : 'p-2 flex justify-center'
      }`}>
        <div className="flex items-center gap-3 mb-4">
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
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-black text-white truncate leading-tight">Quản trị viên Lora</p>
              <p className="text-[9px] text-gray-400 font-bold tracking-wider uppercase mt-0.5">
                QUẢN TRỊ VIÊN
              </p>
            </div>
          )}
        </div>
        
        {isOpen && (
          <div className="flex items-center justify-center border-t border-[#1E293B]/40 pt-3 text-[11px] font-bold font-mono">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-0 font-bold font-mono"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
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
    <div className="min-h-screen bg-[#080B14] text-gray-100 overflow-hidden relative">
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
        className={`min-h-screen flex flex-col overflow-y-auto custom-scrollbar relative z-10 bg-[#080B14] transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
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
                <img src={nasaLogo} alt="NASAFILM Logo" className="h-6 w-6 rounded-md object-cover shadow-sm" />
                <span className="text-sm font-black tracking-tight leading-none text-white font-sans">
                  NASA<span className="text-red-500">Film</span>
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
