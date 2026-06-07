import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext(undefined);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState([]);

  // Load notifications from local storage service
  const loadNotifications = useCallback(() => {
    const data = notificationService.getNotifications();
    setNotifications(data);
  }, []);

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
    
    // Shoot Toast Notification
    if (type === 'success') {
      notificationService.success(title);
    } else if (type === 'error') {
      notificationService.error(title);
    } else if (type === 'warning') {
      notificationService.warning(title);
    } else {
      notificationService.info(title);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clearAll();
    setNotifications([]);
  }, []);

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
