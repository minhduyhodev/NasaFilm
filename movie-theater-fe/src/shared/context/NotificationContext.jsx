import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext(undefined);

const mergeNotifications = (remote = [], local = []) => {
  const byId = new Map();
  [...local, ...remote].forEach((item) => {
    if (!item?.id) return;
    byId.set(String(item.id), item);
  });
  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime();
    const bTime = new Date(b.timestamp || 0).getTime();
    return bTime - aTime;
  }).slice(0, 50);
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState([]);

  // Load notifications from local storage service and API
  const loadNotifications = useCallback(async () => {
    const local = notificationService.getNotifications();

    if (user?.email) {
      try {
        const { userNotificationApi } = await import('../services/userNotificationApi');
        const remote = await userNotificationApi.list();
        if (Array.isArray(remote) && remote.length) {
          const mapped = remote.map((item) => ({
            id: item.uuid,
            title: item.title,
            content: item.content,
            actionUrl: item.actionUrl,
            type: item.type || 'info',
            timestamp: item.createdAt,
            read: item.read,
          }));
          // Giữ cả local (nhắc chiếu, review…) lẫn remote — không để remote nuốt mất.
          setNotifications(mergeNotifications(mapped, local));
          return;
        }
      } catch {
        /* fallback local */
      }
    }
    setNotifications(local);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [user, loadNotifications]);

  // Listen for updates from other parts of the app
  useEffect(() => {
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('nasa-notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('nasa-notifications-updated', handleUpdate);
    };
  }, [loadNotifications]);

  const addNotification = useCallback((title, content, type = 'info') => {
    notificationService.addNotification(title, content, type);

    // Toast chỉ hiện nội dung — không kèm title kiểu Success/Error/Info.
    const toastMessage = (content && String(content).trim()) || title;

    if (type === 'success') {
      notificationService.success(toastMessage);
    } else if (type === 'error') {
      notificationService.error(toastMessage);
    } else if (type === 'warning') {
      notificationService.warning(toastMessage);
    } else {
      notificationService.info(toastMessage);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    notificationService.markAllAsRead();
    if (user?.email) {
      try {
        const { userNotificationApi } = await import('../services/userNotificationApi');
        await userNotificationApi.markAllRead();
      } catch {
        /* ignore */
      }
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [user]);

  const clearAll = useCallback(async () => {
    notificationService.clearAll();
    if (user?.email) {
      try {
        const { userNotificationApi } = await import('../services/userNotificationApi');
        await userNotificationApi.deleteAll();
      } catch {
        /* ignore */
      }
    }
    setNotifications([]);
  }, [user]);

  const value = {
    notifications,
    addNotification,
    markAllAsRead,
    clearAll,
    refresh: loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
export default NotificationContext;
