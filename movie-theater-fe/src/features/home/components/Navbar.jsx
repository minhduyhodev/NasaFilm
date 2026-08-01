import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Menu, ShieldCheck, ChevronDown, User, Wallet, Calendar, LogOut, Star, Loader2, Play, Film, UsersRound, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import { notificationService } from '../../../shared/services/notificationService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import { useNotification } from '../../../shared/context/NotificationContext';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { logger } from '../../../shared/utils/logger';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';
import { prefetchOnlinePage, getCachedOnlineMovies } from '../utils/onlineMoviesCache';
import GlobalSearchBar from './GlobalSearchBar';
import OrbitJoinInput from './OrbitJoinInput';
import ThemeToggle from '../../../shared/components/ThemeToggle';
import './Navbar.css';

const CATALOG_MENUS = {
  genre: {
    label: 'Thể loại',
    buildLink: (uuid) => `/movies?genre=${uuid}`,
    pickItems: (data) => data?.genres || [],
  },
  country: {
    label: 'Quốc gia',
    buildLink: (uuid) => `/movies?country=${uuid}`,
    pickItems: (data) => data?.countries || [],
  },
};

const getCatalogColumnCount = (itemCount) => {
  if (itemCount <= 4) return 2;
  if (itemCount <= 9) return 3;
  if (itemCount <= 16) return 4;
  if (itemCount <= 25) return 5;
  return 6;
};

const splitIntoColumns = (items, columnCount) => {
  if (!items.length) return [];
  const cols = Math.min(columnCount, items.length);
  const perCol = Math.ceil(items.length / cols);
  return Array.from({ length: cols }, (_, index) =>
    items.slice(index * perCol, (index + 1) * perCol),
  ).filter((column) => column.length > 0);
};

const NavCatalogPanel = ({ variant, onClose }) => {
  const meta = CATALOG_MENUS[variant];
  const { data, isLoading, isError } = useMovieFilterOptions();

  const { columns, columnCount } = useMemo(() => {
    const items = meta.pickItems(data);
    const count = getCatalogColumnCount(items.length);
    return {
      columns: splitIntoColumns(items, count),
      columnCount: count,
    };
  }, [data, meta]);

  return (
    <div className="nav-catalog-panel" role="menu" aria-label={meta.label}>
      <div className="nav-catalog-panel-inner">
        {isLoading ? (
          <div className="nav-catalog-state">
            <Loader2 className="h-5 w-5 animate-spin text-red-500" aria-hidden />
            <span>Đang tải danh mục...</span>
          </div>
        ) : isError ? (
          <div className="nav-catalog-state">Không thể tải danh mục. Vui lòng thử lại sau.</div>
        ) : columns.length === 0 ? (
          <div className="nav-catalog-state">Chưa có dữ liệu.</div>
        ) : (
          <div
            className="nav-catalog-columns"
            style={{ '--nav-catalog-cols': columnCount }}
          >
            {columns.map((column, columnIndex) => (
              <ul key={columnIndex} className="nav-catalog-list">
                {column.map((item) => (
                  <li key={item.uuid}>
                    <Link
                      to={meta.buildLink(item.uuid)}
                      className="nav-catalog-link"
                      role="menuitem"
                      onClick={onClose}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OrbitJoinDialog = ({ onClose }) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="orbit-join-dialog" role="presentation">
      <button
        type="button"
        className="orbit-join-dialog__backdrop"
        aria-label="Đóng cửa sổ tham gia nhóm"
        onClick={onClose}
      />
      <div
        className="orbit-join-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Tham gia phòng Orbit"
      >
        <button
          type="button"
          className="orbit-join-dialog__close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X aria-hidden />
        </button>
        <OrbitJoinInput autoFocus />
      </div>
    </div>,
    document.body,
  );
};

const Navbar = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [openCatalog, setOpenCatalog] = useState(null);
  const [showBookingDropdown, setShowBookingDropdown] = useState(false);
  const [showOrbitJoinDialog, setShowOrbitJoinDialog] = useState(false);
  const closeCatalogTimerRef = useRef(null);

  useEffect(() => {
    setOpenCatalog(null);
    setShowBookingDropdown(false);
    setShowOrbitJoinDialog(false);
  }, [location.pathname, location.search]);

  const handleLinkClick = (e, path) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isLinkActive = (path, type) => {
    if (type === 'genre') {
      return location.pathname === '/movies' && location.search.includes('genre');
    }
    if (type === 'country') {
      return location.pathname === '/movies' && location.search.includes('country');
    }
    if (path === '/movies') {
      return location.pathname === '/movies' && !location.search.includes('genre') && !location.search.includes('country');
    }
    return location.pathname === path;
  };

  useEffect(() => {
    return () => {
      if (closeCatalogTimerRef.current) {
        window.clearTimeout(closeCatalogTimerRef.current);
      }
    };
  }, []);

  const openCatalogMenu = (key) => {
    if (closeCatalogTimerRef.current) {
      window.clearTimeout(closeCatalogTimerRef.current);
    }
    setOpenCatalog(key);
  };

  const scheduleCloseCatalogMenu = () => {
    if (closeCatalogTimerRef.current) {
      window.clearTimeout(closeCatalogTimerRef.current);
    }
    closeCatalogTimerRef.current = window.setTimeout(() => {
      setOpenCatalog(null);
    }, 120);
  };

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
    e.preventDefault();
    if (!getCachedOnlineMovies()) {
      try {
        await prefetchOnlinePage();
      } catch {
        // still navigate; page shows error state
      }
    }
    navigate('/online');
  };

  return (
    <header className={`navbar-header${openCatalog ? ' navbar-header--menu-open' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo-group">
          <Link to="/" className="navbar-logo-link gap-3" onClick={(e) => handleLinkClick(e, '/')}>
            <img src={nasaFilmLogo} alt="NASAFILM Logo" className="navbar-logo-img" />
            <span className="navbar-logo-text font-heading hidden sm:inline font-black leading-none tracking-wider text-white">
              NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
            </span>
          </Link>
        </div>

        <div className="navbar-center">
          <nav className="navbar-nav">
            <Link
              to="/movies"
              className={`navbar-nav-link ${isLinkActive('/movies') ? 'navbar-nav-link--active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/movies')}
            >
              Phim
            </Link>
            {Object.entries(CATALOG_MENUS).map(([key, menu]) => {
              const isOpen = openCatalog === key;
              const isActive = isLinkActive(null, key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`navbar-nav-link nav-catalog-trigger${isOpen ? ' nav-catalog-trigger--open' : ''}${isActive ? ' navbar-nav-link--active' : ''}`}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  onMouseEnter={() => openCatalogMenu(key)}
                  onMouseLeave={scheduleCloseCatalogMenu}
                  onFocus={() => openCatalogMenu(key)}
                  onBlur={scheduleCloseCatalogMenu}
                >
                  {menu.label}
                  <ChevronDown className={`nav-catalog-chevron${isOpen ? ' nav-catalog-chevron--open' : ''}${isActive ? ' nav-catalog-chevron--active' : ''}`} aria-hidden />
                </button>
              );
            })}
            <Link
              to="/cinemas"
              className={`navbar-nav-link ${isLinkActive('/cinemas') ? 'navbar-nav-link--active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/cinemas')}
            >
              Rạp Chiếu
            </Link>
            <Link
              to="/offers"
              className={`navbar-nav-link ${isLinkActive('/offers') ? 'navbar-nav-link--active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/offers')}
            >
              Bắp Nước
            </Link>
            <Link
              to="/about"
              className={`navbar-nav-link ${isLinkActive('/about') ? 'navbar-nav-link--active' : ''}`}
              onClick={(e) => handleLinkClick(e, '/about')}
            >
              Giới Thiệu
            </Link>
          </nav>

          <GlobalSearchBar className="navbar-search hidden lg:block" />
        </div>

        <div className="navbar-actions">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBookingDropdown((prev) => !prev)}
              className="navbar-cta-btn inline-flex items-center gap-1.5"
            >
              <Star className="h-4 w-4 fill-white text-white" />
              <span>MUA VÉ</span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-white/80 transition-transform duration-200 ${showBookingDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showBookingDropdown && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                  aria-label="Đóng menu mua vé"
                  onClick={() => setShowBookingDropdown(false)}
                />
                <div
                  className="navbar-booking-menu absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl border border-white/10 bg-[#0f0f0f]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                  role="menu"
                  aria-label="Tùy chọn mua vé"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowBookingDropdown(false);
                      handleBookingClick();
                    }}
                    className="navbar-booking-option"
                  >
                    <Film className="navbar-booking-option__icon" aria-hidden />
                    <span>Mua vé tại rạp</span>
                  </button>

                  <Link
                    to="/online"
                    role="menuitem"
                    onClick={(e) => {
                      setShowBookingDropdown(false);
                      handleOnlineNav(e);
                      handleLinkClick(e, '/online');
                    }}
                    onMouseEnter={prefetchOnlinePage}
                    onFocus={prefetchOnlinePage}
                    onTouchStart={prefetchOnlinePage}
                    className={`navbar-booking-option${isLinkActive('/online') ? ' navbar-booking-option--active' : ''}`}
                  >
                    <Play className="navbar-booking-option__icon navbar-booking-option__icon--fill" aria-hidden />
                    <span>Trực tuyến</span>
                  </Link>

                  <div className="navbar-booking-menu__divider" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowBookingDropdown(false);
                      setShowOrbitJoinDialog(true);
                    }}
                    className="navbar-booking-option"
                  >
                    <UsersRound className="navbar-booking-option__icon" aria-hidden />
                    <span>Tham gia nhóm</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <ThemeToggle className="navbar-theme-toggle" />

          <NotificationBell />

          <button className="navbar-btn-menu">
            <Menu className="h-5 w-5" />
          </button>

          {/* Auth controls: Login / Avatar + Logout + Admin link */}
          <AuthControls />
        </div>
      </div>

      {openCatalog && (
        <>
          <button
            type="button"
            className="nav-catalog-backdrop"
            aria-label="Đóng menu danh mục"
            onClick={() => setOpenCatalog(null)}
          />
          <div
            onMouseEnter={() => {
              if (closeCatalogTimerRef.current) {
                window.clearTimeout(closeCatalogTimerRef.current);
              }
            }}
            onMouseLeave={scheduleCloseCatalogMenu}
          >
            <NavCatalogPanel variant={openCatalog} onClose={() => setOpenCatalog(null)} />
          </div>
        </>
      )}

      {showOrbitJoinDialog && (
        <OrbitJoinDialog onClose={() => setShowOrbitJoinDialog(false)} />
      )}
    </header>
  );
};

const NotificationBell = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
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

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Xóa tất cả thông báo',
      message: 'Bạn có chắc muốn xóa toàn bộ thông báo? Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa tất cả',
      variant: 'danger',
    });
    if (!ok) return;
    clearAll();
  };

  const handleNotificationClick = (notif) => {
    if (!notif.actionUrl) {
      return;
    }
    setIsOpen(false);
    navigate(notif.actionUrl);
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
    } catch {
      return '';
    }
  };

  return (
    <div
      className="notif-bell-wrapper"
      ref={anchorRef}
    >
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
                      className={`notif-item ${notif.read ? 'read' : 'unread'} ${notif.type} ${notif.actionUrl ? 'notif-item--actionable' : ''}`}
                      role={notif.actionUrl ? 'button' : undefined}
                      tabIndex={notif.actionUrl ? 0 : undefined}
                      onClick={() => handleNotificationClick(notif)}
                      onKeyDown={(event) => {
                        if (!notif.actionUrl) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleNotificationClick(notif);
                        }
                      }}
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
  const confirm = useConfirm();
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const closeTimerRef = useRef(null);
  const avatar = avatarLoadFailed ? null : normalizeAvatarUrl(user?.avatar);

  const isAdminOrStaff =
    user?.roles?.some((r) => r === 'admin' || r === 'staff') ?? false;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    setIsOpen(true);
  };

  const scheduleCloseMenu = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 80);
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      confirmLabel: 'Đăng xuất',
      variant: 'warning',
    });
    if (!ok) return;

    setIsOpen(false);
    setIsLoggingOut(true);
    try {
      await logout();
      logger.info("[Navbar] Đăng xuất thành công. Chuyển hướng người dùng về trang đăng nhập.");
      navigate('/login');
    } catch (err) {
      logger.error('[Navbar] Lỗi khi đăng xuất:', err);
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
      <div
        className="relative"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleCloseMenu}
      >
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
            <div className="dropdown-menu-list" onMouseEnter={openMenu} onMouseLeave={scheduleCloseMenu}>
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
                to="/my-movies"
                onClick={() => setIsOpen(false)}
                className="dropdown-menu-link"
              >
                <Star className="h-4 w-4" />
                <span>Phim của tôi</span>
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
