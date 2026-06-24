import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Menu, ShieldCheck, ChevronDown, User, Wallet, Calendar, LogOut, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import { notificationService } from '../../../shared/services/notificationService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import { useNotification } from '../../../shared/context/NotificationContext';
import { prefetchOnlinePage, getCachedOnlineMovies } from '../utils/onlineMoviesCache';
import './Navbar.css';

const Navbar = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const handleBookingClick = () => {
    if (!user) {
      notificationService.warning("Bạn cần đăng nhập tài khoản Customer để sử dụng tính năng đặt vé.");
      navigate('/login');
    } else {
      notificationService.info("Vui lòng chọn phim hoặc rạp để xem lịch chiếu & đặt vé.");
      navigate('/movies');
    }
  };

  const handleOnlineNav = async (e) => {
    if (getCachedOnlineMovies()) return;
    e.preventDefault();
    try {
      await prefetchOnlinePage();
    } catch {
      // still navigate; page shows error state
    }
    navigate('/online');
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-logo-group">
          <Link to="/" className="navbar-logo-link gap-3">
            <img src={nasaFilmLogo} alt="NASAFILM Logo" className="navbar-logo-img" />
            <span className="font-heading text-2xl font-black leading-none tracking-wider text-white sm:text-3xl">
              NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
            </span>
          </Link>
        </div>

        <nav className="navbar-nav">
          <Link to="/movies" className="navbar-nav-link">Phim</Link>
          <Link to="/cinemas" className="navbar-nav-link">Rạp Chiếu</Link>
          <Link
            to="/online"
            className="navbar-nav-link"
            onClick={handleOnlineNav}
            onMouseEnter={prefetchOnlinePage}
            onFocus={prefetchOnlinePage}
            onTouchStart={prefetchOnlinePage}
          >
            Trực Tuyến
          </Link>
          <Link to="/offers" className="navbar-nav-link">Ưu Đãi</Link>
          <Link to="/about" className="navbar-nav-link">Giới Thiệu</Link>
        </nav>

        <div className="navbar-actions">
          <button
            onClick={handleBookingClick}
            className="relative hidden h-11 shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_15px_rgba(220,38,38,0.3)] transition-all duration-200 hover:scale-[1.02] hover:from-red-700 hover:to-red-600 active:scale-95 md:inline-flex"
          >
            <Star className="h-4 w-4 fill-white text-white" />
            <span>MUA VÉ</span>
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
  const [panelStyle, setPanelStyle] = useState(null);
  const anchorRef = useRef(null);
  const { notifications, markAllAsRead, clearAll } = useNotification();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = Math.min(416, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    setPanelStyle({
      top: rect.bottom + 8,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelStyle(null);
      return undefined;
    }

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition, notifications.length]);

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
    <div className="notif-bell-wrapper" ref={anchorRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="navbar-btn-notif relative"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="navbar-notif-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && panelStyle && createPortal(
        <>
          <div className="notif-dropdown-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            className="notif-dropdown-menu"
            style={panelStyle}
            role="dialog"
            aria-label="Thông báo"
          >
            <div className="notif-dropdown-header">
              <h3>Thông báo</h3>
              <div className="notif-dropdown-actions">
                {notifications.length > 0 && (
                  <>
                    <button type="button" onClick={handleMarkAllRead} className="notif-action-btn">
                      Đọc tất cả
                    </button>
                    <span className="divider">|</span>
                    <button type="button" onClick={handleClearAll} className="notif-action-btn">
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
                        <p className="notif-item-text mt-1">{notif.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
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
      navigate('/login');
    } catch (err) {
      console.error('[Navbar] Lỗi khi đăng xuất:', err);
      notificationService.error("Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.");
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="auth-login-wrapper">
        <Link
          to="/login"
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
          <ChevronDown className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
