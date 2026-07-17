import { motion } from 'framer-motion';
import { Shield, Lock, Eye, CheckSquare, Users, Mail } from 'lucide-react';
import './LegalPages.css';

export const PrivacyPage = () => {
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
            Chính Sách Bảo Mật
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
            <Lock className="legal-section-icon" size={20} />
            1. Thu thập thông tin cá nhân
          </h2>
          <p className="legal-text">
            **NASAFILM** tiến hành thu thập thông tin của bạn khi bạn thực hiện các thao tác đăng ký tài khoản trên hệ thống, đặt vé xem phim hoặc sử dụng Google Sign-In để đăng nhập nhanh. Các loại thông tin thu thập bao gồm:
          </p>
          <ul className="legal-list">
            <li>Thông tin định danh: Họ tên, ảnh đại diện (avatar).</li>
            <li>Thông tin liên lạc: Địa chỉ email, số điện thoại.</li>
            <li>Lịch sử giao dịch: Thông tin vé đã đặt, các voucher khuyến mãi đã tích lũy và tổng số điểm thưởng tích lũy (Score) của tài khoản.</li>
          </ul>
        </motion.section>

        {/* Section 2 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Eye className="legal-section-icon" size={20} />
            2. Mục đích sử dụng thông tin
          </h2>
          <p className="legal-text">
            Chúng tôi cam kết sử dụng thông tin cá nhân của bạn vào những mục đích hợp pháp sau đây để nâng cấp trải nghiệm của khách hàng:
          </p>
          <ul className="legal-list">
            <li>Xử lý giao dịch đặt vé trực tuyến và gửi hóa đơn điện tử chứa mã vé (QR/Barcode) về tài khoản hoặc hòm thư của bạn.</li>
            <li>Gửi mã xác thực OTP dùng cho việc đăng ký tài khoản mới hoặc đổi mật khẩu.</li>
            <li>Theo dõi điểm tích lũy và xếp hạng thành viên (Silver, Gold, Platinum) để cung cấp các voucher ưu đãi độc quyền của NASAFILM.</li>
            <li>Gửi các thông báo quan trọng về suất chiếu hoặc lịch bảo trì hệ thống.</li>
          </ul>
        </motion.section>

        {/* Section 3 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Shield className="legal-section-icon" size={20} />
            3. Bảo mật thông tin khách hàng
          </h2>
          <p className="legal-text">
            Bảo mật thông tin của khách hàng là ưu tiên hàng đầu của chúng tôi. NASAFILM áp dụng các biện pháp an ninh mạng kỹ thuật cao để bảo vệ dữ liệu chống lại sự truy cập bất hợp pháp:
          </p>
          <ul className="legal-list">
            <li>Mật khẩu của khách hàng được băm (hash) bằng giải thuật bảo mật cao ở phía máy chủ trước khi lưu trữ vào cơ sở dữ liệu.</li>
            <li>Hệ thống sử dụng cơ chế JWT Token để xác thực các phiên đăng nhập, đảm bảo thông tin cá nhân không bị rò rỉ trong quá trình giao dịch.</li>
            <li>Chúng tôi khuyến nghị khách hàng tự bảo mật mã OTP gửi về email cá nhân và không chia sẻ thông tin đăng nhập với người khác.</li>
          </ul>
        </motion.section>

        {/* Section 4 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Users className="legal-section-icon" size={20} />
            4. Chia sẻ thông tin với bên thứ ba
          </h2>
          <p className="legal-text">
            Chúng tôi cam kết **không bán, trao đổi hoặc cho thuê** thông tin cá nhân của khách hàng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
          </p>
          <p className="legal-text">
            Thông tin chỉ được chia sẻ trong các trường hợp cần thiết sau:
          </p>
          <ul className="legal-list">
            <li>Chia sẻ với các đối tác cung cấp dịch vụ thanh toán điện tử (như cổng thanh toán ngân hàng) để thực hiện giao dịch mua vé của bạn.</li>
            <li>Để tuân thủ yêu cầu pháp lý từ các cơ quan chức năng có thẩm quyền theo quy định của pháp luật Việt Nam.</li>
          </ul>
        </motion.section>

        {/* Section 5 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <CheckSquare className="legal-section-icon" size={20} />
            5. Quyền lợi của khách hàng
          </h2>
          <p className="legal-text">
            Khách hàng có toàn quyền kiểm soát dữ liệu cá nhân của mình trên hệ thống của chúng tôi:
          </p>
          <ul className="legal-list">
            <li>Có quyền truy cập và chỉnh sửa họ tên, số điện thoại trực tiếp tại mục **Cài đặt thông tin cá nhân (Profile)** bất kỳ lúc nào.</li>
            <li>Có quyền tự đổi mật khẩu tài khoản của mình.</li>
            <li>Yêu cầu ban quản trị vô hiệu hóa hoặc xóa thông tin tài khoản nếu không còn nhu cầu sử dụng dịch vụ.</li>
          </ul>
        </motion.section>

        {/* Section 6 */}
        <motion.section className="legal-section" variants={itemVariants}>
          <h2 className="legal-section-title">
            <Mail className="legal-section-icon" size={20} />
            6. Liên hệ chúng tôi
          </h2>
          <p className="legal-text">
            Nếu bạn có bất kỳ câu hỏi nào liên quan đến Chính sách bảo mật hoặc có yêu cầu trợ giúp bảo mật tài khoản, vui lòng liên hệ với ban quản trị NASAFILM qua địa chỉ email hỗ trợ chính thức:
          </p>
          <p className="legal-text text-red-500 font-bold">
            nhom3fptct@gmail.com
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default PrivacyPage;
