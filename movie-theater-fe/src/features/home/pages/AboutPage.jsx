import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CreditCard,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import heroBg from '../../../shared/assets/about_hero_bg.webp';
import projectorImg from '../../../shared/assets/about_projector.webp';
import './AboutPage.css';

const capabilities = [
  {
    icon: Radio,
    number: '01',
    title: 'Đặt ghế theo thời gian thực',
    description: 'Sơ đồ ghế được đồng bộ trực tiếp, giúp hạn chế trùng chỗ và giữ trạng thái xuyên suốt quá trình đặt vé.',
  },
  {
    icon: Users,
    number: '02',
    title: 'Orbit — đặt vé cùng nhau',
    description: 'Tạo phòng, mời bạn bè chọn ghế và hoàn tất một hành trình chung mà không cần chia sẻ tài khoản.',
  },
  {
    icon: CreditCard,
    number: '03',
    title: 'Thanh toán linh hoạt',
    description: 'Hỗ trợ Stripe, VietQR, ví thành viên và quy trình kiểm tra trạng thái thanh toán rõ ràng.',
  },
  {
    icon: Bot,
    number: '04',
    title: 'Hỗ trợ đúng ngữ cảnh',
    description: 'NASA Bot, thông báo và trung tâm hỗ trợ kết nối thông tin vé, thanh toán và tài khoản tại một nơi.',
  },
];

const journey = [
  ['Khám phá', 'Tìm phim theo lịch chiếu, thể loại, quốc gia hoặc trải nghiệm xem trực tuyến.'],
  ['Chọn trải nghiệm', 'Xem suất chiếu, phòng chiếu và sơ đồ ghế trước khi quyết định.'],
  ['Hoàn tất an toàn', 'Xác nhận vé, combo và phương thức thanh toán trong một luồng nhất quán.'],
  ['Tiếp tục sau suất chiếu', 'Quản lý vé, nhắc lịch, lịch sử mua và các quyền lợi thành viên.'],
];

const principles = [
  {
    icon: ShieldCheck,
    title: 'Tin cậy trước tiên',
    description: 'Trạng thái ghế, giao dịch và quyền truy cập được kiểm tra ở cả giao diện lẫn hệ thống nghiệp vụ.',
  },
  {
    icon: Sparkles,
    title: 'Ít thao tác hơn',
    description: 'Mỗi tính năng được thiết kế để rút ngắn quãng đường từ lúc chọn phim đến khi nhận vé.',
  },
  {
    icon: Users,
    title: 'Một hệ thống cho mọi vai trò',
    description: 'Khách hàng, nhân viên quầy và quản trị viên làm việc trên cùng một nguồn dữ liệu nhất quán.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: 'easeOut' } },
};

const AboutPage = () => {
  return (
    <div className="about-page-wrapper">
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
          <p className="about-eyebrow">Về NASAFILM</p>
          <h1 className="about-hero-title">
            Điện ảnh không dừng lại ở màn chiếu.
          </h1>
          <p className="about-hero-sub">
            NASAFILM đang xây dựng một hành trình liền mạch từ lúc tìm phim,
            chọn ghế, thanh toán đến khi tấm vé nằm trong tay bạn.
          </p>
          <Link to="/movies" className="about-hero-link">
            Khám phá phim <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </motion.div>
      </section>

      <motion.section
        className="about-story-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <motion.div className="about-story-content" variants={itemVariants}>
          <p className="about-section-index">01 — Hệ thống đang được xây dựng</p>
          <h2 className="about-story-title">Một nền tảng, trọn hành trình xem phim.</h2>
          <p className="about-story-text">
            NASAFILM không phải câu chuyện về một chuỗi rạp lâu đời. Đây là một
            sản phẩm đang phát triển để kết nối trải nghiệm khách hàng với hoạt
            động vận hành rạp trên cùng một nền tảng.
          </p>
          <p className="about-story-text">
            Từ lịch chiếu, ghế ngồi và combo đến thanh toán, vé điện tử, hỗ trợ
            sau mua và nội dung trực tuyến — mọi thành phần được thiết kế để
            trao đổi dữ liệu nhất quán, giảm thao tác lặp và phản hồi nhanh hơn.
          </p>
          <div className="about-progress-note">
            <span className="about-progress-dot" />
            <span>Đang tiếp tục hoàn thiện theo phản hồi thực tế của người dùng.</span>
          </div>
        </motion.div>
        <motion.figure className="about-story-image-container" variants={itemVariants}>
          <img
            src={projectorImg}
            alt="Máy chiếu phim trong không gian rạp tối"
            className="about-story-image"
          />
          <figcaption className="about-image-caption">
            <span>Đích đến</span>
            Công nghệ lùi lại phía sau để trải nghiệm điện ảnh tiến lên phía trước.
          </figcaption>
        </motion.figure>
      </motion.section>

      <section className="about-capabilities-section">
        <div className="about-section-heading">
          <div>
            <p className="about-section-index">02 — Năng lực hiện tại</p>
            <h2 className="about-section-title">Không chỉ là một trang đặt vé.</h2>
          </div>
          <p className="about-section-lead">
            Những luồng quan trọng đã được kết nối để phục vụ cả khách hàng,
            nhân viên tại rạp và bộ phận vận hành.
          </p>
        </div>

        <motion.div
          className="about-capabilities-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {capabilities.map(({ icon: Icon, number, title, description }) => (
            <motion.article className="about-capability" variants={itemVariants} key={number}>
              <div className="about-capability-topline">
                <span className="about-capability-number">{number}</span>
                <Icon size={21} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="about-journey-section">
        <div className="about-journey-intro">
          <p className="about-section-index">03 — Hành trình sản phẩm</p>
          <h2 className="about-section-title">Bốn điểm chạm. Một mạch trải nghiệm.</h2>
        </div>
        <motion.ol
          className="about-journey-list"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {journey.map(([title, description], index) => (
            <motion.li variants={itemVariants} key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </section>

      <section className="about-principles-section">
        <div className="about-section-heading">
          <div>
            <p className="about-section-index">04 — Nguyên tắc phát triển</p>
            <h2 className="about-section-title">Xây chắc trước khi xây lớn.</h2>
          </div>
        </div>
        <div className="about-principles-grid">
          {principles.map(({ icon: Icon, title, description }) => (
            <article className="about-principle" key={title}>
              <Icon size={20} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <div className="about-closing">
          <p>Chọn một bộ phim. Phần còn lại để NASAFILM kết nối.</p>
          <Link to="/movies" className="about-closing-link">
            Xem phim đang chiếu <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
