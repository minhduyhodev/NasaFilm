import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import './GuestAuthPromo.css';

const AUTH_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/activate-account',
  '/auth',
];

const FLOATING_DISMISS_KEY = 'nasa_guest_auth_bar_dismissed_until';
const FLOATING_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const isAuthRoute = (pathname) =>
  AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const useGuestPromoVisible = () => {
  const { isAuthenticated, loading } = useAuthContext();
  const location = useLocation();

  if (loading || isAuthenticated || isAuthRoute(location.pathname)) {
    return false;
  }

  return true;
};

export const GuestAuthPromoBanner = ({ className = '' }) => {
  const visible = useGuestPromoVisible();
  const location = useLocation();

  if (!visible) return null;

  const registerTarget = {
    pathname: '/register',
    state: { from: location },
  };

  const loginTarget = {
    pathname: '/login',
    state: { from: location },
  };

  return (
    <section className={`guest-auth-promo ${className}`.trim()} aria-label="Khuyến khích đăng ký tài khoản">
      <div className="guest-auth-promo__inner">
        <div className="guest-auth-promo__copy">
          <h3 className="guest-auth-promo__title">Không bỏ lỡ phim hay</h3>
          <p className="guest-auth-promo__desc">
            Đăng ký tài khoản để lưu phim yêu thích, đặt vé nhanh hơn và nhận thông báo suất chiếu cùng ưu đãi dành riêng cho bạn.
          </p>
        </div>

        <div className="guest-auth-promo__actions">
          <Link to={loginTarget} className="guest-auth-promo__btn guest-auth-promo__btn--ghost">
            Đăng nhập
          </Link>
          <Link to={registerTarget} className="guest-auth-promo__btn guest-auth-promo__btn--primary">
            Đăng ký
          </Link>
        </div>
      </div>
    </section>
  );
};

export const GuestAuthPromoBar = () => {
  const visible = useGuestPromoVisible();
  const location = useLocation();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(FLOATING_DISMISS_KEY) || 0);
      setIsDismissed(Date.now() < until);
    } catch {
      setIsDismissed(false);
    }
  }, []);

  if (!visible || isDismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(FLOATING_DISMISS_KEY, String(Date.now() + FLOATING_DISMISS_MS));
    } catch {
      // ignore
    }
    setIsDismissed(true);
  };

  const registerTarget = {
    pathname: '/register',
    state: { from: location },
  };

  const loginTarget = {
    pathname: '/login',
    state: { from: location },
  };

  return (
    <aside className="guest-auth-promo-bar" role="dialog" aria-label="Nhắc đăng nhập">
      <div className="guest-auth-promo-bar__inner">
        <p className="guest-auth-promo-bar__text">
          Tham gia NASAFILM để lưu phim, đặt vé và nhận ưu đãi thành viên.
        </p>
        <div className="guest-auth-promo-bar__actions">
          <Link to={loginTarget} className="guest-auth-promo-bar__link">
            Đăng nhập
          </Link>
          <Link to={registerTarget} className="guest-auth-promo-bar__cta">
            Đăng ký ngay
          </Link>
          <button
            type="button"
            className="guest-auth-promo-bar__close"
            onClick={dismiss}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

const GuestAuthPromo = GuestAuthPromoBanner;

export default GuestAuthPromo;
