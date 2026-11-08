import React, { useState } from 'react';
import { X, Check, Sliders, Image, Film } from 'lucide-react';
import { FileItem, ConversionOptions } from '../types/converter';
import { AccentColor } from './WindowsTitleBar';

interface FileOptionsModalProps {
  item: FileItem | null;
  onClose: () => void;
  onSaveOptions: (id: string, options: ConversionOptions) => void;
  accentColor: AccentColor;
}

export const FileOptionsModal: React.FC<FileOptionsModalProps> = ({
  item,
  onClose,
  onSaveOptions,
  accentColor,
}) => {
  if (!item) return null;

  const [options, setOptions] = useState<ConversionOptions>({ ...item.options });

  const handleSave = () => {
    onSaveOptions(item.id, options);
    onClose();
  };

  const isImage = item.category === 'image';
  const isVideo = item.category === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white dark:bg-[#1f1f26] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" style={{ color: accentColor.hex }} />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              Conversion Options & Parameters
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs text-neutral-700 dark:text-neutral-300">
          <div>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">File:</span>{' '}
            <span className="font-mono text-neutral-500 truncate inline-block max-w-[280px] align-bottom">
              {item.name}
            </span>
          </div>

          {/* Quality Slider (for lossy images / video) */}
          {(isImage || item.targetFormat === 'jpg' || item.targetFormat === 'webp') && (
            <div className="space-y-1.5 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="font-medium flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Compression Quality</span>
                </label>
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                  {options.quality}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={options.quality}
                onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) })}
                className="w-full accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>Smaller size (10%)</span>
                <span>Balanced (80-85%)</span>
                <span>Max Quality (100%)</span>
              </div>
            </div>
          )}

          {/* Image Resizing Controls */}
          {isImage && (
            <div className="space-y-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <label className="font-medium">Resize Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, resizeMode: 'original' })}
                  className={`px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    options.resizeMode === 'original'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Original Resolution
                </button>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, resizeMode: 'scale', scalePercent: 50 })}
                  className={`px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    options.resizeMode === 'scale' && options.scalePercent === 50
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Scale 50% (Web)
                </button>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, resizeMode: 'maxBound', maxBound: 1920 })}
                  className={`px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    options.resizeMode === 'maxBound' && options.maxBound === 1920
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Max 1920px (FHD)
                </button>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, resizeMode: 'custom', customWidth: 800, customHeight: 600 })}
                  className={`px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    options.resizeMode === 'custom'
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
                      : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  Custom Dimensions
                </button>
              </div>

              {options.resizeMode === 'custom' && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-400">Width (px)</label>
                    <input
                      type="number"
                      value={options.customWidth || 800}
                      onChange={(e) => setOptions({ ...options, customWidth: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                    />
                  </div>
                  <span className="text-neutral-400 mt-3">×</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-neutral-400">Height (px)</label>
                    <input
                      type="number"
                      value={options.customHeight || 600}
                      onChange={(e) => setOptions({ ...options, customHeight: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Color & Filter Modifiers */}
          {isImage && (
            <div className="space-y-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.grayscale}
                  onChange={(e) => setOptions({ ...options, grayscale: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-0"
                />
                <span className="font-medium">Convert to Monochromatic Grayscale</span>
              </label>

              <div className="flex items-center justify-between pt-1">
                <label className="text-neutral-600 dark:text-neutral-400">
                  Background Fill (for JPG/BMP without alpha)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={options.backgroundColor || '#ffffff'}
                    onChange={(e) => setOptions({ ...options, backgroundColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-neutral-300 dark:border-neutral-700"
                  />
                  <span className="font-mono text-[11px] uppercase">{options.backgroundColor || '#FFFFFF'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Video Options */}
          {isVideo && (
            <div className="space-y-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="font-medium flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Animation Sample Rate (FPS)</span>
                </label>
                <span className="font-mono font-semibold">{options.fps || 8} fps</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={options.fps || 8}
                onChange={(e) => setOptions({ ...options, fps: Number(e.target.value) })}
                className="w-full accent-purple-600"
              />
              <p className="text-[10px] text-neutral-400">
                Used when generating animated GIFs or frame sequence archives from video clips.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all"
            style={{ backgroundColor: accentColor.hex }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
