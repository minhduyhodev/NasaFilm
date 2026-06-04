import React, { useState } from 'react';
import { Bell, Menu, Search, ShieldCheck } from 'lucide-react';
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
      {/* Admin Panel shortcut — only for admin/staff roles */}
      {isAdminOrStaff && (
        <Link
          to="/admin"
          className="hidden lg:flex h-9 items-center gap-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 px-3 text-xs font-semibold text-violet-300 hover:bg-violet-600/30 transition"
          title="Quản trị hệ thống"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </Link>
      )}

      {/* User avatar / initials */}
      <button
        onClick={() => navigate('/profile')}
        className="h-10 w-10 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center text-sm font-semibold hover:bg-white/20 transition"
        title={displayName}
      >
        {avatar ? (
          <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white">{initial}</span>
        )}
      </button>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoggingOut ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang thoát...
          </span>
        ) : (
          'Đăng Xuất'
        )}
      </button>
    </div>
  );
};

