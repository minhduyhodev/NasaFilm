import React from 'react';
import { Facebook, Instagram, Youtube, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import nasaFilmLogo from '../../../shared/assets/NASAFILM.jpg';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-wrapper">
      {/* Background glow decorative effect */}
      <div className="footer-glow" />

      <div className="footer-container">
        <div className="footer-grid">

          {/* Brand Info Column */}
          <div className="footer-col">
            <Link to="/" className="footer-brand-logo group">
              <img src={nasaFilmLogo} alt="NASAFILM Logo" className="footer-logo-img" />
              <div className="flex flex-col">
                <span className="footer-brand-name text-lg">
                  NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Film</span>
                </span>
              </div>
            </Link>
            <p className="footer-brand-text">
              Trải nghiệm điện ảnh đỉnh cao với công nghệ chiếu phim IMAX hiện đại bậc nhất và hệ thống âm thanh vòm Dolby Atmos sống động.
            </p>
            {/* Social media icons */}
            <div className="footer-social-list">
              {[
                { icon: <Facebook size={18} />, href: '#', name: 'Facebook', hoverColor: 'hover:text-blue-500 hover:border-blue-500/30' },
                { icon: <Instagram size={18} />, href: '#', name: 'Instagram', hoverColor: 'hover:text-pink-500 hover:border-pink-500/30' },
                { icon: <Youtube size={18} />, href: '#', name: 'Youtube', hoverColor: 'hover:text-red-500 hover:border-red-500/30' }
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all duration-300 hover:bg-white/10 ${social.hoverColor} hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]`}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h3 className="footer-col-title">Khám Phá</h3>
            <ul className="footer-links-list">
              {[
                { label: 'Phim Đang Chiếu', to: '/movies' },
                { label: 'Phim Sắp Chiếu', to: '/movies?tab=coming-soon' },
                { label: 'Lịch Chiếu Toàn Rạp', to: '/cinemas' },
                { label: 'Combo Bắp Nước', to: '/offers' },
                { label: 'Phòng Chiếu VIP', to: '/offers' },
                { label: 'Giới Thiệu CINE LUXE', to: '/about' }
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="footer-link-item group"
                  >
                    <span className="footer-link-dot" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Help Column */}
          <div className="footer-col">
            <h3 className="footer-col-title">Chính Sách & Hỗ Trợ</h3>
            <ul className="footer-links-list">
              {[
                { label: 'Điều Khoản Sử Dụng', to: '/terms' },
                { label: 'Chính Sách Bảo Mật', to: '/privacy' },
                { label: 'Chính Sách Thanh Toán', to: '/payment-policy' },
                { label: 'Chính Sách Hoàn Vé', to: '/refund-policy' },
                { label: 'Câu Hỏi Thường Gặp', to: '/faq' }
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="footer-link-item group"
                  >
                    <span className="footer-link-dot" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Branches Column */}
          <div className="footer-col">
            <h3 className="footer-col-title">Liên Hệ</h3>
            <ul className="footer-contact-list">
              <li className="footer-contact-item">
                <MapPin className="footer-contact-icon" />
                <span className="leading-relaxed">
                  Tòa nhà Landmark 81, Khu đô thị Vinhomes Central Park, Quận Bình Thạnh, TP. Hồ Chí Minh
                </span>
              </li>
              <li className="footer-contact-item">
                <Phone className="footer-contact-icon" />
                <a href="tel:19001234" className="hover:text-white transition-colors duration-200 font-semibold">
                  1900 1234 (9:00 - 22:00)
                </a>
              </li>
              <li className="footer-contact-item">
                <Mail className="footer-contact-icon" />
                <a href="mailto:support@nasafilm.vn" className="hover:text-white transition-colors duration-200">
                  support@nasafilm.vn
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider line */}
        <div className="footer-divider" />

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} NASAFILM. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/about" className="hover:text-white transition-colors">Giới Thiệu</Link>
            <a href="#" className="hover:text-white transition-colors">Bản Quyền</a>
            <a href="#" className="hover:text-white transition-colors">Liên Hệ Quảng Cáo</a>
            <a href="#" className="hover:text-white transition-colors">Tuyển Dụng</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
