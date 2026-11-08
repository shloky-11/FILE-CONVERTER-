import { playBatchCompleteChime, playErrorChime, playWindowsToastChime } from './audioChime';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: Date;
  actionLabel?: string;
  onAction?: () => void;
}

type ToastListener = (toast: ToastAlert) => void;
const listeners: Set<ToastListener> = new Set();

export function subscribeToToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitToast(toast: Omit<ToastAlert, 'id' | 'timestamp'>) {
  const fullToast: ToastAlert = {
    ...toast,
    id: 'toast-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date(),
  };

  // Play audio chime based on type
  if (toast.type === 'error') {
    playErrorChime();
  } else if (toast.title.toLowerCase().includes('complete') || toast.title.toLowerCase().includes('done')) {
    playBatchCompleteChime();
  } else {
    playWindowsToastChime();
  }

  // Fire native OS notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(toast.title, {
        body: toast.message,
        icon: '/favicon.ico',
        tag: 'omniconvert-batch',
      });
    } catch {
      // ignore
    }
  }

  listeners.forEach((listener) => listener(fullToast));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
