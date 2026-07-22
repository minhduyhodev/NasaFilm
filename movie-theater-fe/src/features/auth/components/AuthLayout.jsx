import { motion } from 'framer-motion';
import { CinemaAuthBackground } from './CinemaAuthBackground';
import { useCosmosHomeTransition } from './CosmosHomeTransition.jsx';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import './AuthLayout.css';

export const AuthLayout = ({
  children,
  showHero = true,
  heroTitle = 'NASAFILM',
  heroDescription = 'Trải nghiệm những bộ phim hay nhất, trên màn ảnh lớn gần bạn nhất.',
  tagline = 'Điện ảnh. Không khoảng cách.',
}) => {
  const { startTransition } = useCosmosHomeTransition({
    to: '/',
    durationMs: 3400,
  });

  const brand = heroTitle.replace(/\s/g, '');
  const nasaPart = brand.toUpperCase().startsWith('NASA') ? 'NASA' : brand.slice(0, 4);
  const filmPart = brand.toUpperCase().startsWith('NASA')
    ? brand.slice(4) || 'FILM'
    : brand.slice(4);

  const BrandBlock = ({ compact = false, showCopy = true, onScreen = false }) => (
    <div
      className={[
        'auth-cinema__brand-block',
        compact ? 'auth-cinema__brand-block--compact' : '',
        onScreen ? 'auth-cinema__brand-block--on-screen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a
        href="/"
        className="auth-cinema__brand"
        aria-label="NASAFILM — về trang chủ"
        onClick={startTransition}
      >
        <img
          src={nasaFilmLogo}
          alt=""
          className={`auth-cinema__logo${compact ? ' auth-cinema__logo--compact' : ''}`}
          width={compact ? 48 : 72}
          height={compact ? 48 : 72}
        />
        <span className="auth-cinema__wordmark">
          <span className="auth-cinema__brand-nasa">{nasaPart}</span>
          <span className="auth-cinema__brand-film">{filmPart || 'FILM'}</span>
        </span>
      </a>

      {showCopy ? (
        <>
          <p className="auth-cinema__tagline">{tagline}</p>
          <p className="auth-cinema__desc">{heroDescription}</p>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="auth-cinema">
      <CinemaAuthBackground />

      {showHero ? (
        <div className="auth-cinema__screen-plane">
          <BrandBlock showCopy onScreen />
        </div>
      ) : null}

      <div className="auth-cinema__content">
        {showHero ? (
          <div className="auth-cinema__grid">
            <motion.div
              className="auth-cinema__panel"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="auth-cinema__brand-mobile">
                <BrandBlock showCopy={false} />
              </div>
              <div className="auth-cinema__form-slot">{children}</div>
            </motion.div>

            <aside className="auth-cinema__hero" aria-hidden="true" />
          </div>
        ) : (
          <motion.div
            className="auth-cinema__centered"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <a
              href="/"
              className="auth-cinema__brand auth-cinema__brand--compact"
              aria-label="NASAFILM — về trang chủ"
              onClick={startTransition}
            >
              <img
                src={nasaFilmLogo}
                alt=""
                className="auth-cinema__logo auth-cinema__logo--compact"
                width={48}
                height={48}
              />
              <span className="auth-cinema__wordmark">
                <span className="auth-cinema__brand-nasa">NASA</span>
                <span className="auth-cinema__brand-film">FILM</span>
              </span>
            </a>
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
