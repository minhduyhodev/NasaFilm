import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Calendar, X, Copy, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Import image assets
import heroBg from '../../../shared/assets/offers_hero_bg.png';
import familyComboImg from '../../../shared/assets/offer_family_combo.png';
import imaxWeekImg from '../../../shared/assets/hero3.jpg';
import vipMemberImg from '../../../shared/assets/MemberRating.jpg';
import wednesdayImg from '../../../shared/assets/hero2.jpg';
import './OffersPage.css';

const allOffers = [
  {
    id: 'family-combo',
    title: 'Combo Family Deal',
    description: 'Nhận ngay 4 nước ngọt lớn, 2 hộp bắp khổng lồ và 2 phần khoai tây chiên giòn rụm với mức giá vô cùng ưu đãi dành riêng cho gia đình.',
    category: 'Combo Ẩm Thực',
    badge: '-25%',
    image: familyComboImg,
    expiry: '31/12/2026',
    code: 'LUXEFAMILY',
    details: 'Ưu đãi áp dụng khi mua vé kèm combo tại quầy bắp nước hoặc đặt trực tuyến qua ứng dụng CINE LUXE. Không áp dụng đồng thời với các chương trình khuyến mãi bắp nước khác.'
  },
  {
    id: 'imax-week',
    title: 'IMAX Week - Trải nghiệm IMAX cực đỉnh',
    description: 'Giảm ngay 30% giá vé IMAX cho mọi khung giờ chiếu từ thứ Hai đến thứ Năm hàng tuần.',
    category: 'Vé Xem Phim',
    badge: '-30%',
    image: imaxWeekImg,
    expiry: '30/09/2026',
    code: 'IMAXWEEK',
    details: 'Áp dụng cho mọi suất chiếu phim định dạng IMAX tại các rạp có phòng chiếu IMAX của hệ thống CINE LUXE. Giới hạn tối đa 2 vé giảm giá mỗi tài khoản thành viên.'
  },
  {
    id: 'vip-member',
    title: 'Chào bạn mới - Nhận ngay 1 vé miễn phí',
    description: 'Đăng ký tài khoản thành viên VIP CINE LUXE mới và nhận ngay 01 mã voucher đổi vé miễn phí cho suất chiếu 2D bất kỳ.',
    category: 'VIP / Member',
    badge: 'FREE VÉ',
    image: vipMemberImg,
    expiry: '31/12/2026',
    code: 'WELCOMEBYE',
    details: 'Voucher vé miễn phí sẽ tự động được gửi vào ví voucher của tài khoản sau khi xác thực email thành công. Có giá trị sử dụng trong vòng 30 ngày kể từ ngày kích hoạt tài khoản.'
  },
  {
    id: 'happy-wednesday',
    title: 'Happy Wednesday - Đồng giá vé 65K',
    description: 'Đồng giá vé 65,000 VNĐ cho tất cả các suất chiếu phim 2D vào ngày thứ Tư hàng tuần.',
    category: 'Vé Xem Phim',
    badge: '65K VÉ',
    image: wednesdayImg,
    expiry: '31/12/2026',
    code: 'HAPPYWED',
    details: 'Ưu đãi áp dụng cho tất cả khách hàng mua vé trực tiếp hoặc đặt vé trực tuyến vào ngày thứ Tư. Không áp dụng cho các suất chiếu sớm (Sneak Show) hoặc các ngày lễ tết.'
  }
];

const OffersPage = () => {
  const [activeTab, setActiveTab] = useState('Tất cả');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const categories = ['Tất cả', 'Vé Xem Phim', 'Combo Ẩm Thực', 'VIP / Member'];

  const filteredOffers = useMemo(() => {
    if (activeTab === 'Tất cả') return allOffers;
    return allOffers.filter(offer => offer.category === activeTab);
  }, [activeTab]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="offers-page-wrapper">
      <Navbar />

      {/* Hero Header */}
      <section 
        className="offers-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="offers-hero-overlay" />
        <div className="offers-hero-content">
          <motion.h1 
            className="offers-hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Ưu Đãi Đặc Biệt
          </motion.h1>
          <motion.p 
            className="offers-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Khám phá các chương trình khuyến mãi độc quyền, combo ẩm thực hấp dẫn và quà tặng dành riêng cho thành viên CINE LUXE.
          </motion.p>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="offers-container">
        {/* Category Filter Tabs */}
        <div className="offers-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`offers-tab-btn ${activeTab === cat ? 'offers-tab-btn-active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Offers List (Editorial Banners style) */}
        <div className="flex flex-col gap-16">
          {filteredOffers.map((offer, index) => (
            <div 
              key={offer.id} 
              className={`flex flex-col md:flex-row gap-8 items-center md:items-stretch border-b border-white/5 pb-12 last:border-b-0 ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Image Frame */}
              <div className="w-full md:w-[45%] aspect-[16/10] md:aspect-[16/9] overflow-hidden rounded-[24px] shadow-[0_15px_30px_rgba(0,0,0,0.5)] relative">
                <img src={offer.image} alt={offer.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]" />
                <span className="absolute top-4 left-4 px-3 py-1 bg-red-600/90 text-white text-[10px] font-black uppercase rounded tracking-wider">
                  {offer.badge}
                </span>
              </div>

              {/* Offer Info Content */}
              <div className="w-full md:w-[55%] flex flex-col justify-center text-left space-y-4 px-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">{offer.category}</span>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-tight mt-1 font-heading">{offer.title}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed font-medium">{offer.description}</p>
                
                <div className="flex items-center justify-between pt-4">
                  <div className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                    <Calendar size={13} className="text-red-500" />
                    <span>HSD: {offer.expiry}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedOffer(offer)}
                    className="inline-block text-xs font-black text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors duration-200 border-b border-transparent hover:border-red-400"
                  >
                    [Xem chi tiết]
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Offer Modal details popup */}
      <AnimatePresence>
        {selectedOffer && (
          <div className="offer-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="offer-modal-card"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedOffer(null)} 
                className="offer-modal-close"
              >
                <X size={20} />
              </button>

              {/* Title & Badge */}
              <div className="space-y-2 pt-2">
                <span className="px-2.5 py-1 bg-red-600/20 text-red-500 border border-red-500/20 text-[9px] font-black uppercase rounded tracking-wider">
                  {selectedOffer.category}
                </span>
                <h3 className="offer-modal-title">{selectedOffer.title}</h3>
              </div>

              {/* Image Banner */}
              <div className="h-44 w-full rounded-2xl overflow-hidden border border-white/10">
                <img src={selectedOffer.image} alt={selectedOffer.title} className="w-full h-full object-cover" />
              </div>

              {/* Descriptions & T&C */}
              <div className="offer-modal-desc space-y-4">
                <p className="text-white font-medium text-sm">{selectedOffer.description}</p>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Điều kiện áp dụng:</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{selectedOffer.details}</p>
                </div>
              </div>

              {/* Promo Code Copy Box */}
              <div className="offer-coupon-box">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Mã khuyến mãi:</span>
                  <span className="offer-coupon-code">{selectedOffer.code}</span>
                </div>
                <button 
                  onClick={() => handleCopyCode(selectedOffer.code)}
                  className="offer-btn-copy flex items-center gap-1.5"
                >
                  {copiedCode ? (
                    <>
                      <Check size={14} />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default OffersPage;
