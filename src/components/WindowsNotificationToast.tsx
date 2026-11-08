import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { ToastAlert, subscribeToToasts } from '../utils/notification';
import { AccentColor } from './WindowsTitleBar';

interface WindowsNotificationToastProps {
  accentColor: AccentColor;
}

export const WindowsNotificationToast: React.FC<WindowsNotificationToastProps> = ({
  accentColor,
}) => {
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 6500);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="Notifications" className="fixed bottom-10 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
            case 'error':
              return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
            case 'warning':
              return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
            default:
              return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
          }
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 dark:bg-[#202028]/95 backdrop-blur-md rounded-xl shadow-xl border border-neutral-300 dark:border-neutral-700/80 p-3.5 transition-all animate-in slide-in-from-bottom-5 duration-200"
          >
            {/* Header: App Name & Close */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: accentColor.hex }}
                />
                <span>OmniConvert · Windows Alert</span>
              </div>
              <button
                onClick={() => handleDismiss(toast.id)}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex items-start gap-2.5 mt-1">
              {getIcon()}
              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {toast.title}
                </h5>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {toast.actionLabel && toast.onAction && (
              <div className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={() => {
                    toast.onAction?.();
                    handleDismiss(toast.id);
                  }}
                  className="px-3 py-1 text-xs font-medium text-white rounded-md shadow-xs hover:opacity-95 active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor.hex }}
                >
                  {toast.actionLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
};
