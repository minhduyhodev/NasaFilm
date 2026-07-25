import { ArrowUpRight, Headphones, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import './Footer.css';

const experienceLinks = [
  { label: 'Phim đang chiếu', to: '/movies' },
  { label: 'Phim trực tuyến', to: '/online' },
  { label: 'Hệ thống rạp', to: '/cinemas' },
  { label: 'Ưu đãi & combo', to: '/offers' },
  { label: 'Về NASAFILM', to: '/about' },
];

const supportLinks = [
  { label: 'Câu hỏi thường gặp', to: '/faq' },
  { label: 'Chính sách thanh toán', to: '/payment-policy' },
  { label: 'Chính sách hoàn vé', to: '/refund-policy' },
  { label: 'Quyền riêng tư', to: '/privacy' },
  { label: 'Điều khoản sử dụng', to: '/terms' },
];

const Footer = () => {
  return (
    <footer className="footer-wrapper">
      <div className="footer-glow" />
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-brand-logo">
              <img src={nasaFilmLogo} alt="NASAFILM" className="footer-logo-img" />
              <span className="footer-brand-name">
                NASA<span>FILM</span>
              </span>
            </Link>
            <p className="footer-brand-kicker">Cinema · Streaming · Community</p>
            <p className="footer-brand-text">
              Một hành trình điện ảnh thống nhất — từ khám phá phim, chọn ghế,
              thanh toán đến quản lý vé và trải nghiệm sau suất chiếu.
            </p>
            <div className="footer-live-note">
              <Radio size={14} aria-hidden="true" />
              <span>Nền tảng đang tiếp tục được hoàn thiện</span>
            </div>
          </div>

          <div className="footer-col">
            <h2 className="footer-col-title">Trải nghiệm</h2>
            <ul className="footer-links-list">
              {experienceLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="footer-link-item">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h2 className="footer-col-title">Hỗ trợ & pháp lý</h2>
            <ul className="footer-links-list">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="footer-link-item">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-support-card">
            <Headphones size={22} aria-hidden="true" />
            <p className="footer-support-label">Cần trợ giúp?</p>
            <h2>Thông tin vé, thanh toán và tài khoản ở cùng một nơi.</h2>
            <Link to="/faq" className="footer-support-link">
              Mở trung tâm hỗ trợ <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="footer-divider" />
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} NASAFILM. Trải nghiệm điện ảnh, được kết nối.</p>
          <div className="footer-bottom-links">
            <Link to="/terms">Điều khoản</Link>
            <Link to="/privacy">Quyền riêng tư</Link>
            <Link to="/refund-policy">Hoàn vé</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
