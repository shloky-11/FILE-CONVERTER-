import React from 'react';
import { Sparkles, Cpu, Search, Layers, FileImage, FileText, Film } from 'lucide-react';
import { FileCategory } from '../types/converter';
import { AccentColor } from './WindowsTitleBar';

interface BatchPresetsBarProps {
  onApplyPreset: (presetKey: string) => void;
  activeCategory: FileCategory | 'all';
  onSelectCategory: (cat: FileCategory | 'all') => void;
  categoryCounts: Record<FileCategory | 'all', number>;
  concurrency: number;
  onChangeConcurrency: (n: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  accentColor: AccentColor;
  disabled?: boolean;
}

export const BatchPresetsBar: React.FC<BatchPresetsBarProps> = ({
  onApplyPreset,
  activeCategory,
  onSelectCategory,
  categoryCounts,
  concurrency,
  onChangeConcurrency,
  searchQuery,
  onSearchChange,
  accentColor,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-4 bg-white/70 dark:bg-[#1a1a20]/70 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
      {/* Category Segmented Tabs (Functional Buttons) */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg shrink-0">
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            activeCategory === 'all'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Files</span>
          <span className="text-[10px] font-mono opacity-70">({categoryCounts.all})</span>
        </button>

        <button
          onClick={() => onSelectCategory('image')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            activeCategory === 'image'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <FileImage className="w-3.5 h-3.5 text-sky-500" />
          <span>Images</span>
          <span className="text-[10px] font-mono opacity-70">({categoryCounts.image})</span>
        </button>

        <button
          onClick={() => onSelectCategory('document')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            activeCategory === 'document'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>Documents</span>
          <span className="text-[10px] font-mono opacity-70">({categoryCounts.document})</span>
        </button>

        <button
          onClick={() => onSelectCategory('video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
            activeCategory === 'video'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-purple-500" />
          <span>Media & Audio</span>
          <span className="text-[10px] font-mono opacity-70">({categoryCounts.video + categoryCounts.audio})</span>
        </button>
      </div>

      {/* Center: Quick Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-neutral-400 dark:text-neutral-500 flex items-center gap-1 shrink-0 font-medium">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Batch Preset:</span>
        </span>

        <button
          onClick={() => onApplyPreset('all-webp')}
          disabled={disabled}
          title="Convert all images in queue to WebP (85% Quality)"
          className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium whitespace-nowrap transition-colors"
        >
          All to WebP
        </button>

        <button
          onClick={() => onApplyPreset('all-pdf')}
          disabled={disabled}
          title="Convert all images and documents to PDF"
          className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium whitespace-nowrap transition-colors"
        >
          All to PDF
        </button>

        <button
          onClick={() => onApplyPreset('all-png')}
          disabled={disabled}
          title="Convert all images to lossless PNG"
          className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium whitespace-nowrap transition-colors"
        >
          All to PNG
        </button>

        <button
          onClick={() => onApplyPreset('extract-audio')}
          disabled={disabled}
          title="Extract clean studio 16-bit WAV audio from all video files"
          className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-medium whitespace-nowrap transition-colors"
        >
          Extract Audio (WAV)
        </button>
      </div>

      {/* Right: Search Filter & Multi-Core Concurrency Control */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-36 pl-8 pr-2 py-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </div>

        {/* Concurrency Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-300 dark:border-neutral-800" title="Parallel processing threads">
          <Cpu className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-[11px] text-neutral-500">Threads:</span>
          <select
            value={concurrency}
            onChange={(e) => onChangeConcurrency(Number(e.target.value))}
            className="bg-transparent font-mono font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x (Fast)</option>
            <option value={8}>8x (Ultra)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
