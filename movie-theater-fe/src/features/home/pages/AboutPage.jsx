import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Gem, Users } from 'lucide-react';
import heroBg from '../../../shared/assets/about_hero_bg.png';
import projectorImg from '../../../shared/assets/about_projector.png';
import julianAvatar from '../../../shared/assets/avatar_julian.png';
import elenaAvatar from '../../../shared/assets/avatar_elena.png';
import marcusAvatar from '../../../shared/assets/avatar_marcus.png';
import sashaAvatar from '../../../shared/assets/avatar_sasha.png';
import './AboutPage.css';

const AboutPage = () => {
  // Animation variants for staggered load
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="about-page-wrapper">

      {/* Hero Section */}
      <section 
        className="about-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="about-hero-overlay" />
        <motion.div 
          className="about-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="about-hero-title">
            Nâng Tầm Nghệ Thuật Trải Nghiệm
          </h1>
          <p className="about-hero-sub">
            Nơi mỗi khung hình là một tuyệt tác và mọi vị trí ngồi đều là tốt nhất.
          </p>
        </motion.div>
      </section>

      {/* Our Story Section */}
      <motion.section 
        className="about-story-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <motion.div className="about-story-content" variants={itemVariants}>
          <h2 className="about-story-title">Câu Chuyện Của Chúng Tôi</h2>
          <p className="about-story-text">
            Được thành lập vào năm 2012, CINE LUXE khởi đầu với một tầm nhìn đơn giản: mang phép màu trở lại màn ảnh bạc. Trong kỷ nguyên của sự tiện lợi kỹ thuật số, chúng tôi tin rằng hành động xem phim tại rạp phải là một nghi thức thiêng liêng, đắm chìm.
          </p>
          <p className="about-story-text">
            Chúng tôi đã dành một thập kỷ để hoàn thiện công nghệ và kiến trúc không gian của mình, kết hợp máy chiếu laser tiên tiến nhất với sự sang trọng của rạp hát giữa thế kỷ trước. Ngày nay, chúng tôi tự hào là tiêu chuẩn toàn cầu cho điện ảnh cao cấp, tổ chức các buổi ra mắt thế giới và nuôi dưỡng một cộng đồng những người đam mê điện ảnh thực thụ.
          </p>
        </motion.div>
        
        <motion.div 
          className="about-story-image-container"
          variants={itemVariants}
        >
          <img 
            src={projectorImg} 
            alt="Premium Vintage Movie Projector" 
            className="about-story-image" 
          />
        </motion.div>
      </motion.section>

      {/* The Core Values Section */}
      <section className="about-values-section">
        <h2 className="about-values-title">Giá Trị Cốt Lõi</h2>
        
        <motion.div 
          className="about-values-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Card 1: Innovation */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Zap size={22} />
            </div>
            <h3 className="about-value-title">Sáng Tạo Đột Phá</h3>
            <p className="about-value-description">
              Vượt qua ranh giới của thị giác và thính giác với công nghệ chiếu laser 8K độc quyền và âm thanh vòm Dolby Atmos đắm chìm.
            </p>
          </motion.div>

          {/* Card 2: Luxury */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Gem size={22} />
            </div>
            <h3 className="about-value-title">Sang Trọng Đẳng Cấp</h3>
            <p className="about-value-description">
              Ghế da khâu tay cao cấp có thể ngả lưng, dịch vụ quản gia cá nhân và thực đơn tuyển chọn từ các đối tác chuẩn sao Michelin.
            </p>
          </motion.div>

          {/* Card 3: Community */}
          <motion.div className="about-value-card" variants={itemVariants}>
            <div className="about-value-icon-wrapper">
              <Users size={22} />
            </div>
            <h3 className="about-value-title">Cộng Đồng Điện Ảnh</h3>
            <p className="about-value-description">
              Nuôi dưỡng không gian để những người yêu phim tụ họp, chia sẻ và tôn vinh sức mạnh biến đổi của nghệ thuật kể chuyện.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* The Visionaries Section */}
      <section className="about-visionaries-section">
        <h2 className="about-visionaries-title">Đội Ngũ Sáng Lập</h2>
        <p className="about-visionaries-sub">
          Những bộ óc đứng sau phép màu, cống hiến hết mình để hoàn thiện hành trình điện ảnh của bạn.
        </p>

        <motion.div 
          className="about-visionaries-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Visionary 1: Julian Vance */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={julianAvatar} 
                alt="Julian Vance" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Julian Vance</h3>
            <p className="about-visionary-role">CEO & Nhà sáng lập</p>
          </motion.div>

          {/* Visionary 2: Elena Rossi */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={elenaAvatar} 
                alt="Elena Rossi" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Elena Rossi</h3>
            <p className="about-visionary-role">Giám đốc Trải nghiệm</p>
          </motion.div>

          {/* Visionary 3: Marcus Chen */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={marcusAvatar} 
                alt="Marcus Chen" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Marcus Chen</h3>
            <p className="about-visionary-role">Giám đốc Công nghệ (CTO)</p>
          </motion.div>

          {/* Visionary 4: Sasha de Noir */}
          <motion.div className="about-visionary-card" variants={itemVariants}>
            <div className="about-visionary-avatar-wrapper">
              <img 
                src={sashaAvatar} 
                alt="Sasha de Noir" 
                className="about-visionary-avatar" 
              />
            </div>
            <h3 className="about-visionary-name">Sasha de Noir</h3>
            <p className="about-visionary-role">Trưởng nhóm Sáng tạo</p>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="about-cta-section">
        <motion.div 
          className="about-cta-card"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="about-cta-title">Đam mê điện ảnh? Hãy đồng hành cùng chúng tôi.</h2>
          <p className="about-cta-sub">
            Chúng tôi luôn tìm kiếm những cá nhân nhiệt huyết, tin tưởng vào sức mạnh của trải nghiệm điện ảnh. Tham gia vào đội ngũ đang phát triển của chúng tôi tại TP. Hồ Chí Minh, Hà Nội và Đà Nẵng.
          </p>
          <div className="about-cta-buttons">
            <button className="about-btn-primary">
              Cơ Hội Việc Làm
            </button>
            <button className="about-btn-secondary">
              Liên Hệ Nhân Sự
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default AboutPage;
