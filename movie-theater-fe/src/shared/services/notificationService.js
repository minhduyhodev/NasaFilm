import { toast } from 'react-toastify';
import tokenService from '../../features/auth/utils/tokenService';

const getUserId = () => {
  const user = tokenService.getUser();
  return user?.id || 'guest';
};

export const notificationService = {
  // Toast alerts helpers
  success: (message, options) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  error: (message, options) => {
    toast.error(message, {
      position: 'bottom-right',
      autoClose: 5000,
      ...options,
    });
  },

  warning: (message, options) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  info: (message, options) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  loading: (message, options) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
    });
  },

  update: (toastId, options) => {
    toast.update(toastId, options);
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  // Persistent Bell Notifications
  getNotifications: () => {
    const userId = getUserId();
    try {
      const data = localStorage.getItem(`nasa_notifications_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("[NotificationService] Lỗi khi đọc notifications:", e);
      return [];
    }
  },

  addNotification: (title, content, type = 'info') => {
    const userId = getUserId();
    try {
      const list = notificationService.getNotifications();
      const newNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        content,
        type, // 'success' | 'error' | 'warning' | 'info'
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updatedList = [newNotif, ...list].slice(0, 50); // Giới hạn 50 thông báo gần nhất
      localStorage.setItem(`nasa_notifications_${userId}`, JSON.stringify(updatedList));
      
      // Phát sự kiện để Navbar nhận biết thay đổi
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
      return newNotif;
    } catch (e) {
      console.error("[NotificationService] Lỗi khi thêm notification:", e);
      return null;
    }
  },

  markAllAsRead: () => {
    const userId = getUserId();
    try {
      const list = notificationService.getNotifications();
      const updatedList = list.map(item => ({ ...item, read: true }));
      localStorage.setItem(`nasa_notifications_${userId}`, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
    } catch (e) {
      console.error("[NotificationService] Lỗi khi cập nhật trạng thái đọc:", e);
    }
  },

  clearAll: () => {
    const userId = getUserId();
    try {
      localStorage.removeItem(`nasa_notifications_${userId}`);
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
    } catch (e) {
      console.error("[NotificationService] Lỗi khi xóa toàn bộ notifications:", e);
    }
  }
};

export default notificationService;
