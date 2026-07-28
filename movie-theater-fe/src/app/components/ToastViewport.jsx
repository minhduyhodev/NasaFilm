import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { dismissToast, runToastAction, subscribeToToasts } from '../../shared/services/notificationService';
import './ToastViewport.css';

const TOAST_STYLES = {
  success: { accent: 'bg-emerald-500' },
  error: { accent: 'bg-red-500' },
  warning: { accent: 'bg-amber-500' },
  info: { accent: 'bg-sky-500' },
  loading: { accent: 'bg-slate-400' },
};

/** Không bao giờ hiện nhãn loại toast. */
const TYPE_LABELS = new Set([
  'success',
  'error',
  'warning',
  'info',
  'loading',
  'lỗi',
  'loi',
  'thành công',
  'thanh cong',
]);

const LoadingSpinner = () => (
  <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
);

const handleActionClick = (toast) => {
  runToastAction(toast.id);
  dismissToast(toast.id);
};

/** Chỉ lấy nội dung thông báo — bỏ title / Success / Error / Info. */
const resolveMessage = (toast) => {
  const message = typeof toast.message === 'string' ? toast.message.trim() : '';
  const title = typeof toast.title === 'string' ? toast.title.trim() : '';
  const primary = message || title;
  if (!primary) return '';
  if (TYPE_LABELS.has(primary.toLowerCase())) return '';
  return primary;
};

export const ToastViewport = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  const visibleToasts = useMemo(
    () => toasts
      .map((toast) => ({ toast, message: resolveMessage(toast) }))
      .filter((item) => item.message),
    [toasts],
  );

  if (visibleToasts.length === 0 || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="toast-viewport pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3"
      aria-live="polite"
      aria-relevant="additions"
    >
      {visibleToasts.map(({ toast, message }) => {
        const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;
        const isMessage = toast.variant === 'message';

        return (
          <div
            key={toast.id}
            className={[
              'toast-card pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-[0_20px_60px_rgba(0,0,0,0.35)]',
              isMessage ? 'toast-card--message' : '',
            ].filter(Boolean).join(' ')}
            role="status"
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
                <p className="break-words text-sm font-medium text-white">{message}</p>
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
    </div>,
    document.body,
  );
};

export default ToastViewport;
