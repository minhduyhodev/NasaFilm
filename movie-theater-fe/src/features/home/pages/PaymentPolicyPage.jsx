import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, Receipt, AlertCircle } from 'lucide-react';
import './LegalPages.css';

export const PaymentPolicyPage = () => {
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
            Chính Sách Thanh Toán
          </motion.h1>
        </div>
      </section>

      <motion.div 
        className="legal-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Section 1 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <CreditCard className="legal-section-icon" size={20} />
            1. Các phương thức thanh toán hỗ trợ
          </h2>
          <p className="legal-text">
            Nhằm đem lại sự tiện lợi tối đa cho khách hàng khi đặt vé xem phim trực tuyến, **NASAFILM** hỗ trợ đa dạng các hình thức thanh toán an toàn thông qua các cổng trung gian thanh toán uy tín:
          </p>
          <ul className="legal-list">
            <li>**Thẻ nội địa (ATM):** Hỗ trợ thanh toán của hầu hết các ngân hàng thương mại tại Việt Nam.</li>
            <li>**Thẻ quốc tế:** Hỗ trợ thẻ Visa, Mastercard, JCB phát hành bởi các ngân hàng trong và ngoài nước.</li>
            <li>**Ví điện tử:** Thanh toán nhanh chóng qua QR Code của các ví điện tử phổ biến (Momo, ZaloPay, VNPAY, ShopeePay).</li>
          </ul>
        </motion.section>

        {/* Section 2 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <ShieldCheck className="legal-section-icon" size={20} />
            2. Quy định bảo mật thanh toán
          </h2>
          <p className="legal-text">
            Mọi thông tin thanh toán của khách hàng đều được xử lý thông qua kết nối bảo mật chuẩn mã hóa cao SSL (Secure Sockets Layer). 
          </p>
          <ul className="legal-list">
            <li>NASAFILM cam kết không lưu giữ thông tin thẻ ngân hàng hoặc thông tin tài khoản ví điện tử của khách hàng trên hệ thống máy chủ của chúng tôi.</li>
            <li>Chúng tôi áp dụng cơ chế xác thực hai lớp (OTP ngân hàng, mã PIN ví điện tử) trực tiếp tại trang thanh toán của ngân hàng để phòng chống tuyệt đối các hành vi sử dụng thẻ giả mạo hoặc truy cập bất hợp pháp.</li>
          </ul>
        </motion.section>

        {/* Section 3 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Receipt className="legal-section-icon" size={20} />
            3. Hóa đơn và Xác nhận giao dịch
          </h2>
          <p className="legal-text">
            Sau khi hoàn tất thanh toán thành công, hệ thống sẽ thực hiện các thao tác xác nhận giao dịch tự động:
          </p>
          <ul className="legal-list">
            <li>Mã vé điện tử (dưới dạng mã vạch Barcode/QR Code) và thông tin chi tiết về suất chiếu sẽ được hiển thị ngay trên màn hình ứng dụng và được cập nhật vào mục **Vé của tôi** trong phần thông tin cá nhân.</li>
            <li>Đồng thời, một email xác nhận kèm hóa đơn chi tiết giao dịch sẽ được tự động gửi đến địa chỉ email đã đăng ký của bạn.</li>
          </ul>
        </motion.section>

        {/* Section 4 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <AlertCircle className="legal-section-icon" size={20} />
            4. Xử lý sự cố thanh toán
          </h2>
          <p className="legal-text">
            Trong trường hợp tài khoản của bạn đã bị trừ tiền nhưng hệ thống chưa xuất mã vé hoặc không nhận được email xác nhận sau 10 phút, quý khách vui lòng liên hệ ngay với chúng tôi qua số hotline **1900 1234** hoặc email **support@nasafilm.vn** để được nhân viên hỗ trợ kiểm tra và xuất vé thủ công.
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default PaymentPolicyPage;
