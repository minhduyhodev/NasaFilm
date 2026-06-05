import React, { useState } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Shield, Award, Calendar, 
  MapPin, Edit2, Check, Lock, Ticket, 
  Gift, Bell, ShieldAlert, Key, LogOut, Camera, Star
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import './ProfilePage.css';

const PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=256',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256'
];

export const ProfilePage = () => {
  const { user, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Derived user details
  const displayRole = user?.roles?.includes('admin') ? 'Quản trị viên' : user?.roles?.includes('staff') ? 'Nhân viên' : 'Khách hàng';
  const roleColor = user?.roles?.includes('admin') ? 'role-admin' : user?.roles?.includes('staff') ? 'role-staff' : 'role-user';
  
  // Mock points/loyalty
  const loyaltyPoints = user?.score || 1250; 
  const nextTierPoints = 2000;
  const progressPercent = Math.min((loyaltyPoints / nextTierPoints) * 100, 100);
  const loyaltyTier = loyaltyPoints >= 2000 ? 'Platinum Explorer' : loyaltyPoints >= 1000 ? 'Gold Navigator' : 'Silver Crew';

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      notificationService.error('Họ tên không được để trống.');
      return;
    }
    
    // Simulate API update by updating local storage/auth context
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const updatedUser = { ...authUser, fullName, avatar: avatarUrl };
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      // Force reload auth state in context by writing directly to window context trigger if possible, 
      // or simply showing notification and advising refresh.
      notificationService.success('Cập nhật thông tin cá nhân thành công!');
      setIsEditing(false);
      
      // Auto reload to apply changes everywhere (Navbar etc.)
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e) {
      notificationService.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      notificationService.error('Vui lòng điền đầy đủ thông tin mật khẩu.');
      return;
    }
    if (newPassword !== confirmPassword) {
      notificationService.error('Mật khẩu mới không trùng khớp.');
      return;
    }
    if (newPassword.length < 6) {
      notificationService.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsChangingPass(true);
    // Simulation
    setTimeout(() => {
      notificationService.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPass(false);
    }, 1000);
  };

  const handleSelectAvatar = (url) => {
    setAvatarUrl(url);
    setShowAvatarModal(false);
  };

  // Predefined Mock Booking History
  const mockBookings = [
    {
      id: 'TKT-8849182',
      movieTitle: 'STELLAR HORIZON',
      poster: 'movie_stelar_horizon',
      cinema: 'NASA Landmark 81 - Phòng chiếu IMAX',
      showtime: '20:15 | Hôm nay, 06 Tháng 06',
      seats: 'G08, G09',
      combo: '1x Popcorn Max, 2x Pepsi Medium',
      price: '320.000đ',
      status: 'active'
    },
    {
      id: 'TKT-4412093',
      movieTitle: 'AETHERIA',
      poster: 'movie_aetheria',
      cinema: 'NASA Sunset Mall - Hall 3',
      showtime: '14:30 | 01 Tháng 06, 2026',
      seats: 'F12',
      combo: 'Không kèm bắp nước',
      price: '115.000đ',
      status: 'completed'
    }
  ];

  // Predefined Mock Vouchers
  const mockVouchers = [
    {
      code: 'NASAFIRST',
      title: 'Giảm 50k cho vé đầu tiên',
      desc: 'Áp dụng cho tất cả các suất chiếu IMAX và 3D.',
      expiry: 'Hạn dùng: 30/06/2026',
      type: 'discount'
    },
    {
      code: 'SWEETCOMBO',
      title: 'Miễn phí 1 bắp ngọt vừa',
      desc: 'Nhận kèm khi mua từ 2 vé xem phim bất kỳ.',
      expiry: 'Hạn dùng: 15/07/2026',
      type: 'freebie'
    }
  ];

  return (
    <div className="profile-wrapper">
      <div className="profile-container">
        
        {/* Profile Header Block */}
        <div className="profile-header-card">
          <div className="profile-header-stars" />
          <div className="profile-header-body">
            
            {/* Avatar block */}
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-frame">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="profile-avatar-image" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {fullName.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <button 
                  onClick={() => setShowAvatarModal(true)} 
                  className="profile-avatar-edit-btn"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>

            {/* Profile Brief Info */}
            <div className="profile-brief-details">
              <div className="profile-name-row">
                <h1 className="profile-full-name">{user?.fullName || 'Khách hàng'}</h1>
                <span className={`profile-role-badge ${roleColor}`}>{displayRole}</span>
              </div>
              <p className="profile-email-text">{user?.email}</p>
              
              <div className="profile-badges-row">
                <div className="profile-badge-item">
                  <MapPin size={14} className="text-blue-400" />
                  <span>TP. Hồ Chí Minh</span>
                </div>
                <div className="profile-badge-item">
                  <Calendar size={14} className="text-indigo-400" />
                  <span>Thành viên từ 2026</span>
                </div>
              </div>
            </div>

            {/* Loyalty Points Card */}
            <div className="profile-loyalty-card">
              <div className="loyalty-card-glow" />
              <div className="loyalty-header">
                <div className="loyalty-title-group">
                  <Award size={18} className="text-yellow-400" />
                  <span className="loyalty-tier-name">{loyaltyTier}</span>
                </div>
                <span className="loyalty-points-label">{loyaltyPoints} / {nextTierPoints} Pts</span>
              </div>
              
              <div className="loyalty-progress-container">
                <div className="loyalty-progress-bar" style={{ width: `${progressPercent}%` }} />
              </div>
              
              <p className="loyalty-footer-text">
                Còn {nextTierPoints - loyaltyPoints} điểm nữa để nâng cấp hạng thành viên tiếp theo.
              </p>
            </div>

          </div>
        </div>

        {/* Profile Main Content Layout */}
        <div className="profile-content-grid">
          
          {/* Left Menu / Tabs Switcher */}
          <div className="profile-sidebar-menu">
            <button 
              onClick={() => setActiveTab('info')} 
              className={`sidebar-menu-item ${activeTab === 'info' ? 'active' : ''}`}
            >
              <User size={18} />
              <span>Thông tin tài khoản</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('tickets')} 
              className={`sidebar-menu-item ${activeTab === 'tickets' ? 'active' : ''}`}
            >
              <Ticket size={18} />
              <span>Vé của tôi</span>
              <span className="sidebar-count-badge">1</span>
            </button>

            <button 
              onClick={() => setActiveTab('vouchers')} 
              className={`sidebar-menu-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            >
              <Gift size={18} />
              <span>Ưu đãi của tôi</span>
              <span className="sidebar-count-badge">{mockVouchers.length}</span>
            </button>

            <button 
              onClick={() => setActiveTab('security')} 
              className={`sidebar-menu-item ${activeTab === 'security' ? 'active' : ''}`}
            >
              <Key size={18} />
              <span>Cài đặt bảo mật</span>
            </button>
          </div>

          {/* Right Content Area */}
          <div className="profile-tab-content-card">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: Account Info */}
              {activeTab === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="tab-panel-body"
                >
                  <div className="panel-header">
                    <h2>Thông tin tài khoản</h2>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="panel-edit-btn">
                        <Edit2 size={14} />
                        <span>Chỉnh sửa</span>
                      </button>
                    ) : (
                      <div className="panel-editing-actions">
                        <button onClick={() => setIsEditing(false)} className="panel-cancel-btn">
                          Hủy
                        </button>
                        <button onClick={handleSaveProfile} className="panel-save-btn">
                          <Check size={14} />
                          <span>Lưu</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="profile-info-fields">
                    <div className="info-field-group">
                      <label>Họ và tên</label>
                      <div className="info-input-wrapper">
                        <User size={16} className="input-icon" />
                        <input 
                          type="text" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={!isEditing}
                          className={isEditing ? 'editable' : ''}
                        />
                      </div>
                    </div>

                    <div className="info-field-group">
                      <label>Địa chỉ Email</label>
                      <div className="info-input-wrapper disabled">
                        <Mail size={16} className="input-icon" />
                        <input 
                          type="email" 
                          value={user?.email || ''} 
                          disabled 
                        />
                        <Lock size={14} className="lock-icon" />
                      </div>
                    </div>

                    <div className="info-field-group">
                      <label>Phương thức đăng nhập</label>
                      <div className="info-input-wrapper disabled">
                        <Shield size={16} className="input-icon" />
                        <input 
                          type="text" 
                          value={user?.avatar?.includes('google') ? 'Google Sign-In' : 'Tài khoản thường'} 
                          disabled 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Verification notice */}
                  <div className="profile-security-alert">
                    <ShieldAlert size={20} className="alert-icon" />
                    <div className="alert-content">
                      <h4>Bảo mật tài khoản của bạn</h4>
                      <p>Email của bạn đã được xác minh thành công. Chúng tôi khuyên bạn không nên chia sẻ mã xác minh OTP với bất kỳ ai để giữ an toàn cho ví tiền và vé đã đặt.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: Tickets History */}
              {activeTab === 'tickets' && (
                <motion.div
                  key="tickets"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="tab-panel-body"
                >
                  <div className="panel-header">
                    <h2>Vé của tôi</h2>
                  </div>

                  <div className="tickets-list">
                    {mockBookings.map((tkt) => (
                      <div key={tkt.id} className={`ticket-stub-card ${tkt.status}`}>
                        <div className="ticket-cutout-left" />
                        <div className="ticket-cutout-right" />
                        
                        <div className="ticket-main-section">
                          <span className={`ticket-status-badge ${tkt.status}`}>
                            {tkt.status === 'active' ? 'Chưa chiếu' : 'Đã xem'}
                          </span>
                          
                          <h3 className="ticket-movie-title">{tkt.movieTitle}</h3>
                          
                          <div className="ticket-details-grid">
                            <div className="ticket-detail">
                              <span className="label">Rạp chiếu</span>
                              <span className="value">{tkt.cinema}</span>
                            </div>
                            <div className="ticket-detail">
                              <span className="label">Suất chiếu</span>
                              <span className="value text-blue-400">{tkt.showtime}</span>
                            </div>
                            <div className="ticket-detail">
                              <span className="label">Ghế</span>
                              <span className="value text-indigo-400">{tkt.seats}</span>
                            </div>
                            <div className="ticket-detail">
                              <span className="label">Đồ ăn & Nước</span>
                              <span className="value">{tkt.combo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ticket-separator">
                          <div className="dashed-line" />
                        </div>

                        <div className="ticket-barcode-section">
                          <span className="ticket-id">{tkt.id}</span>
                          <div className="barcode-mock" />
                          <span className="ticket-price">{tkt.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: Vouchers */}
              {activeTab === 'vouchers' && (
                <motion.div
                  key="vouchers"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="tab-panel-body"
                >
                  <div className="panel-header">
                    <h2>Ưu đãi của bạn</h2>
                  </div>

                  <div className="vouchers-grid">
                    {mockVouchers.map((voucher) => (
                      <div key={voucher.code} className="voucher-card">
                        <div className="voucher-glow-dot" />
                        <div className="voucher-icon-box">
                          <Gift size={24} className="text-violet-400" />
                        </div>
                        <div className="voucher-body">
                          <span className="voucher-code">{voucher.code}</span>
                          <h4 className="voucher-title">{voucher.title}</h4>
                          <p className="voucher-desc">{voucher.desc}</p>
                          <span className="voucher-expiry">{voucher.expiry}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: Security Settings */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="tab-panel-body"
                >
                  <div className="panel-header">
                    <h2>Đổi mật khẩu</h2>
                  </div>

                  <form onSubmit={handlePasswordChange} className="password-change-form">
                    <div className="info-field-group">
                      <label>Mật khẩu hiện tại</label>
                      <div className="info-input-wrapper">
                        <Lock size={16} className="input-icon" />
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="info-field-group">
                      <label>Mật khẩu mới</label>
                      <div className="info-input-wrapper">
                        <Key size={16} className="input-icon" />
                        <input 
                          type="password" 
                          placeholder="Mật khẩu tối thiểu 6 ký tự" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="info-field-group">
                      <label>Xác nhận mật khẩu mới</label>
                      <div className="info-input-wrapper">
                        <Key size={16} className="input-icon" />
                        <input 
                          type="password" 
                          placeholder="Nhập lại mật khẩu mới" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isChangingPass} 
                      className="password-submit-btn"
                    >
                      {isChangingPass ? 'Đang thực hiện...' : 'Cập nhật mật khẩu'}
                    </button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Avatar Presets Selection Modal */}
      {showAvatarModal && (
        <div className="avatar-modal-overlay">
          <div className="avatar-modal-card">
            <h3>Chọn ảnh đại diện của bạn</h3>
            
            <div className="avatar-presets-grid">
              {PRESETS.map((url, index) => (
                <button 
                  key={index}
                  onClick={() => handleSelectAvatar(url)}
                  className="preset-avatar-btn"
                >
                  <img src={url} alt={`Preset ${index + 1}`} />
                </button>
              ))}
            </div>

            <div className="avatar-modal-actions">
              <button onClick={() => setShowAvatarModal(false)} className="avatar-modal-close">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
