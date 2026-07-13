import tokenService from '../../features/auth/utils/tokenService';

const DEFAULT_AUTO_CLOSE = 4000;
const toastListeners = new Set();
const toastTimeouts = new Map();
let activeToasts = [];

const getUserId = () => {
  const user = tokenService.getUser();
  return user?.id || 'guest';
};

const emitToastChange = () => {
  const snapshot = [...activeToasts];
  toastListeners.forEach((listener) => listener(snapshot));
};

const clearToastTimer = (toastId) => {
  const timeoutId = toastTimeouts.get(toastId);
  if (timeoutId) {
    window.clearTimeout(timeoutId);
    toastTimeouts.delete(toastId);
  }
};

const scheduleToastRemoval = (toastId, autoClose) => {
  clearToastTimer(toastId);

  if (autoClose === false) {
    return;
  }

  const duration = typeof autoClose === 'number' ? autoClose : DEFAULT_AUTO_CLOSE;
  const timeoutId = window.setTimeout(() => {
    dismissToast(toastId);
  }, duration);

  toastTimeouts.set(toastId, timeoutId);
};

const upsertToast = (toast) => {
  const existingIndex = activeToasts.findIndex((item) => item.id === toast.id);

  if (existingIndex >= 0) {
    activeToasts = activeToasts.map((item, index) => (
      index === existingIndex ? { ...item, ...toast } : item
    ));
  } else {
    activeToasts = [toast, ...activeToasts].slice(0, 5);
  }

  emitToastChange();
};

const toastActions = new Map();

const showToast = (type, message, options = {}) => {
  const toastId = options.toastId || `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (typeof options.onAction === 'function') {
    toastActions.set(toastId, options.onAction);
  } else {
    toastActions.delete(toastId);
  }
  const toast = {
    id: toastId,
    type,
    title: options.title || null,
    message,
    variant: options.variant || null,
    autoClose: options.autoClose ?? DEFAULT_AUTO_CLOSE,
    actionLabel: options.actionLabel || null,
    actionPath: options.actionPath || null,
    hasAction: Boolean(options.onAction) || Boolean(options.actionPath && options.actionLabel),
  };

  upsertToast(toast);
  scheduleToastRemoval(toastId, toast.autoClose);
  return toastId;
};

export const runToastAction = (toastId) => {
  const action = toastActions.get(toastId);
  if (typeof action === 'function') {
    action();
  }
  toastActions.delete(toastId);
};

export const subscribeToToasts = (listener) => {
  toastListeners.add(listener);
  listener([...activeToasts]);

  return () => {
    toastListeners.delete(listener);
  };
};

export const dismissToast = (toastId) => {
  if (!toastId) {
    activeToasts.forEach((toast) => {
      clearToastTimer(toast.id);
      toastActions.delete(toast.id);
    });
    activeToasts = [];
    emitToastChange();
    return;
  }

  clearToastTimer(toastId);
  toastActions.delete(toastId);
  activeToasts = activeToasts.filter((toast) => toast.id !== toastId);
  emitToastChange();
};

export const notificationService = {
  success: (message, options) => showToast('success', message, options),

  error: (message, options) => showToast('error', message, {
    autoClose: 5000,
    ...options,
  }),

  warning: (message, options) => showToast('warning', message, options),

  info: (message, options) => showToast('info', message, options),

  loading: (message, options) => showToast('loading', message, {
    autoClose: false,
    ...options,
  }),

  update: (toastId, options = {}) => {
    if (!toastId) {
      return;
    }

    const existingToast = activeToasts.find((toast) => toast.id === toastId);
    if (!existingToast) {
      return;
    }

    if (typeof options.onAction === 'function') {
      toastActions.set(toastId, options.onAction);
    }

    const nextToast = {
      ...existingToast,
      type: options.type || existingToast.type,
      title: options.title ?? existingToast.title,
      message: options.render || options.message || existingToast.message,
      variant: options.variant ?? existingToast.variant,
      autoClose: options.autoClose ?? existingToast.autoClose,
      actionLabel: options.actionLabel ?? existingToast.actionLabel,
      actionPath: options.actionPath ?? existingToast.actionPath,
      hasAction: typeof options.onAction === 'function'
        || Boolean((options.actionPath ?? existingToast.actionPath) && (options.actionLabel ?? existingToast.actionLabel))
        || existingToast.hasAction,
    };

    upsertToast(nextToast);
    scheduleToastRemoval(toastId, nextToast.autoClose);
  },

  dismiss: (toastId) => {
    dismissToast(toastId);
  },

  getNotifications: () => {
    const userId = getUserId();
    try {
      const data = localStorage.getItem(`nasa_notifications_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[NotificationService] Loi khi doc notifications:', e);
      return [];
    }
  },

  addNotification: (title, content, type = 'info') => {
    const userId = getUserId();
    try {
      const list = notificationService.getNotifications();
      const newNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        title,
        content,
        type,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const updatedList = [newNotif, ...list].slice(0, 50);
      localStorage.setItem(`nasa_notifications_${userId}`, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
      return newNotif;
    } catch (e) {
      console.error('[NotificationService] Loi khi them notification:', e);
      return null;
    }
  },

  markAllAsRead: () => {
    const userId = getUserId();
    try {
      const list = notificationService.getNotifications();
      const updatedList = list.map((item) => ({ ...item, read: true }));
      localStorage.setItem(`nasa_notifications_${userId}`, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
    } catch (e) {
      console.error('[NotificationService] Loi khi cap nhat trang thai doc:', e);
    }
  },

  clearAll: () => {
    const userId = getUserId();
    try {
      localStorage.removeItem(`nasa_notifications_${userId}`);
      window.dispatchEvent(new CustomEvent('nasa-notifications-updated'));
    } catch (e) {
      console.error('[NotificationService] Loi khi xoa notifications:', e);
    }
  },
};

export default notificationService;
