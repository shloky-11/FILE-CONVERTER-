import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileImage, FileText, Film, Sparkles, Clipboard, FolderPlus } from 'lucide-react';
import { AccentColor } from './WindowsTitleBar';

interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  onLoadSamples: () => void;
  accentColor: AccentColor;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesAdded,
  onLoadSamples,
  accentColor,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler to grab screenshots or copied files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        onFilesAdded(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, onFilesAdded]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesAdded(filesArray);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesAdded(filesArray);
      // Reset input value to allow selecting identical file again
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-all p-6 text-center select-none ${
        isDragging
          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 shadow-md scale-[1.005]'
          : 'border-neutral-300 dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-[#1e1e24]/60 hover:border-neutral-400 dark:hover:border-neutral-600'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md mb-3 transition-transform"
          style={{ backgroundColor: accentColor.hex }}
        >
          <UploadCloud className="w-6 h-6 animate-pulse" />
        </div>

        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Drag and drop files here to convert
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-4">
          Batch process images, documents, and video/audio locally with hardware acceleration
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all"
            style={{ backgroundColor: accentColor.hex }}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Browse Files</span>
          </button>

          <button
            onClick={onLoadSamples}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/70 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Load Demo Batch</span>
          </button>

          <button
            onClick={async () => {
              try {
                const clipboardItems = await navigator.clipboard.read();
                const pasted: File[] = [];
                for (const item of clipboardItems) {
                  for (const type of item.types) {
                    if (type.startsWith('image/')) {
                      const blob = await item.getType(type);
                      pasted.push(new File([blob], `clipboard_${Date.now()}.png`, { type }));
                    }
                  }
                }
                if (pasted.length > 0) onFilesAdded(pasted);
              } catch {
                // Clipboard read may require user focus or permissions
              }
            }}
            disabled={disabled}
            title="Paste image directly from clipboard (Ctrl+V)"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <Clipboard className="w-3.5 h-3.5 text-neutral-400" />
            <span>Paste (Ctrl+V)</span>
          </button>
        </div>

        {/* Clean Typographic Supported Categories */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400 mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800/80 w-full">
          <div className="flex items-center gap-1.5">
            <FileImage className="w-3.5 h-3.5 text-sky-500" />
            <span>Images: PNG · JPG · WebP · BMP · ICO · SVG · PDF</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>Docs: PDF · Markdown · HTML · JSON · CSV · TXT</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-700">|</span>
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-purple-500" />
            <span>Video/Audio: WebM · MP4 · GIF · WAV · MP3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
