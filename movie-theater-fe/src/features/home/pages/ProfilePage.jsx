import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../../auth/hooks/useAuthContext";
import { authService } from "../../auth/api/authService";
import { AuthInput } from "../../auth/components/AuthInput";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeAvatarUrl } from "../../../shared/utils/avatarUrl";
import {
  User,
  Mail,
  Shield,
  Award,
  Calendar,
  MapPin,
  Edit2,
  Check,
  Lock,
  Ticket,
  Gift,
  Bell,
  ShieldAlert,
  Key,
  LogOut,
  Camera,
  Star,
  X,
  History,
  Phone,
  ChevronDown,
} from "lucide-react";
import { notificationService } from "../../../shared/services/notificationService";
import { useNotification } from "../../../shared/context/NotificationContext";
import { useMyBookings, useInvalidateMyBookings } from "../../../shared/hooks/queries/useBookingQueries";
import CancelBookingModal from "../../../shared/components/CancelBookingModal";
import RefundDetailModal from "../../../shared/components/RefundDetailModal";
import PurchaseHistoryPanel from "../components/PurchaseHistoryPanel";
import Pagination from "../../../shared/components/Pagination";
import ProfileTicketCard from "../components/ProfileTicketCard";
import { promotionService } from "../../../shared/services/promotionService";
import {
  isOnlineBooking,
  isLiveTicket,
  partitionBookingsByLive,
  getOnlineMoviePath,
} from "../utils/movieUtils";
import { vodService } from "../../../shared/services/vodService";
import { resolveTierFromLifetime } from "../../../shared/utils/memberTiers";
import "./ProfilePage.css";

export const ProfilePage = () => {
  const { user, logout, updateUser } = useAuthContext();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);

  const handleTicketClick = async (tkt) => {
    if (isOnlineBooking(tkt)) {
      await handleVodTicketClick(tkt);
      return;
    }

    if (tkt.bookingUuid) {
      navigate(`/pre-show/boarding/${tkt.bookingUuid}`);
    }
  };

  const handleVodTicketClick = async (tkt) => {
    if (!tkt?.movieUuid) {
      notificationService.info("Không tìm thấy phim cho vé online này.");
      return;
    }
    try {
      const status = await vodService.getStatus(tkt.movieUuid);
      navigate(getOnlineMoviePath(tkt.movieUuid, status));
    } catch {
      navigate(`/online/activate/${tkt.movieUuid}`);
    }
  };
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dayOfBirth, setDayOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
  const [authProvider, setAuthProvider] = useState("LOCAL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const { data: bookings = [], isLoading: isLoadingBookings, refetch: refetchBookings } = useMyBookings(Boolean(user));
  const invalidateBookings = useInvalidateMyBookings();
  const [cancelTargetUuid, setCancelTargetUuid] = useState(null);
  const [refundTargetUuid, setRefundTargetUuid] = useState(null);
  const [showArchivedTickets, setShowArchivedTickets] = useState(false);
  const [liveTicketPage, setLiveTicketPage] = useState(1);
  const [archivedTicketPage, setArchivedTicketPage] = useState(1);
  const [ticketsPerPage, setTicketsPerPage] = useState(4);
  const [vouchers, setVouchers] = useState([]);
  const [voucherCatalog, setVoucherCatalog] = useState([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [redeemingVoucherId, setRedeemingVoucherId] = useState(null);
  const fileInputRef = useRef(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const genderDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        genderDropdownRef.current &&
        !genderDropdownRef.current.contains(event.target)
      ) {
        setShowGenderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const reloadBookings = async () => {
    await invalidateBookings();
    await refetchBookings();
  };

  const { live: liveBookings, archived: archivedBookings } = useMemo(
    () => partitionBookingsByLive(bookings),
    [bookings],
  );

  const liveTicketCount = useMemo(
    () => bookings.filter(isLiveTicket).length,
    [bookings],
  );

  const paginatedLiveBookings = useMemo(() => {
    const start = (liveTicketPage - 1) * ticketsPerPage;
    return liveBookings.slice(start, start + ticketsPerPage);
  }, [liveBookings, liveTicketPage, ticketsPerPage]);

  const paginatedArchivedBookings = useMemo(() => {
    const start = (archivedTicketPage - 1) * ticketsPerPage;
    return archivedBookings.slice(start, start + ticketsPerPage);
  }, [archivedBookings, archivedTicketPage, ticketsPerPage]);

  useEffect(() => {
    setLiveTicketPage(1);
    setArchivedTicketPage(1);
  }, [bookings.length]);

  // Get date string for exactly 12 years ago
  const getMaxBirthDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 12);
    return date.toISOString().split("T")[0];
  };

  // Fetch real profile data from Backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        if (data) {
          setFullName(data.fullName || "");
          setPhoneNumber(data.phoneNumber || "");
          setAvatarUrl(data.avatarUrl || "");
          setAuthProvider(data.authProvider || "LOCAL");
          setDayOfBirth(data.dayOfBirth || "");
          setGender(data.gender || "");
          setProfileData(data);
        }
      } catch (err) {
        notificationService.error(
          "Không thể tải thông tin cá nhân từ máy chủ.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchVouchers = async () => {
      setIsLoadingVouchers(true);
      try {
        const [wallet, catalog] = await Promise.all([
          promotionService.getMyVouchers(),
          promotionService.getVoucherCatalog(),
        ]);
        setVouchers(wallet || []);
        setVoucherCatalog(catalog || []);
      } catch (err) {
        console.error("Failed to load user vouchers:", err);
      } finally {
        setIsLoadingVouchers(false);
      }
    };
    if (user) {
      fetchVouchers();
    }
  }, [user]);

  const handleRedeemVoucher = async (promotionId) => {
    setRedeemingVoucherId(promotionId);
    try {
      await promotionService.redeemVoucher(promotionId);
      notificationService.success(
        "Đổi voucher thành công. Voucher đã được thêm vào ví của bạn.",
      );
      const refreshedProfile = await authService.getProfile();
      setProfileData(refreshedProfile);
      const [wallet, catalog] = await Promise.all([
        promotionService.getMyVouchers(),
        promotionService.getVoucherCatalog(),
      ]);
      setVouchers(wallet || []);
      setVoucherCatalog(catalog || []);
    } catch (err) {
      notificationService.error(err.message || "Không thể đổi voucher");
    } finally {
      setRedeemingVoucherId(null);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notificationService.error("Vui lòng chọn file hình ảnh hợp lệ.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notificationService.error("Dung lượng hình ảnh không được vượt quá 5MB.");
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
          "Cập nhật ảnh đại diện thành công",
          "Ảnh đại diện của bạn đã được cập nhật thành công.",
          "success",
        );
      }
    } catch (err) {
      addNotification(
        "Tải ảnh đại diện thất bại",
        err.message || "Không thể tải lên ảnh đại diện của bạn.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Derived user details
  const displayRole = user?.roles?.includes("admin")
    ? "Quản trị viên"
    : user?.roles?.includes("staff")
      ? "Nhân viên"
      : "Khách hàng";
  const roleColor = user?.roles?.includes("admin")
    ? "role-admin"
    : user?.roles?.includes("staff")
      ? "role-staff"
      : "role-user";

  const currentPoints =
    profileData && typeof profileData.score === "number"
      ? profileData.score
      : user && typeof user.score === "number"
        ? user.score
        : 0;
  const lifetimePoints =
    profileData && typeof profileData.lifetimeScore === "number"
      ? profileData.lifetimeScore
      : currentPoints;
  const nextTierPoints = 10000;
  const rawProgress = (lifetimePoints / nextTierPoints) * 100;
  const progressPercent = isNaN(rawProgress) ? 0 : Math.min(rawProgress, 100);
  const loyaltyTier = resolveTierFromLifetime(lifetimePoints).label;

  const usableVouchers = useMemo(
    () => vouchers.filter((v) => !v.used),
    [vouchers],
  );
  const pointVoucherCatalog = useMemo(
    () => voucherCatalog.filter((item) => item.requiresRedemption !== false),
    [voucherCatalog],
  );
  const availableVoucherCount = useMemo(
    () =>
      usableVouchers.length +
      pointVoucherCatalog.filter((v) => v.eligible).length,
    [usableVouchers, pointVoucherCatalog],
  );

  const renderCatalogVoucherCard = (item) => (
    <div key={item.id} className="voucher-card">
      <div className="voucher-glow-dot" />
      <div className="voucher-icon-box">
        <Gift size={24} className="text-amber-500" />
      </div>
      <div className="voucher-body text-left">
        <div className="flex justify-between items-center mb-1 gap-2">
          <span className="voucher-code">{item.code}</span>
          <span className="text-[10px] font-bold text-amber-400">
            {item.pointsCost} điểm
          </span>
        </div>
        <h4 className="voucher-title">{item.description}</h4>
        <p className="voucher-desc">
          Hạng: {item.requiredTierLabel}
          {item.maxUsagePerUser != null
            ? ` · Tối đa ${item.maxUsagePerUser} lần/tài khoản`
            : ""}
          {item.maxUsage != null
            ? ` · Còn ${item.remainingGlobal ?? item.maxUsage} suất hệ thống`
            : ""}
        </p>
        <div className="flex justify-between items-center mt-3 gap-2">
          <span className="text-[10px] text-gray-400">
            {item.endDate
              ? `Hạn: ${new Date(item.endDate).toLocaleDateString("vi-VN")}`
              : "Không giới hạn thời gian"}
          </span>
          <button
            type="button"
            disabled={!item.eligible || redeemingVoucherId === item.id}
            onClick={() => handleRedeemVoucher(item.id)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[10px] font-bold uppercase disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {redeemingVoucherId === item.id ? "Đang đổi..." : "Đổi điểm"}
          </button>
        </div>
        {!item.eligible && item.ineligibleReason && (
          <p className="text-[10px] text-rose-400 mt-2">
            {item.ineligibleReason}
          </p>
        )}
      </div>
    </div>
  );

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      notificationService.error("Tên tài khoản không được để trống.");
      return;
    }

    if (
      phoneNumber.trim() &&
      !/^(0[35789][0-9]{8})$/.test(phoneNumber.trim())
    ) {
      notificationService.error(
        "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.",
      );
      return;
    }

    if (dayOfBirth) {
      const birthDate = new Date(dayOfBirth);
      const today = new Date();
      if (birthDate >= today) {
        notificationService.error("Ngày sinh phải ở quá khứ.");
        return;
      }
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 12) {
        notificationService.error("Bạn phải từ 12 tuổi trở lên.");
        return;
      }
    }

    if (gender && !["MALE", "FEMALE", "OTHER"].includes(gender)) {
      notificationService.error("Giới tính không hợp lệ.");
      return;
    }

    setIsSaving(true);
    try {
      const data = await authService.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || "",
        dayOfBirth: dayOfBirth || null,
        gender: gender || null,
      });

      if (data) {
        setFullName(data.fullName || "");
        setPhoneNumber(data.phoneNumber || "");
        setDayOfBirth(data.dayOfBirth || "");
        setGender(data.gender || "");
        setProfileData(data);

        // Update user context dynamically
        const updatedUser = {
          ...user,
          fullName: data.fullName,
          avatar: data.avatarUrl,
        };
        updateUser(updatedUser);

        addNotification(
          "Cập nhật thông tin thành công",
          "Thông tin cá nhân của bạn đã được cập nhật thành công.",
          "success",
        );
        setIsEditing(false);
      }
    } catch (err) {
      addNotification(
        "Cập nhật thông tin thất bại",
        err.message || "Đã xảy ra lỗi khi cập nhật thông tin cá nhân.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileData) {
      setFullName(profileData.fullName || "");
      setPhoneNumber(profileData.phoneNumber || "");
      setDayOfBirth(profileData.dayOfBirth || "");
      setGender(profileData.gender || "");
    } else {
      setFullName(user?.fullName || "");
      setPhoneNumber("");
      setDayOfBirth("");
      setGender("");
    }
    setIsEditing(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (authProvider === "GOOGLE") {
      notificationService.error(
        "Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.",
      );
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      notificationService.error("Vui lòng điền đầy đủ thông tin mật khẩu.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notificationService.error("Mật khẩu mới không trùng khớp.");
      return;
    }
    if (newPassword.length < 6) {
      notificationService.error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }

    setIsChangingPass(true);
    try {
      await authService.updateProfile({
        currentPassword,
        newPassword,
      });
      addNotification(
        "Đổi mật khẩu thành công",
        "Mật khẩu tài khoản của bạn đã được thay đổi thành công.",
        "success",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      addNotification(
        "Đổi mật khẩu thất bại",
        err.message || "Thay đổi mật khẩu không thành công.",
        "error",
      );
    } finally {
      setIsChangingPass(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="profile-wrapper flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-t-red-600 border-slate-800 rounded-full animate-spin" />
            <p className="text-slate-400 font-medium text-sm">
              Đang tải thông tin tài khoản...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="profile-wrapper">
        <div className="profile-container">
          {/* Space Hub Header (Hero Section) */}
          <div className="space-hub-header">
            <div className="cosmic-nebula-bg" />
            <div className="twinkling-stars-bg" />

            <div className="space-hub-content grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: User details with Orbit System around avatar */}
              <div className="lg:col-span-5 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="avatar-orbit-container">
                  <div className="orbit-ring orbit-ring-outer" />
                  <div className="orbit-ring orbit-ring-middle" />
                  <div className="orbit-ring orbit-ring-inner" />

                  <div className="orbit-node node-gold-1" />
                  <div className="orbit-node node-purple-1" />

                  <div
                    onClick={() => !isSaving && fileInputRef.current.click()}
                    className={`profile-avatar-frame cursor-pointer ${isSaving ? "opacity-50" : ""}`}
                    title="Thay đổi ảnh đại diện"
                  >
                    {avatarUrl ? (
                      <img
                        src={normalizeAvatarUrl(avatarUrl)}
                        alt="Avatar"
                        className="profile-avatar-image"
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarUrl("")}
                      />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                    {isSaving ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <div className="w-6 h-6 border-2 border-t-amber-500 border-white/20 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="profile-avatar-edit-btn">
                        <Camera size={14} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h1 className="profile-full-name-text text-3xl font-extrabold tracking-tight">
                      {user?.fullName || "Khách hàng"}
                    </h1>
                    <span className={`profile-role-badge ${roleColor}`}>
                      {displayRole}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm font-semibold">
                    {user?.email}
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-1">
                    <div className="profile-badge-item">
                      <MapPin size={12} className="text-amber-500" />
                      <span className="font-semibold">TP. Hồ Chí Minh</span>
                    </div>
                    <div className="profile-badge-item">
                      <Calendar size={12} className="text-amber-500" />
                      <span className="font-semibold">Thành viên từ 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Grand Gold Navigator Membership Panel */}
              <div className="lg:col-span-7 flex flex-col md:flex-row items-center gap-8 bg-black/35 backdrop-blur-xl border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-60 h-60 bg-yellow-500/10 rounded-full blur-[80px] group-hover:bg-yellow-500/15 transition-all duration-700" />

                <div className="flex flex-shrink-0 items-center gap-6">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-white/5 stroke-current"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-amber-500 stroke-current"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={
                          2 * Math.PI * 48 * (1 - progressPercent / 100)
                        }
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Hiện tại
                      </span>
                      <span className="text-lg font-black text-amber-400 font-mono leading-none mt-0.5">
                        {currentPoints.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-white/5 stroke-current"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-white/70 stroke-current"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={
                          2 * Math.PI * 48 * (1 - progressPercent / 100)
                        }
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center px-1 text-center">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-bold leading-tight">
                        Tích lũy
                      </span>
                      <span className="text-lg font-black text-white font-mono leading-none mt-0.5">
                        {lifetimePoints.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center md:text-left">
                  <span className="text-[9px] tracking-widest text-amber-400 font-black uppercase bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    ★ Hạng thành viên
                  </span>

                  <h2 className="text-xl font-black text-white uppercase tracking-wider mt-2">
                    {loyaltyTier}
                  </h2>

                  <div className="flex justify-center md:justify-start gap-0.5 text-amber-400">
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                    <Star
                      size={14}
                      className={
                        lifetimePoints >= 10000
                          ? "fill-current"
                          : "text-zinc-800"
                      }
                    />
                    <Star
                      size={14}
                      className={
                        lifetimePoints >= 10000
                          ? "fill-current"
                          : "text-zinc-800"
                      }
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {lifetimePoints >= 10000 ? (
                      <span>
                        Chúc mừng! Bạn đã đạt hạng thành viên cao nhất.
                      </span>
                    ) : (
                      <span>
                        Còn{" "}
                        <span className="text-amber-400 font-bold">
                          {(nextTierPoints - lifetimePoints).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          điểm
                        </span>{" "}
                        nữa để nâng cấp lên hạng thành viên NASA'VIP.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>

          {/* Profile Main Content Layout */}
          <div className="profile-content-grid">
            {/* Left Menu / Navigation Rail */}
            <div className="navigation-rail">
              <div className="rail-container">
                <button
                  onClick={() => setActiveTab("info")}
                  className={`rail-item ${activeTab === "info" ? "active" : ""}`}
                  title="Thông tin khách hàng"
                >
                  <div className="rail-icon-wrapper">
                    <User size={20} />
                  </div>
                  <span className="rail-label">Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab("member")}
                  className={`rail-item ${activeTab === "member" ? "active" : ""}`}
                  title="Thành viên NASAFilm"
                >
                  <div className="rail-icon-wrapper">
                    <Award size={20} />
                  </div>
                  <span className="rail-label">Thành viên</span>
                </button>

                <button
                  onClick={() => setActiveTab("tickets")}
                  className={`rail-item ${activeTab === "tickets" ? "active" : ""}`}
                  title="Vé của tôi"
                >
                  <div className="rail-icon-wrapper relative">
                    <Ticket size={20} />
                    {liveTicketCount > 0 && (
                      <span className="rail-badge">{liveTicketCount}</span>
                    )}
                  </div>
                  <span className="rail-label">Vé của tôi</span>
                </button>

                <button
                  onClick={() => setActiveTab("vouchers")}
                  className={`rail-item ${activeTab === "vouchers" ? "active" : ""}`}
                  title="Ưu đãi của tôi"
                >
                  <div className="rail-icon-wrapper relative">
                    <Gift size={20} />
                    <span className="rail-badge">{availableVoucherCount}</span>
                  </div>
                  <span className="rail-label">Ưu đãi của tôi</span>
                </button>

                {authProvider !== "GOOGLE" && (
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`rail-item ${activeTab === "security" ? "active" : ""}`}
                    title="Cài đặt bảo mật"
                  >
                    <div className="rail-icon-wrapper">
                      <Key size={20} />
                    </div>
                    <span className="rail-label">Cài đặt bảo mật</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("history")}
                  className={`rail-item ${activeTab === "history" ? "active" : ""}`}
                  title="Lịch sử mua hàng"
                >
                  <div className="rail-icon-wrapper">
                    <History size={20} />
                  </div>
                  <span className="rail-label">Lịch sử mua hàng</span>
                </button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="profile-tab-content-card">
              <AnimatePresence mode="wait">
                {/* TAB 1: Account Info */}
                {activeTab === "info" && (
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
                        <button
                          onClick={() => setIsEditing(true)}
                          className="panel-edit-btn"
                        >
                          <Edit2 size={14} />
                          <span>Chỉnh sửa</span>
                        </button>
                      ) : (
                        <div className="panel-editing-actions">
                          <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="panel-cancel-btn"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="panel-save-btn"
                          >
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
                      <div className="profile-info-row">
                        <div className="info-row-left">
                          <User size={18} className="text-red-500" />
                          <span className="info-row-label">Tên tài khoản</span>
                        </div>
                        <div className="info-row-right">
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={!isEditing || isSaving}
                            maxLength={100}
                            className={`info-row-input ${isEditing ? "editable" : ""}`}
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
                            onChange={(e) =>
                              setPhoneNumber(
                                e.target.value
                                  .replace(/[^0-9]/g, "")
                                  .slice(0, 10),
                              )
                            }
                            disabled={!isEditing || isSaving}
                            className={`info-row-input ${isEditing ? "editable" : ""}`}
                            placeholder={
                              isEditing
                                ? "Nhập số điện thoại"
                                : "Chưa cập nhật số điện thoại"
                            }
                          />
                        </div>
                      </div>

                      {/* Row: Ngày sinh */}
                      <div className="profile-info-row">
                        <div className="info-row-left">
                          <Calendar size={18} className="text-red-500" />
                          <span className="info-row-label">Ngày sinh</span>
                        </div>
                        <div className="info-row-right">
                          <input
                            type="date"
                            value={dayOfBirth}
                            onChange={(e) => setDayOfBirth(e.target.value)}
                            disabled={!isEditing || isSaving}
                            max={getMaxBirthDate()}
                            className={`info-row-input ${isEditing ? "editable" : ""}`}
                            placeholder={
                              isEditing
                                ? "Chọn ngày sinh"
                                : "Chưa cập nhật ngày sinh"
                            }
                          />
                        </div>
                      </div>

                      {/* Row: Giới tính */}
                      <div className="profile-info-row">
                        <div className="info-row-left">
                          <User size={18} className="text-red-500" />
                          <span className="info-row-label">Giới tính</span>
                        </div>
                        <div className="info-row-right">
                          {isEditing ? (
                            <div
                              className="relative w-full"
                              ref={genderDropdownRef}
                              style={{ position: "relative", width: "100%" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  !isSaving &&
                                  setShowGenderDropdown(!showGenderDropdown)
                                }
                                disabled={isSaving}
                                className={`custom-gender-select-btn ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                <span>
                                  {gender === "MALE"
                                    ? "Nam"
                                    : gender === "FEMALE"
                                      ? "Nữ"
                                      : gender === "OTHER"
                                        ? "Khác"
                                        : "Chọn giới tính"}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform duration-300 text-gray-400 ${showGenderDropdown ? "rotate-180 text-yellow-500" : ""}`}
                                  style={{ transition: "transform 0.3s ease" }}
                                />
                              </button>

                              <AnimatePresence>
                                {showGenderDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{
                                      duration: 0.15,
                                      ease: "easeOut",
                                    }}
                                    className="custom-gender-dropdown-list"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGender("MALE");
                                        setShowGenderDropdown(false);
                                      }}
                                      className={`custom-gender-option ${gender === "MALE" ? "active" : ""}`}
                                    >
                                      Nam
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGender("FEMALE");
                                        setShowGenderDropdown(false);
                                      }}
                                      className={`custom-gender-option ${gender === "FEMALE" ? "active" : ""}`}
                                    >
                                      Nữ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGender("OTHER");
                                        setShowGenderDropdown(false);
                                      }}
                                      className={`custom-gender-option ${gender === "OTHER" ? "active" : ""}`}
                                    >
                                      Khác
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <span className="info-row-text">
                              {gender === "MALE"
                                ? "Nam"
                                : gender === "FEMALE"
                                  ? "Nữ"
                                  : gender === "OTHER"
                                    ? "Khác"
                                    : "Chưa cập nhật giới tính"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Email */}
                      <div className="profile-info-row">
                        <div className="info-row-left">
                          <Mail size={18} className="text-red-500" />
                          <span className="info-row-label">Địa chỉ Email</span>
                        </div>
                        <div className="info-row-right">
                          <span className="info-row-text">
                            {user?.email || ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account Verification notice */}
                    <div className="profile-security-alert">
                      <ShieldAlert size={20} className="alert-icon" />
                      <div className="alert-content">
                        <h4>Bảo mật tài khoản của bạn</h4>
                        <p>
                          Email của bạn đã được xác minh thành công. Chúng tôi
                          khuyên bạn không nên chia sẻ mã xác minh OTP với bất
                          kỳ ai để giữ an toàn cho ví tiền và vé đã đặt.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB: NASAFilm Member */}
                {activeTab === "member" && (
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
                      <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase">
                        ĐĂNG KÝ THÀNH VIÊN
                      </h2>
                    </div>

                    {/* Points Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-300 mb-2">
                        <span className="uppercase tracking-wider">
                          Tích điểm N'VIP MEMBER
                        </span>
                        <span className="text-yellow-400 font-mono text-base">
                          {lifetimePoints}/10K
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 via-amber-500 to-red-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((lifetimePoints / 10000) * 100, 100)}%`,
                          }}
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
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundBlendMode: "overlay",
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="text-3xl font-black italic tracking-widest text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                NASA'FRIEND
                              </h4>
                            </div>

                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[8px] uppercase tracking-widest text-slate-300 font-bold">
                                  Thẻ thành viên
                                </p>
                                <p className="text-sm font-semibold text-white mt-0.5">
                                  {fullName || "Khách hàng"}
                                </p>
                              </div>
                              <p className="text-xs font-mono text-slate-300">
                                NSF-FRIEND
                              </p>
                            </div>
                          </div>

                          {/* Title & Info */}
                          <h3 className="text-xl font-extrabold text-white mb-2 uppercase">
                            NASA'FRIEND
                          </h3>
                          <p className="text-sm text-slate-300 mb-4 font-semibold">
                            Được cấp lần đầu khi mua 2 vé xem phim bất kỳ tại
                            NASAFilm.
                          </p>

                          <h4 className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-3 border-b border-slate-800 pb-1">
                            ĐƯỢC TÍCH LŨY ĐIỂM THEO GIÁ TRỊ MUA HÀNG HÓA DỊCH VỤ
                            NHƯ SAU:
                          </h4>
                          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                            <li>
                              Được giảm{" "}
                              <span className="text-yellow-400 font-bold">
                                10%
                              </span>{" "}
                              trực tiếp trên giá trị hóa đơn bắp nước khi mua
                              tại quầy.
                            </li>
                            <li>
                              Được tặng{" "}
                              <span className="text-yellow-400 font-bold">
                                1 vé xem phim 2D
                              </span>{" "}
                              vào tuần sinh nhật (tính từ Thứ Hai đến Chủ Nhật)
                              với số điểm tích lũy tối thiểu 500 điểm.
                            </li>
                            <li>
                              Được tham gia các chương trình dành cho thành
                              viên.
                            </li>
                          </ul>
                        </div>

                        {/* Member status button */}
                        <div className="mt-8">
                          {lifetimePoints >= 10000 ? (
                            <div className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-500 font-black text-sm uppercase rounded-lg text-center tracking-widest shadow-md">
                              HẠNG HIỆN TẠI: NASA'VIP
                            </div>
                          ) : (
                            <button className="w-full py-3 bg-[#cbd5e1] text-[#1e293b] font-black text-sm uppercase rounded-lg tracking-widest shadow-lg cursor-default">
                              BẠN ĐÃ LÀ THÀNH VIÊN NASA'FRIEND
                            </button>
                          )}
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
                              <span className="text-yellow-500 text-base leading-none">
                                ★
                              </span>
                              <span className="text-yellow-400 text-lg font-black italic tracking-tighter mt-0.5">
                                NASA'VIP
                              </span>
                            </div>

                            <div className="flex justify-between items-start z-10">
                              <span className="text-[10px] text-yellow-400 font-black tracking-widest uppercase">
                                VIP Card
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                NS-VIP
                              </span>
                            </div>

                            <div className="flex justify-between items-end z-10">
                              <div>
                                <p className="text-[8px] uppercase tracking-widest text-yellow-500/80 font-bold">
                                  Thành viên VIP
                                </p>
                                <p className="text-sm font-semibold text-slate-200 mt-0.5">
                                  {fullName || "Khách hàng"}
                                </p>
                              </div>
                              <p className="text-xs font-mono text-yellow-400/80 font-bold">
                                NSF-VIP
                              </p>
                            </div>
                          </div>

                          {/* Title & Info */}
                          <h3 className="text-xl font-extrabold text-white mb-2 uppercase">
                            NASA'VIP
                          </h3>
                          <p className="text-sm text-slate-300 mb-4 font-semibold">
                            Được cấp cho thành viên NASA'Friend khi tích lũy
                            được ít nhất 10.000 điểm.
                          </p>

                          <h4 className="text-xs font-bold text-yellow-500 tracking-wider uppercase mb-3 border-b border-slate-800 pb-1">
                            ĐƯỢC TÍCH LŨY ĐIỂM THEO GIÁ TRỊ MUA HÀNG HÓA DỊCH VỤ
                            NHƯ SAU:
                          </h4>
                          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                            <li>
                              Được giảm{" "}
                              <span className="text-yellow-400 font-bold">
                                15%
                              </span>{" "}
                              trực tiếp trên giá trị hóa đơn bắp nước khi mua
                              tại quầy.
                            </li>
                            <li>
                              Có cơ hội nhận vé tham gia Lễ Ra Mắt Phim và các
                              chương trình khuyến mãi khác của NASAFilm.
                            </li>
                          </ul>
                        </div>

                        {/* Progress/Condition placeholder */}
                        <div className="mt-8">
                          {lifetimePoints >= 10000 ? (
                            <button className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-sm uppercase rounded-lg tracking-widest shadow-lg cursor-default">
                              BẠN ĐÃ LÀ THÀNH VIÊN NASA'VIP
                            </button>
                          ) : (
                            <div className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-500 font-black text-sm uppercase rounded-lg text-center tracking-widest shadow-md">
                              CẦN TÍCH LŨY 10.000 ĐIỂM
                            </div>
                          )}
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
                        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                          Bảng quy đổi quà tặng của NASAFilm
                        </p>
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
                                  <Award
                                    size={14}
                                    className="text-yellow-400"
                                  />
                                  MỨC ĐIỂM
                                </div>
                              </th>
                              <th className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Gift size={14} className="text-yellow-400" />
                                  MỨC THƯỞNG{" "}
                                  <span className="text-[10px] text-slate-400 font-normal lowercase">
                                    (Hoặc dùng để tích điểm)
                                  </span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-slate-800/50">
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                Mua 2 vé xem phim
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                0
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                Cấp thẻ NASA'FRIEND
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                1.000
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                1 Coke 16 Oz
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                1.500
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                1 Popcorn 32 Oz
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                2.000
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                1 Coke 16 Oz + 1 Popcorn 32 Oz
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                2.500
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                2 Coke 16 Oz + 1 Popcorn 32 Oz
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                3.000
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                1 vé xem phim 2D
                              </td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-300">
                                NASA'FRIEND
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-300">
                                4.000
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                1 vé xem phim 3D
                              </td>
                            </tr>
                            <tr className="bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors font-bold text-yellow-400">
                              <td className="py-4 px-4 uppercase tracking-wider">
                                NASA'VIP
                              </td>
                              <td className="py-4 px-4 font-mono text-yellow-300">
                                10.000
                              </td>
                              <td className="py-4 px-4 uppercase tracking-wide text-yellow-300">
                                CẤP THẺ NASA'VIP
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: Tickets History */}
                {activeTab === "tickets" && (
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
                        onClick={() => setActiveTab("history")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-lg transition duration-200"
                      >
                        <History size={14} />
                        <span>Lịch sử mua hàng</span>
                      </button>
                    </div>

                    <div className="tickets-list">
                      {isLoadingBookings ? (
                        <div className="text-center py-12 text-zinc-500 font-medium w-full">
                          <p>Đang tải vé của bạn...</p>
                        </div>
                      ) : bookings.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 font-medium w-full">
                          <Ticket
                            size={48}
                            className="mx-auto mb-4 opacity-30 text-red-500"
                          />
                          <p>Bạn chưa có lịch sử đặt vé nào.</p>
                        </div>
                      ) : (
                        <>
                          <section className="tickets-section">
                            <div className="tickets-section__header">
                              <h3 className="tickets-section__title">
                                Vé đang hiệu lực
                              </h3>
                              <span className="tickets-section__count">
                                {liveBookings.length} vé
                              </span>
                            </div>
                            {liveBookings.length === 0 ? (
                              <p className="tickets-section__empty">
                                Không có vé nào đang hiệu lực.
                              </p>
                            ) : (
                              <>
                              <div className="tickets-section__grid">
                                {paginatedLiveBookings.map((tkt) => (
                                  <ProfileTicketCard
                                    key={tkt.id}
                                    tkt={tkt}
                                    onTicketClick={handleTicketClick}
                                    onCancel={setCancelTargetUuid}
                                    onRefund={setRefundTargetUuid}
                                  />
                                ))}
                              </div>
                              {liveBookings.length > ticketsPerPage && (
                                <Pagination
                                  currentPage={liveTicketPage}
                                  totalItems={liveBookings.length}
                                  itemsPerPage={ticketsPerPage}
                                  onPageChange={setLiveTicketPage}
                                  onItemsPerPageChange={(size) => {
                                    setTicketsPerPage(size);
                                    setLiveTicketPage(1);
                                  }}
                                />
                              )}
                              </>
                            )}
                          </section>

                          {archivedBookings.length > 0 && (
                            <section className="tickets-section tickets-section--archived">
                              <button
                                type="button"
                                className="tickets-section__toggle"
                                onClick={() => setShowArchivedTickets((v) => !v)}
                                aria-expanded={showArchivedTickets}
                              >
                                <div className="tickets-section__header tickets-section__header--toggle">
                                  <h3 className="tickets-section__title">
                                    Vé đã sử dụng / hết hạn
                                  </h3>
                                  <span className="tickets-section__count">
                                    {archivedBookings.length} vé
                                  </span>
                                </div>
                                <ChevronDown
                                  size={18}
                                  className={`tickets-section__chevron${showArchivedTickets ? ' tickets-section__chevron--open' : ''}`}
                                />
                              </button>
                              {showArchivedTickets && (
                                <>
                                <div className="tickets-section__grid tickets-section__grid--archived">
                                  {paginatedArchivedBookings.map((tkt) => (
                                    <ProfileTicketCard
                                      key={tkt.id}
                                      tkt={tkt}
                                      onTicketClick={handleTicketClick}
                                      onCancel={setCancelTargetUuid}
                                      onRefund={setRefundTargetUuid}
                                    />
                                  ))}
                                </div>
                                {archivedBookings.length > ticketsPerPage && (
                                  <Pagination
                                    currentPage={archivedTicketPage}
                                    totalItems={archivedBookings.length}
                                    itemsPerPage={ticketsPerPage}
                                    onPageChange={setArchivedTicketPage}
                                    onItemsPerPageChange={(size) => {
                                      setTicketsPerPage(size);
                                      setArchivedTicketPage(1);
                                    }}
                                  />
                                )}
                                </>
                              )}
                            </section>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: Vouchers */}
                {activeTab === "vouchers" && (
                  <motion.div
                    key="vouchers"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="tab-panel-body"
                  >
                    <div className="panel-header">
                      <h2>Ưu đãi & đổi điểm</h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Điểm hiện tại:{" "}
                        <span className="text-amber-400 font-bold">
                          {currentPoints.toLocaleString("vi-VN")}
                        </span>
                        {" · "}
                        Điểm tích lũy:{" "}
                        <span className="text-white font-bold">
                          {lifetimePoints.toLocaleString("vi-VN")}
                        </span>
                      </p>
                    </div>

                    {isLoadingVouchers ? (
                      <p className="text-gray-500 text-sm">
                        Đang tải voucher...
                      </p>
                    ) : (
                      <div className="space-y-8">
                        <section>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                            Voucher có thể sử dụng
                          </h3>
                          {usableVouchers.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                              Chưa có voucher khả dụng. Hãy đổi điểm ở mục bên
                              dưới hoặc xem ưu đãi công khai.
                            </p>
                          ) : (
                            <div className="vouchers-grid">
                              {usableVouchers.map((voucher) => {
                                const formattedExpiry = voucher.endDate
                                  ? `Hạn dùng: ${new Date(voucher.endDate).toLocaleDateString("vi-VN")}`
                                  : "Hạn dùng: Không thời hạn";
                                const isDirectUse =
                                  voucher.directUse ||
                                  (voucher.pointsCost ?? 0) === 0;

                                return (
                                  <div
                                    key={
                                      voucher.walletId ||
                                      voucher.id ||
                                      voucher.code
                                    }
                                    className="voucher-card"
                                  >
                                    <div className="voucher-glow-dot" />
                                    <div className="voucher-icon-box">
                                      <Gift
                                        size={24}
                                        className={
                                          isDirectUse
                                            ? "text-green-500"
                                            : "text-amber-500"
                                        }
                                      />
                                    </div>
                                    <div className="voucher-body text-left">
                                      <div className="flex justify-between items-center mb-1 gap-2">
                                        <span className="voucher-code">
                                          {voucher.code}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isDirectUse
                                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                          }`}
                                        >
                                          {isDirectUse
                                            ? "Miễn phí"
                                            : "Đã kích hoạt"}
                                        </span>
                                      </div>
                                      <h4 className="voucher-title">
                                        {voucher.description}
                                      </h4>
                                      <p className="voucher-desc">
                                        {voucher.requiredTierLabel
                                          ? `Hạng: ${voucher.requiredTierLabel}`
                                          : "Voucher khả dụng"}
                                        {isDirectUse
                                          ? " · Dùng trực tiếp khi thanh toán"
                                          : " · Đã đổi điểm"}
                                      </p>
                                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-400">
                                        <span className="voucher-expiry">
                                          {formattedExpiry}
                                        </span>
                                        <span className="font-semibold text-green-400">
                                          Sẵn sàng dùng
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </section>

                        <section>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                            Đổi điểm lấy voucher
                          </h3>
                          {pointVoucherCatalog.length === 0 ? (
                            <p className="text-gray-500 text-sm">
                              Chưa có voucher nào khả dụng để đổi.
                            </p>
                          ) : (
                            <div className="vouchers-grid">
                              {pointVoucherCatalog.map((item) =>
                                renderCatalogVoucherCard(item),
                              )}
                            </div>
                          )}
                        </section>

                        {vouchers.some((v) => v.used) && (
                          <section>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                              Voucher đã sử dụng
                            </h3>
                            <div className="vouchers-grid">
                              {vouchers
                                .filter((v) => v.used)
                                .map((voucher) => {
                                  const formattedExpiry = voucher.endDate
                                    ? `Hạn dùng: ${new Date(voucher.endDate).toLocaleDateString("vi-VN")}`
                                    : "Hạn dùng: Không thời hạn";

                                  return (
                                    <div
                                      key={`used-${voucher.walletId || voucher.id || voucher.code}`}
                                      className="voucher-card opacity-50 grayscale border-dashed border-gray-600"
                                    >
                                      <div className="voucher-glow-dot" />
                                      <div className="voucher-icon-box">
                                        <Gift
                                          size={24}
                                          className="text-gray-500"
                                        />
                                      </div>
                                      <div className="voucher-body text-left">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="voucher-code">
                                            {voucher.code}
                                          </span>
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                                            Đã sử dụng
                                          </span>
                                        </div>
                                        <h4 className="voucher-title text-gray-500">
                                          {voucher.description}
                                        </h4>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-400">
                                          <span className="voucher-expiry">
                                            {formattedExpiry}
                                          </span>
                                          <span>Đã dùng</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </section>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB 4: Security Settings */}
                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="tab-panel-body"
                  >
                    <PurchaseHistoryPanel />
                  </motion.div>
                )}

                {activeTab === "security" && authProvider !== "GOOGLE" && (
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

                    {authProvider === "GOOGLE" ? (
                      <div className="profile-security-alert">
                        <ShieldAlert
                          size={20}
                          className="alert-icon text-yellow-500"
                        />
                        <div className="alert-content">
                          <h4>Tính năng không khả dụng</h4>
                          <p>
                            Tài khoản của bạn đăng nhập thông qua Google
                            Sign-In. Mật khẩu được quản lý trực tiếp bởi Google,
                            do đó không thể đổi mật khẩu tại đây.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={handlePasswordChange}
                        className="password-change-form"
                      >
                        {" "}
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
                            onPasswordToggle={() =>
                              setShowCurrentPassword((prev) => !prev)
                            }
                          />
                        </div>{" "}
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
                            onPasswordToggle={() =>
                              setShowNewPassword((prev) => !prev)
                            }
                          />
                        </div>{" "}
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
                            onPasswordToggle={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isChangingPass}
                          className="password-submit-btn"
                        >
                          {isChangingPass
                            ? "Đang thực hiện..."
                            : "Cập nhật mật khẩu"}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      <CancelBookingModal
        bookingUuid={cancelTargetUuid}
        open={Boolean(cancelTargetUuid)}
        onClose={() => setCancelTargetUuid(null)}
        onSuccess={(result) => {
          notificationService.success(result?.message || "Hủy vé thành công");
          reloadBookings();
        }}
      />
      <RefundDetailModal
        bookingUuid={refundTargetUuid}
        open={Boolean(refundTargetUuid)}
        onClose={() => setRefundTargetUuid(null)}
      />
    </>
  );
};

export default ProfilePage;
