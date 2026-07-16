import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Calendar,
  Tv,
  Ticket,
  Tag,
  Users,
  LogOut,
  Menu,
  Popcorn,
  ChevronDown,
  ChevronRight,
  Sliders,
  Shield,
  Mail,
  TrendingUp,
  UserCheck,
  DollarSign,
  Megaphone,
  MessageSquare,
  Rocket,
  Headset,
  ScanLine,
  Sparkles,
  Store,
  CalendarClock,
  ClipboardCheck,
  Wallet,
  Clock,
  ArrowLeftRight,
} from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { bookingService } from '../../../shared/services/bookingService';
import { adminReviewService } from '../../../shared/services/adminReviewService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import { hasPermission, hasAnyPermission, PERMISSIONS } from '../../../shared/utils/permissions';
import { canAccessAdminDashboard, OPERATIONS_PERMISSIONS } from '../../../shared/utils/adminNavigation';

const getRoleDisplayLabel = (roles = []) => {
  if (roles.includes('admin')) return 'Quản trị viên';
  if (roles.includes('staff')) return 'Nhân viên';
  return 'Thành viên';
};

const AdminSidebar = ({ isOpen, onToggle, onClose }) => {
  const confirm = useConfirm();
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const displayName = user?.fullName || user?.email || "Admin";
  const roleLabel = getRoleDisplayLabel(user?.roles);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatar = avatarLoadFailed
    ? huyAdmin
    : normalizeAvatarUrl(user?.avatar) || huyAdmin;

  const [openGroups, setOpenGroups] = useState({
    operations: true,
    content: true,
    facility: true,
    business: true,
    hrm: true,
    timekeeping: true,
    security: true,
  });
  const [pendingRefundCount, setPendingRefundCount] = useState(0);
  const [pendingFeedbackReportCount, setPendingFeedbackReportCount] = useState(0);

  const loadPendingRefundCount = useCallback(async () => {
    try {
      const data = await bookingService.getAdminPendingRefunds();
      setPendingRefundCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setPendingRefundCount(0);
    }
  }, []);

  const loadPendingFeedbackReportCount = useCallback(async () => {
    try {
      const count = await adminReviewService.getPendingReportCount();
      setPendingFeedbackReportCount(Number(count) || 0);
    } catch {
      setPendingFeedbackReportCount(0);
    }
  }, []);

  const toggleGroup = (group) => {
    setOpenGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.avatar]);

  useEffect(() => {
    loadPendingRefundCount();
    loadPendingFeedbackReportCount();
  }, [loadPendingRefundCount, loadPendingFeedbackReportCount, location.pathname]);

  useEffect(() => {
    const refreshReportBadge = () => loadPendingFeedbackReportCount();
    window.addEventListener('admin-review-reports-changed', refreshReportBadge);
    return () => window.removeEventListener('admin-review-reports-changed', refreshReportBadge);
  }, [loadPendingFeedbackReportCount]);

  const enableRefundRealtime =
    location.pathname.startsWith('/admin/refunds') ||
    location.pathname.startsWith('/admin/bookings');

  const enableReviewReportRealtime = location.pathname.startsWith('/admin/feedback-reviews');

  useRealtimeTopic(
    enableRefundRealtime ? REALTIME_TOPICS.ADMIN_BOOKINGS : null,
    loadPendingRefundCount,
  );

  useRealtimeTopic(
    enableReviewReportRealtime ? REALTIME_TOPICS.ADMIN_REVIEW_REPORTS : null,
    loadPendingFeedbackReportCount,
  );

  const handleLogout = useCallback(async () => {
    const ok = await confirm({
      title: 'Đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị?',
      confirmLabel: 'Đăng xuất',
      variant: 'warning',
    });
    if (!ok) return;
    logout();
    navigate("/login");
  }, [confirm, logout, navigate]);

  const renderLink = (to, Icon, label, colorClass = "text-gray-400", { end: endOverride, badge, permission } = {}) => {
    if (permission && !hasPermission(user, permission)) {
      return null;
    }

    return (
      <NavLink
        to={to}
        end={endOverride ?? to === "/admin"}
        aria-label={label}
        title={!isOpen ? label : undefined}
        className={({ isActive }) =>
          `adm-nav-link ${isOpen ? "" : "adm-nav-link--collapsed"} ${isActive ? "adm-nav-link--active" : ""}`
        }
        onClick={onClose}
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-red-400" : colorClass}`}
              aria-hidden="true"
            />
            {isOpen && (
              <>
                <span className="truncate flex-1">{label}</span>
                {badge > 0 && (
                  <span className="adm-nav-badge">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const renderGroupHeader = (title, groupKey, Icon) => {
    if (!isOpen) return null;
    const isGroupOpen = openGroups[groupKey];
    return (
      <button
        type="button"
        onClick={() => toggleGroup(groupKey)}
        aria-expanded={isGroupOpen}
        aria-controls={`admin-nav-group-${groupKey}`}
        className="adm-nav-group-btn"
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden="true" />
          <span>{title}</span>
        </span>
        {isGroupOpen ? (
          <ChevronDown className="w-3 h-3 opacity-70" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3 h-3 opacity-70" aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`adm-sidebar ${isOpen ? "adm-sidebar--open" : "adm-sidebar--closed"}`}
    >
      <div
        className={`adm-sidebar__header ${isOpen ? "justify-between" : "adm-sidebar__header--collapsed"}`}
      >
        {isOpen ? (
          <Link to="/admin" className="adm-brand-link shrink-0">
            <img
              src={nasaLogo}
              alt="NASAFILM Logo"
              className="h-7 w-7 rounded-lg object-cover shadow-md"
            />
            <span className="text-lg font-bold tracking-tight leading-none text-white font-heading">
              NASA<span className="adm-brand-accent">Film</span>
            </span>
            <span className="adm-admin-pill ml-1 shrink-0">ADMIN</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="adm-icon-btn"
            title="Mở rộng Sidebar"
            aria-label="Mở rộng Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {isOpen && (
          <button
            type="button"
            onClick={onToggle}
            className="adm-icon-btn hidden lg:inline-flex !w-8 !h-8"
            title="Thu nhỏ Sidebar"
            aria-label="Thu nhỏ Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="adm-sidebar__nav no-scrollbar">
        {/* Dashboard — chỉ khi có quyền xem tổng quan */}
        {canAccessAdminDashboard(user) && (
        <div className="space-y-1">
          {renderLink("/admin", LayoutDashboard, "DASHBOARD", "text-sky-400")}
        </div>
        )}

        {/* Vận hành quầy — POS & soát vé */}
        {hasAnyPermission(user, OPERATIONS_PERMISSIONS) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Vận hành quầy", "operations", Store)}
          {(!isOpen || openGroups.operations) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/pos",
                Ticket,
                "Quầy bán vé POS",
                "text-red-400",
                { permission: PERMISSIONS.COUNTER_BOOKING_CREATE },
              )}
              {renderLink(
                "/admin/staff-control",
                ScanLine,
                "Soát vé & giám sát",
                "text-rose-400",
                { permission: PERMISSIONS.TICKET_CHECKIN },
              )}
            </div>
          )}
        </div>
        )}

        {/* Content Group (Collapsible) */}
        {hasAnyPermission(user, [PERMISSIONS.MOVIE_WRITE, PERMISSIONS.PROMOTION_WRITE, PERMISSIONS.SUPPORT_MANAGE, PERMISSIONS.USER_VIEW]) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Quản lý nội dung", "content", Film)}
          {(!isOpen || openGroups.content) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/movies",
                Film,
                "Quản lý phim",
                "text-rose-400",
                { permission: PERMISSIONS.MOVIE_WRITE },
              )}
              {renderLink(
                "/admin/media",
                Megaphone,
                "Truyền thông",
                "text-violet-400",
                { permission: PERMISSIONS.MOVIE_WRITE }
              )}
              {renderLink(
                "/admin/vouchers",
                Tag,
                "Sự kiện & Khuyến mãi",
                "text-pink-400",
                { permission: PERMISSIONS.PROMOTION_WRITE },
              )}
              {renderLink(
                "/admin/missions",
                Rocket,
                "Quản lý nhiệm vụ",
                "text-sky-400",
                { permission: PERMISSIONS.SUPPORT_MANAGE }
              )}
              {renderLink(
                "/admin/matchmaker-analytics",
                Sparkles,
                "Thống kê gợi ý phim",
                "text-orange-400",
                { permission: PERMISSIONS.USER_VIEW }
              )}
              {renderLink(
                "/admin/feedback-reviews",
                MessageSquare,
                "Kiểm duyệt đánh giá",
                "text-amber-400",
                { badge: pendingFeedbackReportCount, permission: PERMISSIONS.SUPPORT_MANAGE },
              )}
              {renderLink(
                "/admin/support",
                Headset,
                "Hỗ trợ khách hàng",
                "text-rose-400",
                { permission: PERMISSIONS.SUPPORT_MANAGE },
              )}
            </div>
          )}
        </div>
        )}

        {/* Facility Group (Collapsible) */}
        {hasAnyPermission(user, [PERMISSIONS.SHOWTIME_WRITE]) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Quản lý cơ sở", "facility", Tv)}
          {(!isOpen || openGroups.facility) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/cinemas",
                Tv,
                "Cụm rạp & Phòng chiếu",
                "text-emerald-400",
                { permission: PERMISSIONS.SHOWTIME_WRITE }
              )}
              {renderLink(
                "/admin/showtimes",
                Calendar,
                "Quản lý suất chiếu",
                "text-amber-400",
                { permission: PERMISSIONS.SHOWTIME_WRITE },
              )}
            </div>
          )}
        </div>
        )}

        {/* Business Group (Collapsible) */}
        {hasAnyPermission(user, [PERMISSIONS.USER_VIEW, PERMISSIONS.COUNTER_REFUND_PROCESS, PERMISSIONS.COMBO_WRITE]) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Vận hành kinh doanh", "business", Ticket)}
          {(!isOpen || openGroups.business) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/bookings",
                Ticket,
                "Quản lý vé bán",
                "text-orange-400",
                { permission: PERMISSIONS.USER_VIEW }
              )}
              {renderLink(
                "/admin/refunds",
                DollarSign,
                "Duyệt hoàn tiền",
                "text-emerald-400",
                { badge: pendingRefundCount, permission: PERMISSIONS.COUNTER_REFUND_PROCESS },
              )}
              {renderLink(
                "/admin/combos/revenue",
                TrendingUp,
                "Doanh thu bắp nước",
                "text-emerald-500",
                { permission: PERMISSIONS.COMBO_WRITE }
              )}
              {renderLink(
                "/admin/combos",
                Popcorn,
                "Danh mục bắp nước",
                "text-yellow-400",
                { end: true, permission: PERMISSIONS.COMBO_WRITE },
              )}
            </div>
          )}
        </div>
        )}

        {/* Human Resource Group (Collapsible) */}
        {hasAnyPermission(user, [PERMISSIONS.USER_VIEW]) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Nhân sự & Khách hàng", "hrm", Users)}
          {(!isOpen || openGroups.hrm) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/users",
                Users,
                "Danh sách khách hàng",
                "text-cyan-400",
                { permission: PERMISSIONS.USER_VIEW },
              )}
              {renderLink(
                "/admin/staff",
                UserCheck,
                "Quản lý nhân sự",
                "text-indigo-400",
                { permission: PERMISSIONS.USER_VIEW }
              )}
            </div>
          )}
        </div>
        )}

        {/* Timekeeping & Payroll Group (Collapsible) */}
        <div className="space-y-1 text-left">
          {renderGroupHeader("Chấm công & Lương", "timekeeping", Clock)}
          {(!isOpen || openGroups.timekeeping) && (
            <div
              className={`${isOpen ? "adm-nav-group-items adm-nav-group-items--nested" : "adm-nav-group-items"}`}
            >
              {renderLink(
                "/admin/hr/me",
                Clock,
                "Bảng công của tôi",
                "text-teal-400",
              )}
              {renderLink(
                "/admin/hr/schedule",
                CalendarClock,
                "Xếp ca làm việc",
                "text-sky-400",
                { permission: PERMISSIONS.HR_SHIFT_MANAGE },
              )}
              {renderLink(
                "/admin/hr/requests",
                ArrowLeftRight,
                "Duyệt đơn từ",
                "text-fuchsia-400",
                { permission: PERMISSIONS.HR_SHIFT_MANAGE },
              )}
              {renderLink(
                "/admin/hr/attendance",
                ClipboardCheck,
                "Duyệt chấm công",
                "text-amber-400",
                { permission: PERMISSIONS.HR_ATTENDANCE_MANAGE },
              )}
              {renderLink(
                "/admin/hr/payroll",
                Wallet,
                "Lương, thưởng & OT",
                "text-emerald-400",
                { permission: PERMISSIONS.HR_PAYROLL_MANAGE },
              )}
            </div>
          )}
        </div>

        {/* System Settings Group (Collapsible) */}
        {hasAnyPermission(user, [PERMISSIONS.USER_VIEW]) && (
        <div className="space-y-1 text-left">
          {renderGroupHeader("Cấu hình & Bảo mật", "security", Shield)}
          {(!isOpen || openGroups.security) && (
            <div className={`${isOpen ? 'adm-nav-group-items adm-nav-group-items--nested' : 'adm-nav-group-items'}`}>
              {renderLink('/admin/config', Sliders, 'Cấu hình hệ thống', 'text-amber-400', { permission: PERMISSIONS.USER_VIEW })}
              {renderLink('/admin/email-templates', Mail, 'Cấu hình mẫu email', 'text-sky-400', { permission: PERMISSIONS.USER_VIEW })}
            </div>
          )}
        </div>
        )}
      </nav>

      <div
        className={`adm-sidebar__footer ${isOpen ? "" : "adm-sidebar__footer--collapsed"}`}
      >
        <div className="adm-sidebar__user">
          <div className="adm-sidebar__avatar" title={displayName}>
            <img
              alt={displayName}
              src={avatar}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          {isOpen && (
            <div className="min-w-0 flex-1 text-left">
              <p className="adm-sidebar__user-name">{displayName}</p>
              <p className="adm-sidebar__user-role">{roleLabel}</p>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex items-center justify-center border-t border-[var(--adm-border)] pt-3">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              className="adm-sidebar__logout"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;
