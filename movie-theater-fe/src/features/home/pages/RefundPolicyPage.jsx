import { motion } from 'framer-motion';
import { Ban, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import './LegalPages.css';

export const RefundPolicyPage = () => {
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
            Chính Sách Hoàn Vé
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
            <Ban className="legal-section-icon" size={20} />
            1. Nguyên tắc chung không đổi trả vé
          </h2>
          <p className="legal-text">
            **NASAFILM** áp dụng chính sách **không hỗ trợ hủy vé, đổi suất chiếu hoặc hoàn tiền** đối với tất cả các vé xem phim và combo bắp nước đã được giao dịch và thanh toán trực tuyến thành công trên hệ thống.
          </p>
          <p className="legal-text">
            Quy định này được đưa ra do đặc thù dịch vụ chiếu phim trực tiếp liên quan chặt chẽ đến việc giữ chỗ ghế ngồi trống thời gian thực trên hệ thống phòng chiếu. Rất mong quý khách hàng thông cảm và cân nhắc kỹ các thông tin về rạp, phim, suất chiếu trước khi tiến hành thanh toán.
          </p>
        </motion.section>

        {/* Section 2 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <CheckCircle className="legal-section-icon" size={20} />
            2. Các trường hợp ngoại lệ được hoàn tiền
          </h2>
          <p className="legal-text">
            NASAFILM sẽ xem xét giải quyết hoàn tiền hoặc đổi vé sang suất chiếu khác tương đương cho quý khách trong các trường hợp đặc biệt sau:
          </p>
          <ul className="legal-list">
            <li>Lỗi kỹ thuật nghiêm trọng phát sinh từ phía rạp chiếu phim (mất điện phòng chiếu, lỗi hệ thống máy chiếu, lỗi âm thanh kéo dài quá 15 phút) dẫn đến suất chiếu không thể thực hiện được hoặc bị hủy bỏ.</li>
            <li>Thay đổi lịch chiếu hoặc hủy suất chiếu đột xuất từ phía cơ quan quản lý nhà nước hoặc do ban điều hành rạp chiếu phim.</li>
            <li>Lỗi trừ tiền kép trên tài khoản ngân hàng của khách hàng đối với cùng một giao dịch đặt vé (bị trừ tiền 2 lần trở lên nhưng chỉ nhận được 1 mã vé thành công).</li>
          </ul>
        </motion.section>

        {/* Section 3 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Clock className="legal-section-icon" size={20} />
            3. Quy trình giải quyết hoàn tiền
          </h2>
          <p className="legal-text">
            Đối với các trường hợp giao dịch thuộc diện được hoàn tiền nêu tại Mục 2, số tiền hoàn trả sẽ được chuyển lại trực tiếp vào tài khoản ngân hàng hoặc ví điện tử mà quý khách đã sử dụng để giao dịch:
          </p>
          <ul className="legal-list">
            <li>**Ví điện tử (Momo, ZaloPay, VNPAY):** Thời gian nhận tiền hoàn từ **3 đến 5 ngày làm việc** kể từ khi yêu cầu hoàn tiền được duyệt.</li>
            <li>**Thẻ nội địa (ATM):** Thời gian nhận tiền hoàn từ **5 đến 7 ngày làm việc**.</li>
            <li>**Thẻ tín dụng quốc tế (Visa/Mastercard):** Thời gian nhận tiền từ **7 đến 15 ngày làm việc** tùy thuộc vào chính sách đối soát của ngân hàng phát hành thẻ.</li>
          </ul>
        </motion.section>

        {/* Section 4 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <MessageCircle className="legal-section-icon" size={20} />
            4. Kênh tiếp nhận yêu cầu hỗ trợ
          </h2>
          <p className="legal-text">
            Để được giải quyết các sự cố hoàn vé nhanh nhất, quý khách vui lòng liên hệ bộ phận CSKH trực tuyến của NASAFILM kèm theo mã giao dịch thành công (Mã GD/Ticket ID):
          </p>
          <ul className="legal-list">
            <li>Hotline hỗ trợ: **1900 1234** (Hoạt động từ 9:00 đến 22:00 hàng ngày)</li>
            <li>Email tiếp nhận phản hồi sự cố: **support@nasafilm.vn**</li>
          </ul>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default RefundPolicyPage;
