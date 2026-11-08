import React, { useState } from 'react';
import {
  Minus,
  Square,
  X,
  Sun,
  Moon,
  Bell,
  BellOff,
  ShieldCheck,
  Palette,
  Maximize2
} from 'lucide-react';
import { requestNotificationPermission, getNotificationPermissionStatus, emitToast } from '../utils/notification';

export interface AccentColor {
  id: string;
  name: string;
  hex: string;
  tailwindClass: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: 'windows-blue', name: 'Windows Blue', hex: '#0078D4', tailwindClass: 'bg-[#0078D4]' },
  { id: 'fluent-teal', name: 'Teal Frost', hex: '#0D9488', tailwindClass: 'bg-[#0D9488]' },
  { id: 'emerald', name: 'Forest Emerald', hex: '#059669', tailwindClass: 'bg-[#059669]' },
  { id: 'crimson', name: 'Crimson Rose', hex: '#E11D48', tailwindClass: 'bg-[#E11D48]' },
  { id: 'violet', name: 'Violet Orchid', hex: '#7C3AED', tailwindClass: 'bg-[#7C3AED]' },
  { id: 'amber', name: 'Amber Glow', hex: '#D97706', tailwindClass: 'bg-[#D97706]' },
];

interface WindowsTitleBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  accentColor: AccentColor;
  onChangeAccent: (color: AccentColor) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({
  isDark,
  onToggleTheme,
  accentColor,
  onChangeAccent,
  isMaximized,
  onToggleMaximize,
  onMinimize,
  onClose,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermissionStatus()
  );

  const handleToggleNotification = async () => {
    if (notificationStatus === 'granted') {
      emitToast({
        title: 'Desktop Alerts Active',
        message: 'You will receive Windows chime sounds and desktop notifications when batches finish.',
        type: 'info',
      });
      return;
    }
    const granted = await requestNotificationPermission();
    setNotificationStatus(getNotificationPermissionStatus());
    if (granted) {
      emitToast({
        title: 'Notifications Enabled',
        message: 'OmniConvert can now alert you even when minimized or working in another window.',
        type: 'success',
      });
    }
  };

  return (
    <header className="relative flex items-center justify-between h-10 px-3 select-none bg-neutral-200/80 dark:bg-[#1f1f23]/90 border-b border-neutral-300 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 mica-surface z-30">
      {/* Left: App Wordmark & Window Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center text-white shadow-sm shrink-0"
          style={{ backgroundColor: accentColor.hex }}
        >
          {/* Fluent style intersecting squares icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="8" height="8" rx="1.5" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" />
            <path d="M11 7h4a2 2 0 0 1 2 2v4" />
            <path d="M7 11v4a2 2 0 0 0 2 2h4" />
          </svg>
        </div>
        <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          OmniConvert
        </span>
        <span className="hidden sm:inline text-neutral-400 dark:text-neutral-500">·</span>
        <span className="hidden sm:inline text-neutral-600 dark:text-neutral-400 truncate text-[11px]">
          Universal Batch Transcoder
        </span>

        {/* 100% Local Machine Security Badge */}
        <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Local · Zero Cloud Upload</span>
        </div>
      </div>

      {/* Right: Controls, Accent Switcher, Theme Toggle & Windows Window Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Accent Color Palette Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Customize Windows Accent Color"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-300/60 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
          >
            <Palette className="w-3.5 h-3.5" />
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border border-black/10 dark:border-white/20"
              style={{ backgroundColor: accentColor.hex }}
            />
          </button>

          {showColorPicker && (
            <div
              className="absolute right-0 top-full mt-1.5 p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 flex gap-1.5 z-50"
              onMouseLeave={() => setShowColorPicker(false)}
            >
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    onChangeAccent(col);
                    setShowColorPicker(false);
                  }}
                  title={col.name}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    accentColor.id === col.id ? 'ring-2 ring-offset-2 ring-neutral-400 dark:ring-offset-neutral-900' : ''
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop Notifications Toggle */}
        <button
          onClick={handleToggleNotification}
          title={
            notificationStatus === 'granted'
              ? 'Local Windows Alerts Active (Click to test)'
              : 'Enable Local Desktop Notifications'
          }
          className="p-1.5 rounded hover:bg-neutral-300/60 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
        >
          {notificationStatus === 'granted' ? (
            <Bell className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded hover:bg-neutral-300/60 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-neutral-700" />}
        </button>

        {/* Windows Standard Window Frame Controls */}
        <div className="flex items-center ml-2 border-l border-neutral-300 dark:border-neutral-800 pl-1 -mr-1">
          <button
            onClick={onMinimize}
            title="Minimize"
            className="w-10 h-8 flex items-center justify-center hover:bg-neutral-300/70 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore Down' : 'Maximize'}
            className="w-10 h-8 flex items-center justify-center hover:bg-neutral-300/70 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            {isMaximized ? <Maximize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-10 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white text-neutral-700 dark:text-neutral-300 transition-colors rounded-tr-sm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
