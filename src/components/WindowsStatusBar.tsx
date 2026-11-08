import React from 'react';
import { ShieldCheck, HardDrive, Cpu, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '../services/engine/batchManager';

interface WindowsStatusBarProps {
  totalFiles: number;
  completedCount: number;
  totalOriginalSize: number;
  totalConvertedSize: number;
  concurrency: number;
  isProcessing: boolean;
}

export const WindowsStatusBar: React.FC<WindowsStatusBarProps> = ({
  totalFiles,
  completedCount,
  totalOriginalSize,
  totalConvertedSize,
  concurrency,
  isProcessing,
}) => {
  return (
    <footer className="h-7 px-3 flex items-center justify-between bg-neutral-200/90 dark:bg-[#18181c] border-t border-neutral-300 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 select-none shrink-0 z-20">
      {/* Left: Queue Status & File Counts */}
      <div className="flex items-center gap-3">
        <span className="font-mono">
          {totalFiles} items {completedCount > 0 && `(${completedCount} completed)`}
        </span>
        <span className="text-neutral-300 dark:text-neutral-700">|</span>
        <span className="flex items-center gap-1 font-mono">
          <HardDrive className="w-3 h-3 text-neutral-400" />
          <span>Queue: {formatBytes(totalOriginalSize)}</span>
          {totalConvertedSize > 0 && <span>· Output: {formatBytes(totalConvertedSize)}</span>}
        </span>
      </div>

      {/* Right: Security Guarantee & Multi-Thread Concurrency */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
          <Cpu className="w-3 h-3 text-neutral-400" />
          <span>{concurrency} Workers</span>
        </div>

        <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">|</span>

        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Local Processing</span>
        </div>

        <span className="text-neutral-300 dark:text-neutral-700">|</span>

        <span className="flex items-center gap-1 font-medium text-neutral-500">
          {isProcessing ? (
            <span className="text-sky-600 dark:text-sky-400">Transcoding...</span>
          ) : (
            <span>Ready</span>
          )}
        </span>
      </div>
    </footer>
  );
};
