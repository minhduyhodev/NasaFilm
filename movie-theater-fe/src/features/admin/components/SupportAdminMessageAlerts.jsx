import { useMemo } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { notificationService } from '../../../shared/services/notificationService';
import { hasAnyPermission, PERMISSIONS } from '../../../shared/utils/permissions';
import { notifySupportAttentionChanged } from '../utils/supportAttention';

const isUserSender = (role = '') => `${role || ''}`.toUpperCase() === 'USER';

/**
 * Global admin/staff popup when customers send support messages or request live chat.
 */
const SupportAdminMessageAlerts = () => {
  const { user } = useAuthContext();

  const canManageSupport = useMemo(
    () => hasAnyPermission(user, [PERMISSIONS.SUPPORT_MANAGE]),
    [user],
  );

  useRealtimeTopic(
    canManageSupport ? REALTIME_TOPICS.ADMIN_SUPPORT : null,
    (payload) => {
      const ticketCode = payload?.ticketCode;
      const senderRole = payload?.senderRole;
      if (!ticketCode || !isUserSender(senderRole)) return;

      notifySupportAttentionChanged();
      notificationService.info(
        `Có tin nhắn mới từ khách · ${ticketCode}`,
        {
          title: 'Tin nhắn hỗ trợ',
          variant: 'message',
          actionLabel: 'Mở hộp thư',
          actionPath: '/admin/support',
          toastId: `admin-support-msg-${ticketCode}`,
          autoClose: 7000,
        },
      );
      notificationService.addNotification(
        'Tin nhắn hỗ trợ',
        `Khách vừa gửi tin trong ticket ${ticketCode}`,
        'info',
      );
    },
    250,
  );

  useRealtimeTopic(
    canManageSupport ? REALTIME_TOPICS.ADMIN_SUPPORT_LIVE : null,
    (payload) => {
      const eventType = `${payload?.eventType || ''}`.toUpperCase();
      const ticketCode = payload?.ticketCode;
      if (eventType !== 'LIVE_REQUESTED' || !ticketCode) return;

      notifySupportAttentionChanged();
      notificationService.info(`Khách yêu cầu chat trực tiếp · ${ticketCode}`, {
        title: 'Hỗ trợ trực tiếp',
        variant: 'message',
        actionLabel: 'Mở hàng chờ',
        actionPath: '/admin/support',
        toastId: `admin-support-live-${ticketCode}`,
        autoClose: 8000,
      });
      notificationService.addNotification(
        'Hỗ trợ trực tiếp',
        `Khách yêu cầu chat trực tiếp (${ticketCode})`,
        'warning',
      );
    },
    250,
  );

  return null;
};

export default SupportAdminMessageAlerts;
