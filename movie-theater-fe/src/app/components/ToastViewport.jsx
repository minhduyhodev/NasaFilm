import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { dismissToast, runToastAction, subscribeToToasts } from '../../shared/services/notificationService';
import './ToastViewport.css';

const TOAST_STYLES = {
  success: {
    accent: 'bg-emerald-500',
    title: 'Success',
  },
  error: {
    accent: 'bg-red-500',
    title: 'Lỗi',
  },
  warning: {
    accent: 'bg-amber-500',
    title: 'Warning',
  },
  info: {
    accent: 'bg-sky-500',
    title: 'Info',
  },
  loading: {
    accent: 'bg-slate-400',
    title: 'Loading',
  },
};

const LoadingSpinner = () => (
  <div className="toast-spinner h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
);

const handleActionClick = (toast) => {
  runToastAction(toast.id);
  dismissToast(toast.id);
};

export const ToastViewport = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;
        const isMessage = toast.variant === 'message';
        const title = toast.title || style.title;

        return (
          <div
            key={toast.id}
            className={[
              'toast-card pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-[0_20px_60px_rgba(0,0,0,0.35)]',
              isMessage ? 'toast-card--message' : '',
              toast.type === 'error' ? 'toast-card--error' : '',
              toast.type === 'success' ? 'toast-card--success' : '',
              toast.type === 'warning' ? 'toast-card--warning' : '',
              toast.type === 'info' ? 'toast-card--info' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className={`h-1 w-full ${isMessage ? 'bg-rose-500' : style.accent}`} />
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 shrink-0">
                {toast.type === 'loading' ? (
                  <LoadingSpinner />
                ) : isMessage ? (
                  <div className="toast-message-icon">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </div>
                ) : (
                  <div className={`h-3 w-3 rounded-full ${style.accent}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 break-words text-sm text-slate-300">{toast.message}</p>
                {toast.actionLabel && toast.actionPath ? (
                  <Link
                    to={toast.actionPath}
                    onClick={() => handleActionClick(toast)}
                    className={isMessage
                      ? 'toast-action-btn mt-2 inline-flex'
                      : 'mt-2 inline-flex text-xs font-semibold text-amber-300 transition-colors hover:text-amber-200'}
                  >
                    {toast.actionLabel}
                  </Link>
                ) : null}
                {toast.actionLabel && !toast.actionPath ? (
                  <button
                    type="button"
                    onClick={() => handleActionClick(toast)}
                    className="toast-action-btn mt-2 inline-flex"
                  >
                    {toast.actionLabel}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:text-white"
                aria-label="Đóng thông báo"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastViewport;
