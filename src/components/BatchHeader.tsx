import React from 'react';
import { Play, Pause, Download, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AccentColor } from './WindowsTitleBar';
import { formatBytes } from '../services/engine/batchManager';

interface BatchHeaderProps {
  totalFiles: number;
  completedCount: number;
  errorCount: number;
  convertingCount: number;
  isProcessing: boolean;
  totalOriginalSize: number;
  totalConvertedSize: number;
  throughput: number; // bytes/sec
  onStartBatch: () => void;
  onPauseBatch: () => void;
  onDownloadAllZip: () => void;
  onClearQueue: () => void;
  isZipping: boolean;
  zipProgress: number;
  accentColor: AccentColor;
}

export const BatchHeader: React.FC<BatchHeaderProps> = ({
  totalFiles,
  completedCount,
  errorCount,
  convertingCount,
  isProcessing,
  totalOriginalSize,
  totalConvertedSize,
  throughput,
  onStartBatch,
  onPauseBatch,
  onDownloadAllZip,
  onClearQueue,
  isZipping,
  zipProgress,
  accentColor,
}) => {
  const overallProgress = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;
  const isAllDone = totalFiles > 0 && completedCount + errorCount === totalFiles;

  // Calculate size change
  const sizeDiff = totalOriginalSize - totalConvertedSize;
  const percentSaved = totalOriginalSize > 0 && totalConvertedSize > 0
    ? Math.round((sizeDiff / totalOriginalSize) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-[#1f1f26] rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm mb-4">
      {/* Top Row: Title, Quick Metrics & Batch Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Queue Summary */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Batch Queue
            </h3>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              ({totalFiles} {totalFiles === 1 ? 'file' : 'files'})
            </span>

            {isProcessing && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing {convertingCount} active</span>
              </span>
            )}

            {isAllDone && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Finished</span>
              </span>
            )}

            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorCount} failed</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span>Total size: <strong className="font-mono text-neutral-700 dark:text-neutral-200">{formatBytes(totalOriginalSize)}</strong></span>
            {totalConvertedSize > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Output: <strong className="font-mono text-neutral-700 dark:text-neutral-200">{formatBytes(totalConvertedSize)}</strong></span>
                {percentSaved > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Saved {percentSaved}%</span>
                  </>
                )}
              </>
            )}
            {throughput > 0 && isProcessing && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-sky-600 dark:text-sky-400">Speed: {formatBytes(throughput)}/s</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Primary Batch Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Start / Pause Button */}
          {isProcessing ? (
            <button
              onClick={onPauseBatch}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStartBatch}
              disabled={totalFiles === 0 || isAllDone}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: accentColor.hex }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAllDone ? 'Batch Finished' : 'Convert All Files'}</span>
            </button>
          )}

          {/* Download All as ZIP */}
          <button
            onClick={onDownloadAllZip}
            disabled={completedCount === 0 || isZipping}
            title={completedCount === 0 ? 'No completed files yet' : 'Download all converted files as a single ZIP'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isZipping ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Packing ZIP ({zipProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download All (.zip)</span>
              </>
            )}
          </button>

          {/* Clear Queue Button */}
          <button
            onClick={onClearQueue}
            disabled={totalFiles === 0 || isProcessing}
            title="Clear all files from queue"
            className="p-1.5 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real Progress Bar */}
      {(isProcessing || completedCount > 0) && (
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {isAllDone ? 'Batch Conversion Finished' : isProcessing ? 'Converting batch...' : 'Paused'}
            </span>
            <span className="font-mono text-neutral-500 dark:text-neutral-400">
              {completedCount} of {totalFiles} completed ({overallProgress}%)
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${overallProgress}%`,
                backgroundColor: isAllDone ? '#10B981' : accentColor.hex,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
