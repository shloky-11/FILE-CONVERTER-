import React from 'react';
import {
  FileImage,
  FileText,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  Sliders,
  Eye,
  ArrowRight
} from 'lucide-react';
import { FileItem, SUPPORTED_FORMATS, FORMAT_DESCRIPTIONS } from '../types/converter';
import { formatBytes, triggerDownload } from '../services/engine/batchManager';
import { AccentColor } from './WindowsTitleBar';

interface FileItemRowProps {
  item: FileItem;
  onUpdateTarget: (id: string, targetFormat: string) => void;
  onRemove: (id: string) => void;
  onOpenSettings: (item: FileItem) => void;
  onOpenPreview: (item: FileItem) => void;
  accentColor: AccentColor;
  disabled?: boolean;
}

export const FileItemRow: React.FC<FileItemRowProps> = ({
  item,
  onUpdateTarget,
  onRemove,
  onOpenSettings,
  onOpenPreview,
  accentColor,
  disabled = false,
}) => {
  const availableOutputs = SUPPORTED_FORMATS[item.category]?.outputs || ['png', 'pdf'];

  const getFileCategoryIcon = () => {
    switch (item.category) {
      case 'image':
        return <FileImage className="w-4 h-4 text-sky-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <Film className="w-4 h-4 text-purple-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-400" />;
    }
  };

  const calculateSavings = () => {
    if (!item.resultSize || item.resultSize === 0 || item.size === 0) return null;
    const diff = item.size - item.resultSize;
    const pct = Math.round((diff / item.size) * 100);
    return pct;
  };

  const savingsPct = calculateSavings();

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#1f1f26] hover:bg-neutral-50 dark:hover:bg-[#25252e] rounded-xl border border-neutral-200 dark:border-neutral-800/90 transition-all shadow-xs">
      {/* Left: Thumbnail/Icon & File Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Preview Thumbnail or Category Icon */}
        <div className="relative w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center shrink-0 overflow-hidden">
          {item.previewUrl && item.category === 'image' ? (
            <img
              src={item.previewUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            getFileCategoryIcon()
          )}
          <span className="absolute bottom-0 right-0 px-1 text-[9px] font-mono uppercase bg-neutral-900/80 text-white rounded-tl">
            {item.extension}
          </span>
        </div>

        {/* File Name & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={item.name}>
              {item.name}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            <span className="font-mono">{formatBytes(item.size)}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{item.category}</span>
            {item.conversionTimeMs && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-neutral-400">{(item.conversionTimeMs / 1000).toFixed(2)}s</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Format Selector & Target Arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600 hidden sm:block" />

        {/* Target Format Dropdown */}
        <div className="relative">
          <select
            value={item.targetFormat}
            onChange={(e) => onUpdateTarget(item.id, e.target.value)}
            disabled={disabled || item.status === 'converting'}
            className="text-xs font-semibold uppercase px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer disabled:opacity-50"
          >
            {availableOutputs.map((fmt) => (
              <option key={fmt} value={fmt} title={FORMAT_DESCRIPTIONS[fmt] || ''}>
                TO .{fmt.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Per-file Options / Tuning modal trigger */}
        <button
          onClick={() => onOpenSettings(item)}
          disabled={disabled || item.status === 'converting'}
          title="Tuning & Resize Options"
          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Status, Progress Bar & Download/Remove Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800/80">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          {item.status === 'idle' && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">Ready</span>
          )}

          {item.status === 'queued' && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Queued...</span>
          )}

          {item.status === 'converting' && (
            <div className="flex flex-col items-end gap-1 w-24">
              <div className="flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{item.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${item.progress}%`, backgroundColor: accentColor.hex }}
                />
              </div>
            </div>
          )}

          {item.status === 'completed' && (
            <div className="flex items-center gap-1.5 text-right">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-[11px]">
                <div className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                  {formatBytes(item.resultSize || 0)}
                </div>
                {savingsPct !== null && (
                  <div
                    className={`font-mono text-[10px] ${
                      savingsPct > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    {savingsPct > 0 ? `-${savingsPct}%` : `+${Math.abs(savingsPct)}%`}
                  </div>
                )}
              </div>
            </div>
          )}

          {item.status === 'error' && (
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[11px]" title={item.errorMessage}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[100px]">{item.errorMessage || 'Failed'}</span>
            </div>
          )}
        </div>

        {/* Buttons: Preview, Download, Remove */}
        <div className="flex items-center gap-1">
          {/* Preview Button */}
          <button
            onClick={() => onOpenPreview(item)}
            title="Inspect & Compare"
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Download individual converted result */}
          {item.status === 'completed' && item.resultBlob && (
            <button
              onClick={() => triggerDownload(item.resultBlob!, item.resultName || `converted_${item.name}`)}
              title="Download Converted File"
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Remove file from queue */}
          <button
            onClick={() => onRemove(item.id)}
            disabled={disabled || item.status === 'converting'}
            title="Remove from queue"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
