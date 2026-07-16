import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, MessageSquare, Ticket, Award, Key } from 'lucide-react';
import './LegalPages.css';

export const FaqPage = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFaq = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqData = [
    {
      question: 'Tôi có thể đổi hoặc trả lại vé đã mua trực tuyến không?',
      answer: 'Theo chính sách của NASAFILM, tất cả vé xem phim và combo bắp nước đã được giao dịch và thanh toán thành công trực tuyến đều không thể hủy, đổi suất chiếu hoặc hoàn tiền dưới mọi hình thức để đảm bảo công bằng cho hệ thống đặt ghế trống theo thời gian thực.',
      icon: <Ticket className="text-red-500" size={18} />
    },
    {
      question: 'Sau khi thanh toán thành công, tôi nhận vé bằng cách nào?',
      answer: 'Sau khi thanh toán thành công, bạn sẽ nhận được mã vé điện tử ngay trên trang xác nhận và được lưu trữ trong mục "Vé của tôi" trong tài khoản cá nhân. Bạn chỉ cần xuất trình mã QR/Barcode này cho nhân viên soát vé tại rạp để vào phòng chiếu mà không cần phải xếp hàng in vé giấy tại quầy.',
      icon: <MessageSquare className="text-red-500" size={18} />
    },
    {
      question: 'Tôi có thể đặt tối đa bao nhiêu vé trong một giao dịch?',
      answer: 'Để tránh hiện tượng gom vé đầu cơ, hệ thống giới hạn mỗi giao dịch đặt vé trực tuyến được mua tối đa 8 ghế ngồi. Nếu quý khách có nhu cầu đặt vé số lượng lớn cho sự kiện, tập thể, vui lòng liên hệ hotline 1900 1234 để được hỗ trợ báo giá và đặt vé trực tiếp.',
      icon: <HelpCircle className="text-red-500" size={18} />
    },
    {
      question: 'Hệ thống tích điểm thành viên (Loyalty Score) hoạt động thế nào?',
      answer: 'Với mỗi giao dịch mua vé hoặc bắp nước trực tuyến khi đăng nhập tài khoản Customer, bạn sẽ được tích lũy điểm thưởng trực tiếp vào tài khoản (mức quy đổi được liệt kê chi tiết tại Tab thành viên trong Profile). Bạn có thể dùng điểm thưởng này để đổi lấy các phần quà hấp dẫn như nước ngọt, bắp rang bơ hoặc vé xem phim 2D/3D miễn phí.',
      icon: <Award className="text-red-500" size={18} />
    },
    {
      question: 'Tôi cần làm gì nếu không nhận được mã xác thực OTP khi đăng ký?',
      answer: 'Mã OTP được hệ thống gửi tự động về hòm thư Email đăng ký của bạn. Vui lòng kiểm tra kỹ cả hộp thư rác (Spam) hoặc mục Thư quảng cáo (Promotions). Nếu sau 2 phút vẫn chưa nhận được mã xác thực, bạn có thể bấm nút "Gửi lại mã OTP" trên giao diện đăng ký để hệ thống tạo mã mới.',
      icon: <Key className="text-red-500" size={18} />
    }
  ];

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
            Câu Hỏi Thường Gặp
          </motion.h1>
        </div>
      </section>

      {/* Accordion Layout FAQ */}
      <div className="legal-container">
        <div className="space-y-4">
          {faqData.map((faq, index) => {
            const isOpen = activeIndex === index;
            return (
              <motion.div 
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-red-500/20"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                {/* Header question */}
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-3 pr-4">
                    {faq.icon}
                    <span className="text-sm md:text-base font-bold text-white leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-red-500 flex-shrink-0"
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>

                {/* Answer body with accordion effect */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 md:px-6 md:pb-6 text-xs md:text-sm text-gray-400/90 leading-relaxed border-t border-white/5 pt-4 bg-white/[0.01]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
