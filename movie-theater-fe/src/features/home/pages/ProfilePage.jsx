import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { authService } from '../../auth/api/authService';
import { AuthInput } from '../../auth/components/AuthInput';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  User, Mail, Shield, Award, Calendar, 
  MapPin, Edit2, Check, Lock, Ticket, 
  Gift, Bell, ShieldAlert, Key, LogOut, Camera, Star,
  X, Search, History, Phone
} from 'lucide-react';
import { notificationService } from '../../../shared/services/notificationService';
import { useNotification } from '../../../shared/context/NotificationContext';
import './ProfilePage.css';

export const ProfilePage = () => {
  const { user, logout, updateUser } = useAuthContext();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [authProvider, setAuthProvider] = useState('LOCAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch real profile data from Backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (data) {
          setFullName(data.fullName || '');
          setPhoneNumber(data.phoneNumber || '');
          setAvatarUrl(data.avatarUrl || '');
          setAuthProvider(data.authProvider || 'LOCAL');
        }
      } catch (err) {
        notificationService.error('Không thể tải thông tin cá nhân từ máy chủ.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notificationService.error('Vui lòng chọn file hình ảnh hợp lệ.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notificationService.error('Dung lượng hình ảnh không được vượt quá 5MB.');
      return;
    }

    setIsSaving(true);
    try {
      const data = await authService.uploadAvatar(file);
      if (data) {
        setAvatarUrl(data.avatarUrl);
        
        // Update user context dynamically for Navbar/Header
        const updatedUser = {
          ...user,
          avatar: data.avatarUrl,
        };
        updateUser(updatedUser);
        addNotification(
          'Cập nhật ảnh đại diện thành công',
          'Ảnh đại diện của bạn đã được cập nhật thành công.',
          'success'
        );
      }
    } catch (err) {
      addNotification(
        'Tải ảnh đại diện thất bại',
        err.message || 'Không thể tải lên ảnh đại diện của bạn.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };
  
  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Purchase History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Derived user details
  const displayRole = user?.roles?.includes('admin') ? 'Quản trị viên' : user?.roles?.includes('staff') ? 'Nhân viên' : 'Khách hàng';
  const roleColor = user?.roles?.includes('admin') ? 'role-admin' : user?.roles?.includes('staff') ? 'role-staff' : 'role-user';
  
  // Mock points/loyalty
  const loyaltyPoints = user?.score || 1250; 
  const nextTierPoints = 2000;
  const progressPercent = Math.min((loyaltyPoints / nextTierPoints) * 100, 100);
  const loyaltyTier = loyaltyPoints >= 2000 ? 'Platinum Explorer' : loyaltyPoints >= 1000 ? 'Gold Navigator' : 'Silver Crew';

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      notificationService.error('Họ tên không được để trống.');
      return;
    }
    
    setIsSaving(true);
    try {
      const data = await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null
      });

      if (data) {
        setFullName(data.fullName || '');
        setPhoneNumber(data.phoneNumber || '');
        
        // Update user context dynamically
        const updatedUser = {
          ...user,
          fullName: data.fullName,
          avatar: data.avatarUrl,
        };
        updateUser(updatedUser);

        addNotification(
          'Cập nhật thông tin thành công',
          'Thông tin cá nhân của bạn đã được cập nhật thành công.',
          'success'
        );
        setIsEditing(false);
      }
    } catch (err) {
      addNotification(
        'Cập nhật thông tin thất bại',
        err.message || 'Đã xảy ra lỗi khi cập nhật thông tin cá nhân.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (authProvider === 'GOOGLE') {
      notificationService.error('Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.');
      return;
    }
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
    try {
      await authService.updateProfile({
        currentPassword,
        newPassword
      });
      addNotification(
        'Đổi mật khẩu thành công',
        'Mật khẩu tài khoản của bạn đã được thay đổi thành công.',
        'success'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addNotification(
        'Đổi mật khẩu thất bại',
        err.message || 'Thay đổi mật khẩu không thành công.',
        'error'
      );
    } finally {
      setIsChangingPass(false);
    }
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

  // Predefined Mock Transactions
  const mockTransactions = [];

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="profile-wrapper flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-t-red-600 border-slate-800 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium text-sm">Đang tải thông tin tài khoản...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="profile-wrapper">
      <div className="profile-container">
        
        {/* Profile Header Block */}
        <div className="profile-header-card">
          <div className="profile-header-cover">
            <div className="profile-header-stars" />
          </div>
          <div className="profile-header-info-bar">
            
            {/* Avatar block */}
            <div className="profile-avatar-wrapper">
              <div 
                onClick={() => !isSaving && fileInputRef.current.click()} 
                className={`profile-avatar-frame cursor-pointer hover:scale-105 transition-all duration-300 ${isSaving ? 'opacity-50' : ''}`}
                title="Thay đổi ảnh đại diện"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="profile-avatar-image" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                {isSaving ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                    <div className="w-6 h-6 border-2 border-t-red-600 border-white/20 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="profile-avatar-edit-btn">
                    <Camera size={16} />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
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
                  <MapPin size={14} className="text-red-500" />
                  <span>TP. Hồ Chí Minh</span>
                </div>
                <div className="profile-badge-item">
                  <Calendar size={14} className="text-amber-500" />
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
              <span>Thông tin khách hàng</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('member')} 
              className={`sidebar-menu-item ${activeTab === 'member' ? 'active' : ''}`}
            >
              <Award size={18} />
              <span>Thành viên NASAFilm</span>
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

            <button 
              onClick={() => setShowHistoryModal(true)} 
              className="sidebar-menu-item text-slate-400 hover:text-white"
            >
              <History size={18} />
              <span>Lịch sử mua hàng</span>
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
                    <h2>Thông tin khách hàng</h2>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="panel-edit-btn">
                        <Edit2 size={14} />
                        <span>Chỉnh sửa</span>
                      </button>
                    ) : (
                      <div className="panel-editing-actions">
                        <button onClick={() => setIsEditing(false)} disabled={isSaving} className="panel-cancel-btn">
                          Hủy
                        </button>
                        <button onClick={handleSaveProfile} disabled={isSaving} className="panel-save-btn">
                          {isSaving ? (
                            <span>Đang lưu...</span>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Lưu</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="profile-info-rows">
                    
                    {/* Row 1: Họ và tên */}
                    <div className="profile-info-row">
                      <div className="info-row-left">
                        <User size={18} className="text-red-500" />
                        <span className="info-row-label">Họ và tên</span>
                      </div>
                      <div className="info-row-right">
                        <input 
                          type="text" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={!isEditing || isSaving}
                          className={`info-row-input ${isEditing ? 'editable' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Row 2: Số điện thoại */}
                    <div className="profile-info-row">
                      <div className="info-row-left">
                        <Phone size={18} className="text-red-500" />
                        <span className="info-row-label">Số điện thoại</span>
                      </div>
                      <div className="info-row-right">
                        <input 
                          type="text" 
                          value={phoneNumber} 
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          disabled={!isEditing || isSaving}
                          className={`info-row-input ${isEditing ? 'editable' : ''}`}
                          placeholder={isEditing ? "Nhập số điện thoại" : "Chưa cập nhật số điện thoại"}
                        />
                      </div>
                    </div>

                    {/* Row 3: Email */}
                    <div className="profile-info-row">
                      <div className="info-row-left">
                        <Mail size={18} className="text-red-500" />
                        <span className="info-row-label">Địa chỉ Email</span>
                      </div>
                      <div className="info-row-right">
                        <span className="info-row-text">{user?.email || ''}</span>
                      </div>
                    </div>

                    {/* Row 4: Phương thức đăng nhập */}
                    <div className="profile-info-row">
                      <div className="info-row-left">
                        <Shield size={18} className="text-red-500" />
                        <span className="info-row-label">Phương thức đăng nhập</span>
                      </div>
                      <div className="info-row-right">
                        <span className="info-row-text">
                          {authProvider === 'GOOGLE' ? 'Google Sign-In' : 'Tài khoản thường'}
                        </span>
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

              {/* TAB: NASAFilm Member */}
              {activeTab === 'member' && (
                <motion.div
                  key="member"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="tab-panel-body"
                >
                  {/* Header Title */}
                  <div className="panel-header mb-6">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase">ĐĂNG KÝ THÀNH VIÊN</h2>
                  </div>

                  {/* Points Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-300 mb-2">
                      <span className="uppercase tracking-wider">Tích điểm N'VIP MEMBER</span>
                      <span className="text-yellow-400 font-mono text-base">{loyaltyPoints}/10K</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-red-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((loyaltyPoints / 10000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Horizontal line separator */}
                  <div className="border-t border-slate-800 my-6" />

                  {/* Grid layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    
                    {/* Column 1: N'FRIEND */}
                    <div className="flex flex-col justify-between bg-slate-950/40 border border-white/5 rounded-2xl p-6">
                      <div>
                        {/* NASA'FRIEND card mockup */}
                        <div 
                          className="relative w-full aspect-[1.58/1] rounded-2xl overflow-hidden border border-red-500/20 shadow-2xl p-6 mb-6 flex flex-col justify-between"
                          style={{
                            backgroundImage: `linear-gradient(to right, rgba(185, 28, 28, 0.85), rgba(15, 23, 42, 0.65)), url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundBlendMode: 'overlay'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="text-3xl font-black italic tracking-widest text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              NASA'FRIEND
                            </h4>
                          </div>
                          
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-slate-300 font-bold">Thẻ thành viên</p>
                              <p className="text-sm font-semibold text-white mt-0.5">{fullName || 'Khách hàng'}</p>
                            </div>
                            <p className="text-xs font-mono text-slate-300">NSF-FRIEND</p>
                          </div>
                        </div>

                        {/* Title & Info */}
                        <h3 className="text-xl font-extrabold text-white mb-2 uppercase">NASA'FRIEND</h3>
                        <p className="text-sm text-slate-300 mb-4 font-semibold">
                          Được cấp lần đầu khi mua 2 vé xem phim bất kỳ tại NASAFilm.
                        </p>

                        <h4 className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-3 border-b border-slate-800 pb-1">
                          ĐƯỢC TÍCH LŨY ĐIỂM THEO GIÁ TRỊ MUA HÀNG HÓA DỊCH VỤ NHƯ SAU:
                        </h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                          <li>Được giảm <span className="text-yellow-400 font-bold">10%</span> trực tiếp trên giá trị hóa đơn bắp nước khi mua tại quầy.</li>
                          <li>Được tặng <span className="text-yellow-400 font-bold">1 vé xem phim 2D</span> vào tuần sinh nhật (tính từ Thứ Hai đến Chủ Nhật) với số điểm tích lũy tối thiểu 500 điểm.</li>
                          <li>Được tham gia các chương trình dành cho thành viên.</li>
                        </ul>
                      </div>

                      {/* Member status button */}
                      <div className="mt-8">
                        <button className="w-full py-3 bg-[#cbd5e1] text-[#1e293b] font-black text-sm uppercase rounded-lg tracking-widest shadow-lg cursor-default">
                          BẠN ĐÃ LÀ THÀNH VIÊN NASA'FRIEND
                        </button>
                      </div>
                    </div>

                    {/* Column 2: N'VIP */}
                    <div className="flex flex-col justify-between bg-slate-950/40 border border-white/5 rounded-2xl p-6">
                      <div>
                        {/* NASA'VIP card mockup */}
                        <div className="relative w-full aspect-[1.58/1] rounded-2xl overflow-hidden border border-red-500/30 shadow-[0_15px_30px_rgba(220,38,38,0.1)] bg-[#0c0a1a] p-6 mb-6 flex flex-col justify-between">
                          {/* Inner glowing radial circular patterns like in the image */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.15),transparent_70%)] pointer-events-none" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-red-500/10 rounded-full pointer-events-none" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-red-500/20 rounded-full pointer-events-none" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-amber-500/15 rounded-full pointer-events-none" />
                          
                          {/* Center round logo badge */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-gradient-to-b from-[#2d0f14] to-[#0d0708] border-2 border-red-600 rounded-full w-24 h-24 shadow-[0_0_20px_rgba(220,38,38,0.25)]">
                            <span className="text-yellow-500 text-base leading-none">★</span>
                            <span className="text-yellow-400 text-lg font-black italic tracking-tighter mt-0.5">NASA'VIP</span>
                          </div>

                          <div className="flex justify-between items-start z-10">
                            <span className="text-[10px] text-yellow-400 font-black tracking-widest uppercase">
                              VIP Card
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">NS-VIP</span>
                          </div>
                          
                          <div className="flex justify-between items-end z-10">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest text-yellow-500/80 font-bold">Thành viên VIP</p>
                              <p className="text-sm font-semibold text-slate-200 mt-0.5">{fullName || 'Khách hàng'}</p>
                            </div>
                            <p className="text-xs font-mono text-yellow-400/80 font-bold">NSF-VIP</p>
                          </div>
                        </div>

                        {/* Title & Info */}
                        <h3 className="text-xl font-extrabold text-white mb-2 uppercase">NASA'VIP</h3>
                        <p className="text-sm text-slate-300 mb-4 font-semibold">
                          Được cấp cho thành viên NASA'Friend khi tích lũy được ít nhất 10.000 điểm.
                        </p>

                        <h4 className="text-xs font-bold text-yellow-500 tracking-wider uppercase mb-3 border-b border-slate-800 pb-1">
                          ĐƯỢC TÍCH LŨY ĐIỂM THEO GIÁ TRỊ MUA HÀNG HÓA DỊCH VỤ NHƯ SAU:
                        </h4>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                          <li>Được giảm <span className="text-yellow-400 font-bold">15%</span> trực tiếp trên giá trị hóa đơn bắp nước khi mua tại quầy.</li>
                          <li>Có cơ hội nhận vé tham gia Lễ Ra Mắt Phim và các chương trình khuyến mãi khác của NASAFilm.</li>
                        </ul>
                      </div>

                      {/* Progress/Condition placeholder */}
                      <div className="mt-8">
                        <div className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-500 font-black text-sm uppercase rounded-lg text-center tracking-widest shadow-md">
                          CẦN TÍCH LŨY 10.000 ĐIỂM
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Horizontal line separator */}
                  <div className="border-t border-slate-800 my-8" />

                  {/* Table Section: MỨC THƯỞNG THẺ THÀNH VIÊN */}
                  <div className="bg-[#0b0a1a] border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 via-yellow-500 to-red-600" />
                    
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-yellow-400 uppercase">
                        MỨC THƯỞNG THẺ THÀNH VIÊN
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Bảng quy đổi quà tặng của NASAFilm</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-800 text-xs font-bold uppercase tracking-wider text-yellow-400 bg-white/5">
                            <th className="py-4 px-4 flex items-center gap-2">
                              <Ticket size={14} className="text-yellow-400" />
                              LOẠI THẺ
                            </th>
                            <th className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Award size={14} className="text-yellow-400" />
                                MỨC ĐIỂM
                              </div>
                            </th>
                            <th className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Gift size={14} className="text-yellow-400" />
                                MỨC THƯỞNG <span className="text-[10px] text-slate-400 font-normal lowercase">(Hoặc dùng để tích điểm)</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-800/50">
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">Mua 2 vé xem phim</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">0</td>
                            <td className="py-3 px-4 text-slate-300">Cấp thẻ NASA'FRIEND</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">1.000</td>
                            <td className="py-3 px-4 text-slate-300">1 Coke 16 Oz</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">1.500</td>
                            <td className="py-3 px-4 text-slate-300">1 Popcorn 32 Oz</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">2.000</td>
                            <td className="py-3 px-4 text-slate-300">1 Coke 16 Oz + 1 Popcorn 32 Oz</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">2.500</td>
                            <td className="py-3 px-4 text-slate-300">2 Coke 16 Oz + 1 Popcorn 32 Oz</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">3.000</td>
                            <td className="py-3 px-4 text-slate-300">1 vé xem phim 2D</td>
                          </tr>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">NASA'FRIEND</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">4.000</td>
                            <td className="py-3 px-4 text-slate-300">1 vé xem phim 3D</td>
                          </tr>
                          <tr className="bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors font-bold text-yellow-400">
                            <td className="py-4 px-4 uppercase tracking-wider">NASA'VIP</td>
                            <td className="py-4 px-4 font-mono text-yellow-300">10.000</td>
                            <td className="py-4 px-4 uppercase tracking-wide text-yellow-300">CẤP THẺ NASA'VIP</td>
                          </tr>
                        </tbody>
                      </table>
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
                    <button 
                      onClick={() => setShowHistoryModal(true)} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-lg transition duration-200"
                    >
                      <History size={14} />
                      <span>Lịch sử mua hàng</span>
                    </button>
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
                              <span className="value text-red-500">{tkt.showtime}</span>
                            </div>
                            <div className="ticket-detail">
                              <span className="label">Ghế</span>
                              <span className="value text-amber-500">{tkt.seats}</span>
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
                          <Gift size={24} className="text-amber-500" />
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

                  {authProvider === 'GOOGLE' ? (
                    <div className="profile-security-alert">
                      <ShieldAlert size={20} className="alert-icon text-yellow-500" />
                      <div className="alert-content">
                        <h4>Tính năng không khả dụng</h4>
                        <p>Tài khoản của bạn đăng nhập thông qua Google Sign-In. Mật khẩu được quản lý trực tiếp bởi Google, do đó không thể đổi mật khẩu tại đây.</p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordChange} className="password-change-form">
                      <div className="info-field-group">
                        <label>Mật khẩu hiện tại</label>
                        <AuthInput
                          placeholder="••••••••"
                          type="password"
                          icon={<Lock size={16} />}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          disabled={isChangingPass}
                          showPasswordToggle={true}
                          showPassword={showCurrentPassword}
                          onPasswordToggle={() => setShowCurrentPassword((prev) => !prev)}
                        />
                        <div className="info-input-wrapper hidden">
                          <Lock size={16} className="input-icon" />
                          <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isChangingPass}
                          />
                        </div>
                      </div>

                      <div className="info-field-group">
                        <label>Mật khẩu mới</label>
                        <AuthInput
                          placeholder="Mật khẩu tối thiểu 6 ký tự"
                          type="password"
                          icon={<Key size={16} />}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={isChangingPass}
                          showPasswordToggle={true}
                          showPassword={showNewPassword}
                          onPasswordToggle={() => setShowNewPassword((prev) => !prev)}
                        />
                        <div className="info-input-wrapper hidden">
                          <Key size={16} className="input-icon" />
                          <input 
                            type="password" 
                            placeholder="Mật khẩu tối thiểu 6 ký tự" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isChangingPass}
                          />
                        </div>
                      </div>

                      <div className="info-field-group">
                        <label>Xác nhận mật khẩu mới</label>
                        <AuthInput
                          placeholder="Nhập lại mật khẩu mới"
                          type="password"
                          icon={<Key size={16} />}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isChangingPass}
                          showPasswordToggle={true}
                          showPassword={showConfirmPassword}
                          onPasswordToggle={() => setShowConfirmPassword((prev) => !prev)}
                        />
                        <div className="info-input-wrapper hidden">
                          <Key size={16} className="input-icon" />
                          <input 
                            type="password" 
                            placeholder="Nhập lại mật khẩu mới" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isChangingPass}
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
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>



      {/* Purchase History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <History className="text-yellow-400" size={20} />
                <h3 className="text-lg font-bold text-white">Lịch sử mua hàng</h3>
              </div>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedTransaction(null);
                }} 
                className="text-slate-400 hover:text-white transition duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Spend Summary */}
            <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-white/[0.02] border-b border-white/5 text-center">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Tổng chi tiêu</p>
                <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 mt-1">
                  {mockTransactions.length === 0 ? '0đ' : mockTransactions.reduce((sum, txn) => sum + parseInt(txn.amount.replace(/\./g, '')), 0).toLocaleString('vi-VN') + 'đ'}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Số lượng vé</p>
                <p className="text-lg font-black text-red-500 mt-1">
                  {mockTransactions.length === 0 ? '0' : mockTransactions.filter(txn => txn.type === 'ticket').length} vé
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Số lượng combo</p>
                <p className="text-lg font-black text-amber-500 mt-1">
                  {mockTransactions.length === 0 ? '0' : mockTransactions.filter(txn => txn.type === 'combo').length} combo
                </p>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-b border-white/5 bg-white/[0.01]">
              {/* Filter Tabs */}
              <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
                <button 
                  onClick={() => setHistoryFilter('all')} 
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition duration-200 ${historyFilter === 'all' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => setHistoryFilter('ticket')} 
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition duration-200 ${historyFilter === 'ticket' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Vé xem phim
                </button>
                <button 
                  onClick={() => setHistoryFilter('combo')} 
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition duration-200 ${historyFilter === 'combo' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Bắp nước
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm theo mã giao dịch, tên..." 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar min-h-[300px]">
              {selectedTransaction ? (
                /* Detailed Transaction Receipt */
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 max-w-lg mx-auto shadow-inner relative">
                  <button 
                    onClick={() => setSelectedTransaction(null)} 
                    className="absolute top-4 left-4 text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    ← Quay lại
                  </button>

                  <div className="text-center border-b border-dashed border-white/10 pb-4 mb-4 mt-4">
                    <h4 className="text-base font-bold text-white uppercase tracking-wider">Hóa đơn điện tử</h4>
                    <p className="text-xs text-slate-400 mt-1">Mã GD: {selectedTransaction.id}</p>
                    <p className="text-xs text-slate-400">{selectedTransaction.date}</p>
                  </div>

                  <div className="space-y-3 text-sm text-slate-300 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Địa điểm rạp:</span>
                      <span className="font-semibold text-white text-right max-w-[200px]">{selectedTransaction.details.cinema}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vị trí ghế:</span>
                      <span className="font-semibold text-white">{selectedTransaction.details.seats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Đồ ăn thức uống:</span>
                      <span className="font-semibold text-white text-right max-w-[200px]">{selectedTransaction.details.combo}</span>
                    </div>
                    <div className="border-t border-slate-800 my-2 pt-2" />
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tiền vé:</span>
                      <span>{selectedTransaction.details.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tiền combo:</span>
                      <span>{selectedTransaction.details.comboPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phương thức:</span>
                      <span className="text-red-500 font-bold">{selectedTransaction.method}</span>
                    </div>
                    <div className="border-t-2 border-dashed border-white/10 my-2 pt-3" />
                    <div className="flex justify-between text-base font-extrabold">
                      <span className="text-white">Tổng cộng:</span>
                      <span className="text-yellow-400">{selectedTransaction.details.total}</span>
                    </div>
                  </div>

                  {/* Mock Barcode inside Invoice */}
                  <div className="flex flex-col items-center justify-center pt-2 border-t border-slate-800">
                    <div className="h-10 w-48 bg-repeating-linear-gradient(90deg,#fff,#fff 2px,#0f172a 2px,#0f172a 6px,#fff 6px,#fff 8px) opacity-50 mb-2" />
                    <span className="text-[10px] font-mono text-slate-500">NSF-{selectedTransaction.id}</span>
                  </div>
                </div>
              ) : (
                /* Transaction List */
                <div className="space-y-3">
                  {mockTransactions
                    .filter(txn => historyFilter === 'all' || txn.type === historyFilter)
                    .filter(txn => 
                      txn.id.toLowerCase().includes(historySearch.toLowerCase()) || 
                      txn.itemName.toLowerCase().includes(historySearch.toLowerCase())
                    )
                    .map((txn) => (
                      <div 
                        key={txn.id} 
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition duration-200 gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${txn.type === 'ticket' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-500'}`}>
                            {txn.type === 'ticket' ? <Ticket size={18} /> : <Gift size={18} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-snug">{txn.itemName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {txn.date} | Mã GD: <span className="font-mono text-slate-300">{txn.id}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto border-t sm:border-0 border-white/5 pt-2 sm:pt-0 gap-2">
                          <span className="text-sm font-black text-yellow-400">{txn.amount}</span>
                          <button 
                            onClick={() => setSelectedTransaction(txn)}
                            className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline transition duration-200"
                          >
                            Chi tiết hóa đơn →
                          </button>
                        </div>
                      </div>
                    ))}

                  {/* Empty State */}
                  {mockTransactions
                    .filter(txn => historyFilter === 'all' || txn.type === historyFilter)
                    .filter(txn => 
                      txn.id.toLowerCase().includes(historySearch.toLowerCase()) || 
                      txn.itemName.toLowerCase().includes(historySearch.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-12">
                        <History className="mx-auto text-slate-600 mb-3" size={40} />
                        <p className="text-sm text-slate-400">Không tìm thấy giao dịch nào phù hợp</p>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-white/10 bg-[#white/5]">
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedTransaction(null);
                }} 
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition duration-200"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
      <Footer />
    </>
  );
};

export default ProfilePage;
