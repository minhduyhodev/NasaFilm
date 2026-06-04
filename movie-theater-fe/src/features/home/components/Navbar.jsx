import React, { useState } from 'react';
import { Bell, Menu, Search, ShieldCheck, ChevronDown, User, Wallet, Calendar, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import './Navbar.css';

const Navbar = () => {
  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-logo-group">
          <Link to="/" className="navbar-logo-link">
            <img src={nasaFilmLogo} alt="NASAFILM Logo" className="navbar-logo-img" />
          </Link>
        </div>

        <nav className="navbar-nav">
          <Link to="/" className="navbar-nav-link">Phim</Link>
          <a href="#" className="navbar-nav-link">Rạp Chiếu</a>
          <a href="#" className="navbar-nav-link">Ưu Đãi</a>
          <a href="#" className="navbar-nav-link">VIP</a>
          <Link to="/about" className="navbar-nav-link">Giới Thiệu</Link>
        </nav>

        <div className="navbar-actions">
          <button className="navbar-btn-search">
            <Search className="h-4 w-4" />
            <span>Tìm phim, rạp</span>
          </button>

          <button className="navbar-btn-booking">
            Đặt Vé Ngay
          </button>

          <button className="navbar-btn-notif">
            <Bell className="h-4 w-4" />
            <span>Thông báo</span>
          </button>

          <button className="navbar-btn-menu">
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

const AuthControls = () => {
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
      <div className="auth-login-wrapper">
        <Link
          to="/auth/login"
          className="auth-login-link"
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
    <div className="auth-controls-container">
      {/* User profile dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="user-profile-trigger"
          title={displayName}
        >
          {/* Avatar or initial */}
          <div className="user-avatar">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          
          {/* Username */}
          <span className="user-name">
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
            <div className="dropdown-menu-list">
              {isAdminOrStaff && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="dropdown-admin-link"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Trang Admin</span>
                </Link>
              )}
              
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="dropdown-menu-link"
              >
                <User className="h-4 w-4" />
                <span>Tài khoản</span>
              </Link>
              
              <Link
                to="/wallet"
                onClick={() => setIsOpen(false)}
                className="dropdown-menu-link"
              >
                <Wallet className="h-4 w-4" />
                <span>Ví tiền</span>
              </Link>
              
              <Link
                to="/reminders"
                onClick={() => setIsOpen(false)}
                className="dropdown-menu-link"
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
                className="dropdown-logout-btn"
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
