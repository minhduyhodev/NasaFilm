import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Scale, HelpCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LegalPages.css';

export const TermsPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  return (
    <div className="legal-page-wrapper">
      <Navbar />

      {/* Header Banner */}
      <section className="legal-header">
        <div className="legal-header-overlay absolute inset-0 bg-gradient-to-b from-black/20 via-[#0b0f19]/80 to-[#0b0f19] z-10" />
        <div className="legal-header-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="legal-last-updated">Cập nhật mới nhất: 09 Tháng 06, 2026</p>
          </motion.div>
          <motion.h1 
            className="legal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Điều Khoản Dịch Vụ
          </motion.h1>
        </div>
      </section>

      {/* Legal Content */}
      <motion.div 
        className="legal-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Section 1 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <FileText className="legal-section-icon" size={20} />
            1. Chấp thuận điều khoản
          </h2>
          <p className="legal-text">
            Chào mừng bạn đến với hệ thống rạp chiếu phim trực tuyến **NASAFILM**. Bằng việc truy cập, tạo tài khoản và sử dụng dịch vụ của chúng tôi bao gồm việc đặt vé và mua bắp nước trực tuyến, bạn đã đồng ý tuân thủ toàn bộ các điều khoản quy định dưới đây.
          </p>
          <p className="legal-text">
            Nếu bạn không đồng ý với bất kỳ phần nào trong các điều khoản này, vui lòng ngừng sử dụng dịch vụ của chúng tôi ngay lập tức.
          </p>
        </motion.section>

        {/* Section 2 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Shield className="legal-section-icon" size={20} />
            2. Tài khoản và Bảo mật
          </h2>
          <p className="legal-text">
            Để thực hiện việc đặt vé, bạn cần đăng ký một tài khoản và cung cấp các thông tin liên quan chính xác (như họ và tên, email, số điện thoại). Bạn phải tự chịu trách nhiệm bảo mật cho mật khẩu và tài khoản của mình.
          </p>
          <ul className="legal-list">
            <li>Bạn cam kết cung cấp thông tin chính xác và cập nhật khi đăng ký tài khoản.</li>
            <li>Chúng tôi có quyền tạm khóa hoặc xóa tài khoản nếu phát hiện hành vi gian lận hoặc khai báo thông tin giả mạo.</li>
            <li>Bạn phải thông báo ngay cho ban quản trị NASAFILM nếu phát hiện có truy cập trái phép vào tài khoản của mình.</li>
          </ul>
        </motion.section>

        {/* Section 3 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Scale className="legal-section-icon" size={20} />
            3. Quy định đặt vé và Thanh toán
          </h2>
          <p className="legal-text">
            Khách hàng có thể thực hiện đặt vé xem phim trực tiếp qua website của NASAFILM. Mọi giao dịch đặt vé sau khi thanh toán thành công sẽ được hệ thống tạo hóa đơn và xuất mã vé điện tử (mã QR/Barcode).
          </p>
          <ul className="legal-list">
            <li>Vé đã mua trực tuyến **không thể hoàn trả hoặc đổi lịch chiếu** dưới mọi hình thức, trừ trường hợp lỗi kỹ thuật từ phía rạp chiếu phim.</li>
            <li>Khách hàng có trách nhiệm kiểm tra kỹ các thông tin: Tên phim, suất chiếu, rạp chiếu, vị trí ghế và thông tin combo bắp nước trước khi tiến hành thanh toán.</li>
            <li>NASAFILM hỗ trợ thanh toán qua các phương thức thẻ nội địa, thẻ quốc tế hoặc các cổng thanh toán điện tử được tích hợp trên hệ thống.</li>
          </ul>
        </motion.section>

        {/* Section 4 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <HelpCircle className="legal-section-icon" size={20} />
            4. Quy định tại phòng chiếu
          </h2>
          <p className="legal-text">
            Khi đến rạp chiếu phim để nhận vé và xem phim, quý khách vui lòng tuân thủ các nội quy chung của rạp để bảo đảm môi trường điện ảnh văn minh:
          </p>
          <ul className="legal-list">
            <li>Xuất trình mã vé điện tử hợp lệ tại quầy soát vé hoặc quầy tự động để được hướng dẫn vào phòng chiếu.</li>
            <li>Tuân thủ quy định phân loại độ tuổi của phim (ví dụ: phim T13, T16, T18). Rạp có quyền kiểm tra giấy tờ tùy thân của khách hàng và từ chối vào phòng chiếu nếu không đủ tuổi quy định mà không hoàn lại tiền vé.</li>
            <li>Không mang đồ ăn, thức uống từ bên ngoài vào rạp chiếu phim.</li>
            <li>Tuyệt đối không sử dụng thiết bị ghi âm, ghi hình (máy ảnh, máy quay, điện thoại thông minh) trong suốt thời gian chiếu phim để bảo vệ bản quyền nghệ thuật. Mọi hành vi vi phạm sẽ bị xử lý nghiêm theo quy định pháp luật.</li>
          </ul>
        </motion.section>

        {/* Section 5 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <AlertTriangle className="legal-section-icon" size={20} />
            5. Giới hạn trách nhiệm
          </h2>
          <p className="legal-text">
            NASAFILM luôn nỗ lực đảm bảo chất lượng kỹ thuật tốt nhất cho dịch vụ trực tuyến. Tuy nhiên, chúng tôi không chịu trách nhiệm trong các trường hợp gián đoạn hệ thống do thiên tai, sự cố đường truyền mạng toàn cục hoặc do lỗi thiết bị từ phía người sử dụng.
          </p>
        </motion.section>

        {/* Section 6 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <RefreshCw className="legal-section-icon" size={20} />
            6. Thay đổi điều khoản dịch vụ
          </h2>
          <p className="legal-text">
            NASAFILM có quyền thay đổi, chỉnh sửa các điều khoản dịch vụ này bất kỳ lúc nào để phù hợp với quy định pháp luật hoặc nâng cấp hệ thống dịch vụ. Mọi thay đổi sẽ có hiệu lực ngay khi được đăng tải công khai trên website này.
          </p>
        </motion.section>
      </motion.div>

      <Footer />
    </div>
  );
};

export default TermsPage;
