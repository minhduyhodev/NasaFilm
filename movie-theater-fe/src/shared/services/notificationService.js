import { toast, TypeOptions } from 'react-toastify';

export const notificationService = {
  success: (message, options?) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  error: (message, options?) => {
    toast.error(message, {
      position: 'bottom-right',
      autoClose: 5000,
      ...options,
    });
  },

  warning: (message, options?) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  info: (message, options?) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  loading: (message, options?) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
    });
  },

  update: (toastId | number, options) => {
    toast.update(toastId, options);
  },

  dismiss: (toastId? | number) => {
    toast.dismiss(toastId);
  },
};

export default notificationService;
