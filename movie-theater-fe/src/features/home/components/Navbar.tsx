import React, { useState } from 'react';
import { Bell, Menu, Search, ShieldCheck, ChevronDown, User, Wallet, Calendar, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';

const Navbar: React.FC = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0f172a]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8 lg:px-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center">
            <img src={nasaFilmLogo} alt="NASAFILM Logo" className="h-16 w-auto object-contain" />
          </Link>
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {['Phim', 'Rạp Chiếu', 'Ưu Đãi', 'VIP'].map((item) => (
            <a key={item} href="#" className="text-sm font-semibold text-white/80 transition-colors hover:text-white">
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <button className="hidden h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/70 transition hover:bg-white/10 md:flex">
            <Search className="h-4 w-4" />
            <span>Tìm phim, rạp</span>
          </button>

          <button className="hidden items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(220,38,38,0.35)] transition hover:bg-red-700 md:flex">
            Đặt Vé Ngay
          </button>

          <button className="hidden h-11 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-500 lg:flex">
            <Bell className="h-4 w-4" />
            <span>Thông báo</span>
          </button>

          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          {/* Auth controls: Login / Avatar + Logout + Admin link */}
          <AuthControls />
        </div>
      </div>
    </header>
  );
};

export default Navbar;

const AuthControls: React.FC = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isAdminOrStaff =
    user?.roles?.some((r) => r === 'admin' || r === 'staff') ?? false;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="hidden md:flex items-center ml-2">
        <Link
          to="/auth/login"
          className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/90 hover:bg-white/10 transition"
        >
          Đăng Nhập
        </Link>
      </div>
    );
  }

  const avatar = user.avatar || null;
  const displayName = user.fullName || user.email || '?';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 ml-2">
      {/* User profile dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 hover:bg-white/10 transition duration-200"
          title={displayName}
        >
          {/* Avatar or initial */}
          <div className="h-8 w-8 rounded-full overflow-hidden bg-violet-600/30 border border-white/20 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          
          {/* Username */}
          <span className="hidden sm:inline text-sm font-semibold text-white/90 max-w-[120px] truncate">
            {displayName}
          </span>
          
          {/* Chevron Arrow */}
          <ChevronDown className={`h-4 w-4 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop click-away trigger */}
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            
            {/* Dropdown list */}
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-[#0f172a]/95 border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              {isAdminOrStaff && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-600/20 transition-all duration-200"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Trang Admin</span>
                </Link>
              )}
              
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <User className="h-4 w-4" />
                <span>Tài khoản</span>
              </Link>
              
              <Link
                to="/wallet"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <Wallet className="h-4 w-4" />
                <span>Ví tiền</span>
              </Link>
              
              <Link
                to="/reminders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                <Calendar className="h-4 w-4" />
                <span>Nhắc hẹn</span>
              </Link>
              
              <div className="my-1 border-t border-white/5" />
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                disabled={isLoggingOut}
                className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

