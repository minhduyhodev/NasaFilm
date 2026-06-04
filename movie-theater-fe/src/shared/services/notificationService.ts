import { toast, TypeOptions } from 'react-toastify';

export const notificationService = {
  success: (message: string, options?: any) => {
    toast.success(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  error: (message: string, options?: any) => {
    toast.error(message, {
      position: 'bottom-right',
      autoClose: 5000,
      ...options,
    });
  },

  warning: (message: string, options?: any) => {
    toast.warning(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  info: (message: string, options?: any) => {
    toast.info(message, {
      position: 'bottom-right',
      autoClose: 4000,
      ...options,
    });
  },

  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      position: 'bottom-right',
      ...options,
    });
  },

  update: (toastId: string | number, options: any) => {
    toast.update(toastId, options);
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },
};

export default notificationService;
