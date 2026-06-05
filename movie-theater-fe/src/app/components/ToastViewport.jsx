import React, { useEffect, useState } from 'react';
import { dismissToast, subscribeToToasts } from '../../shared/services/notificationService';

const TOAST_STYLES = {
  success: {
    accent: 'bg-emerald-500',
    title: 'Success',
  },
  error: {
    accent: 'bg-red-500',
    title: 'Error',
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
  <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
);

export const ToastViewport = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            <div className={`h-1 w-full ${style.accent}`} />
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 shrink-0">
                {toast.type === 'loading' ? (
                  <LoadingSpinner />
                ) : (
                  <div className={`h-3 w-3 rounded-full ${style.accent}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{style.title}</p>
                <p className="mt-1 break-words text-sm text-slate-300">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:text-white"
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
