import React, { useState, useEffect } from 'react';
import { Bell, Menu, ShieldCheck, ChevronDown, User, Wallet, Calendar, LogOut, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import { notificationService } from '../../../shared/services/notificationService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import { useNotification } from '../../../shared/context/NotificationContext';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const handleBookingClick = () => {
    if (!user) {
      notificationService.warning("Bạn cần đăng nhập tài khoản Customer để sử dụng tính năng đặt vé.");
      navigate('/auth/login');
    } else {
      notificationService.info("Vui lòng chọn phim hoặc rạp để xem lịch chiếu & đặt vé.");
      navigate('/movies');
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-logo-group">
          <Link to="/" className="navbar-logo-link gap-3">
            <img src={nasaFilmLogo} alt="NASAFILM Logo" className="navbar-logo-img" />
            <span className="font-heading text-3xl font-black tracking-wider leading-none text-white">
              NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
            </span>
          </Link>
        </div>

        <nav className="navbar-nav">
          <Link to="/movies" className="navbar-nav-link">Phim</Link>
          <Link to="/cinemas" className="navbar-nav-link">Rạp Chiếu</Link>
          <Link to="/offers" className="navbar-nav-link">Ưu Đãi</Link>
          <Link to="/about" className="navbar-nav-link">Giới Thiệu</Link>
        </nav>

        <div className="navbar-actions">


          <button 
            onClick={handleBookingClick} 
            className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-extrabold text-xs uppercase tracking-wider h-11 pl-4 pr-3.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_4px_15px_rgba(220,38,38,0.3)] hidden md:flex items-stretch"
          >
            {/* Left section (Star + Text) */}
            <span className="flex items-center gap-1.5 pr-3.5 border-r border-dashed border-white/30">
              <Star className="h-4 w-4 fill-white text-white" />
              <span>MUA VÉ</span>
            </span>
            
            {/* Right section (Hole punch dot) */}
            <span className="pl-3.5 pr-0.5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            </span>

            {/* Ticket Cutout Notch Top */}
            <span className="absolute top-0 right-[16px] -translate-y-1/2 w-3 h-3 rounded-full bg-[#0f0f0f]" />
            {/* Ticket Cutout Notch Bottom */}
            <span className="absolute bottom-0 right-[16px] translate-y-1/2 w-3 h-3 rounded-full bg-[#0f0f0f]" />
          </button>

          <NotificationBell />

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

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markAllAsRead, clearAll } = useNotification();
 
  const unreadCount = notifications.filter((n) => !n.read).length;
 
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };
 
  const handleMarkAllRead = () => {
    markAllAsRead();
  };
 
  const handleClearAll = () => {
    clearAll();
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      const dateStr = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return `${timeStr} - ${dateStr}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleToggle} 
        className="navbar-btn-notif relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="navbar-notif-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="notif-dropdown-menu">
            <div className="notif-dropdown-header">
              <h3>Thông báo</h3>
              <div className="notif-dropdown-actions">
                {notifications.length > 0 && (
                  <>
                    <button onClick={handleMarkAllRead} className="notif-action-btn">
                      Đọc tất cả
                    </button>
                    <span className="divider">|</span>
                    <button onClick={handleClearAll} className="notif-action-btn">
                      Xóa hết
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="notif-dropdown-content">
              {notifications.length === 0 ? (
                <div className="notif-empty-state">
                  <Bell className="h-8 w-8 text-white/20 mb-2" />
                  <p>Không có thông báo mới nào</p>
                </div>
              ) : (
                <div className="notif-list-items">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`notif-item ${notif.read ? 'read' : 'unread'} ${notif.type}`}
                    >
                      <div className="notif-item-dot" />
                      <div className="notif-item-body">
                        <div className="notif-item-title-row">
                          <span className="notif-item-title">{notif.title}</span>
                          <span className="notif-item-time">{formatTime(notif.timestamp)}</span>
                        </div>
                        <p className="notif-item-text">{notif.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AuthControls = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatar = avatarLoadFailed ? null : normalizeAvatarUrl(user?.avatar);

  const isAdminOrStaff =
    user?.roles?.some((r) => r === 'admin' || r === 'staff') ?? false;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  const handleLogout = async () => {
    setIsOpen(false);
    setIsLoggingOut(true);
    try {
      await logout();
      console.log("[Navbar] Đăng xuất thành công. Chuyển hướng người dùng về trang đăng nhập.");
      navigate('/auth/login');
    } catch (err) {
      console.error('[Navbar] Lỗi khi đăng xuất:', err);
      notificationService.error("Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.");
      navigate('/auth/login');
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
              <img
                src={avatar}
                alt="avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadFailed(true)}
              />
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
                <span>Thông tin cá nhân</span>
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

export default Navbar;
