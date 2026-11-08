import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WindowsTitleBar,
  ACCENT_COLORS,
  AccentColor,
} from './components/WindowsTitleBar';
import { DropZone } from './components/DropZone';
import { BatchHeader } from './components/BatchHeader';
import { BatchPresetsBar } from './components/BatchPresetsBar';
import { FileItemRow } from './components/FileItemRow';
import { FileOptionsModal } from './components/FileOptionsModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { WindowsNotificationToast } from './components/WindowsNotificationToast';
import { WindowsStatusBar } from './components/WindowsStatusBar';
import {
  FileItem,
  FileCategory,
  ConversionOptions,
} from './types/converter';
import {
  createFileItem,
  processSingleFile,
  createBatchZip,
  createSampleBatchFiles,
  triggerDownload,
} from './services/engine/batchManager';
import { emitToast } from './utils/notification';
import { playStartTick, playBatchCompleteChime } from './utils/audioChime';
import { Layers, FolderOpen } from 'lucide-react';

export default function App() {
  // Theme & Window State
  const [isDark, setIsDark] = useState<boolean>(true);
  const [accentColor, setAccentColor] = useState<AccentColor>(ACCENT_COLORS[0]);
  const [isMaximized, setIsMaximized] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // File Queue & Processing State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [concurrency, setConcurrency] = useState<number>(4);
  const [activeCategory, setActiveCategory] = useState<FileCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedOptionsItem, setSelectedOptionsItem] = useState<FileItem | null>(null);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<FileItem | null>(null);

  // Zipping state
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);

  // Real-time Throughput Tracking
  const [throughput, setThroughput] = useState<number>(0);
  const processingAbortRef = useRef<boolean>(false);

  // Sync theme with HTML root class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handle adding new files
  const handleAddFiles = useCallback((incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return;
    const newItems = incomingFiles.map(createFileItem);
    setFiles((prev) => [...prev, ...newItems]);
    playStartTick();

    emitToast({
      title: `${newItems.length} ${newItems.length === 1 ? 'file' : 'files'} added`,
      message: 'Files loaded into batch queue. Select target format or run batch conversion.',
      type: 'info',
    });
  }, []);

  // Load sample demo batch
  const handleLoadSamples = async () => {
    try {
      const sampleFiles = await createSampleBatchFiles();
      handleAddFiles(sampleFiles);
    } catch (err) {
      console.error('Failed to generate sample files:', err);
    }
  };

  // Update target format for a specific file
  const handleUpdateTarget = (id: string, targetFormat: string) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, targetFormat, status: 'idle', progress: 0 } : item))
    );
  };

  // Remove file from queue
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear entire queue
  const handleClearQueue = () => {
    setFiles([]);
    setThroughput(0);
  };

  // Save tuned options for a file
  const handleSaveOptions = (id: string, options: ConversionOptions) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, options, status: 'idle', progress: 0 } : item))
    );
  };

  // Batch Presets
  const handleApplyPreset = (presetKey: string) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (presetKey === 'all-webp' && item.category === 'image') {
          return { ...item, targetFormat: 'webp', status: 'idle', progress: 0 };
        }
        if (presetKey === 'all-pdf' && (item.category === 'image' || item.category === 'document')) {
          return { ...item, targetFormat: 'pdf', status: 'idle', progress: 0 };
        }
        if (presetKey === 'all-png' && item.category === 'image') {
          return { ...item, targetFormat: 'png', status: 'idle', progress: 0 };
        }
        if (presetKey === 'extract-audio' && (item.category === 'video' || item.category === 'audio')) {
          return { ...item, targetFormat: 'wav', status: 'idle', progress: 0 };
        }
        return item;
      })
    );
    playStartTick();
    emitToast({
      title: 'Batch Preset Applied',
      message: `Applied ${presetKey.replace('-', ' ').toUpperCase()} across eligible files in queue.`,
      type: 'info',
    });
  };

  // Start Batch Processing Engine with Parallel Concurrency Pool
  const handleStartBatch = async () => {
    if (isProcessing) return;
    const idleItems = files.filter((f) => f.status === 'idle' || f.status === 'error');
    if (idleItems.length === 0) return;

    setIsProcessing(true);
    processingAbortRef.current = false;
    playStartTick();

    const startTime = performance.now();
    let totalProcessedBytes = 0;
    let completedInBatch = 0;

    // Queue of item IDs to process
    const queue = [...idleItems.map((f) => f.id)];

    // Mark queued items
    setFiles((prev) =>
      prev.map((f) => (queue.includes(f.id) ? { ...f, status: 'queued', progress: 0 } : f))
    );

    // Worker pool
    const activeWorkers: Promise<void>[] = [];
    const poolSize = Math.max(1, Math.min(concurrency, queue.length));

    const runWorker = async () => {
      while (queue.length > 0 && !processingAbortRef.current) {
        const itemId = queue.shift();
        if (!itemId) break;

        // Update status to converting
        setFiles((prev) =>
          prev.map((f) => (f.id === itemId ? { ...f, status: 'converting', progress: 10 } : f))
        );

        // Fetch current file item reference
        const currentItem = files.find((f) => f.id === itemId);
        if (!currentItem) continue;

        try {
          const { blob, resultName, durationMs } = await processSingleFile(currentItem, (progress) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === itemId ? { ...f, progress } : f))
            );
          });

          totalProcessedBytes += currentItem.size;
          completedInBatch++;

          const elapsedSec = (performance.now() - startTime) / 1000;
          if (elapsedSec > 0.2) {
            setThroughput(Math.round(totalProcessedBytes / elapsedSec));
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? {
                    ...f,
                    status: 'completed',
                    progress: 100,
                    resultBlob: blob,
                    resultName,
                    resultSize: blob.size,
                    conversionTimeMs: durationMs,
                  }
                : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Conversion failed';
          setFiles((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? { ...f, status: 'error', progress: 0, errorMessage: msg }
                : f
            )
          );
        }
      }
    };

    for (let i = 0; i < poolSize; i++) {
      activeWorkers.push(runWorker());
    }

    await Promise.all(activeWorkers);
    setIsProcessing(false);

    // On completion
    if (!processingAbortRef.current && completedInBatch > 0) {
      playBatchCompleteChime();
      emitToast({
        title: 'Batch Conversion Complete!',
        message: `Successfully transcoded ${completedInBatch} files locally without cloud uploads.`,
        type: 'success',
        actionLabel: 'Download All (.zip)',
        onAction: () => handleDownloadAllZip(),
      });
    }
  };

  const handlePauseBatch = () => {
    processingAbortRef.current = true;
    setIsProcessing(false);
    emitToast({
      title: 'Batch Paused',
      message: 'Current file conversions will finish, remaining queued files paused.',
      type: 'info',
    });
  };

  // Download all completed files as a unified ZIP archive
  const handleDownloadAllZip = async () => {
    const completedItems = files.filter((f) => f.status === 'completed' && f.resultBlob);
    if (completedItems.length === 0) return;

    try {
      setIsZipping(true);
      setZipProgress(0);
      const zipBlob = await createBatchZip(files, (p) => setZipProgress(p));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      triggerDownload(zipBlob, `OmniConvert_Batch_${timestamp}.zip`);

      emitToast({
        title: 'ZIP Archive Downloaded',
        message: `Packaged ${completedItems.length} converted files into single ZIP archive.`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create ZIP';
      emitToast({
        title: 'ZIP Error',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsZipping(false);
    }
  };

  // Computed summary stats
  const completedCount = files.filter((f) => f.status === 'completed').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const convertingCount = files.filter((f) => f.status === 'converting').length;
  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
  const totalConvertedSize = files.reduce((acc, f) => acc + (f.resultSize || 0), 0);

  // Category counts
  const categoryCounts: Record<FileCategory | 'all', number> = {
    all: files.length,
    image: files.filter((f) => f.category === 'image').length,
    document: files.filter((f) => f.category === 'document').length,
    video: files.filter((f) => f.category === 'video').length,
    audio: files.filter((f) => f.category === 'audio').length,
  };

  // Filtered files based on active category & search query
  const filteredFiles = files.filter((f) => {
    const matchesCat =
      activeCategory === 'all'
        ? true
        : activeCategory === 'video'
        ? f.category === 'video' || f.category === 'audio'
        : f.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.targetFormat.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-200/60 dark:bg-[#121215] flex flex-col items-center justify-center p-0 md:p-3 transition-colors">
      {/* Windows Application Window Container */}
      <div
        className={`w-full flex flex-col bg-neutral-100 dark:bg-[#18181c] border border-neutral-300 dark:border-neutral-800/90 shadow-2xl overflow-hidden transition-all duration-200 ${
          isMaximized
            ? 'min-h-screen md:min-h-[96vh] rounded-none md:rounded-xl max-w-[1520px]'
            : 'h-[85vh] max-w-[1280px] rounded-xl'
        } ${isMinimized ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        {/* Windows 11 Title Bar */}
        <WindowsTitleBar
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          accentColor={accentColor}
          onChangeAccent={setAccentColor}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
          onMinimize={() => {
            setIsMinimized(true);
            setTimeout(() => setIsMinimized(false), 800); // restore after demo peek
          }}
          onClose={() => {
            emitToast({
              title: 'Windows Application Active',
              message: 'OmniConvert runs locally inside your browser runtime. All files remain in memory.',
              type: 'info',
            });
          }}
        />

        {/* Main Application Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-100/70 dark:bg-[#141418]">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Batch Progress & Toolbar Header */}
            <BatchHeader
              totalFiles={files.length}
              completedCount={completedCount}
              errorCount={errorCount}
              convertingCount={convertingCount}
              isProcessing={isProcessing}
              totalOriginalSize={totalOriginalSize}
              totalConvertedSize={totalConvertedSize}
              throughput={throughput}
              onStartBatch={handleStartBatch}
              onPauseBatch={handlePauseBatch}
              onDownloadAllZip={handleDownloadAllZip}
              onClearQueue={handleClearQueue}
              isZipping={isZipping}
              zipProgress={zipProgress}
              accentColor={accentColor}
            />

            {/* Drag & Drop Zone */}
            <DropZone
              onFilesAdded={handleAddFiles}
              onLoadSamples={handleLoadSamples}
              accentColor={accentColor}
              disabled={isProcessing}
            />

            {/* Presets & Filter Controls */}
            {files.length > 0 && (
              <BatchPresetsBar
                onApplyPreset={handleApplyPreset}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                categoryCounts={categoryCounts}
                concurrency={concurrency}
                onChangeConcurrency={setConcurrency}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                accentColor={accentColor}
                disabled={isProcessing}
              />
            )}

            {/* File List / Queue */}
            {files.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Queued Files ({filteredFiles.length})</span>
                  </div>
                  <span className="text-[11px]">Hardware Acceleration Enabled</span>
                </div>

                {filteredFiles.map((item) => (
                  <FileItemRow
                    key={item.id}
                    item={item}
                    onUpdateTarget={handleUpdateTarget}
                    onRemove={handleRemoveFile}
                    onOpenSettings={(f) => setSelectedOptionsItem(f)}
                    onOpenPreview={(f) => setSelectedPreviewItem(f)}
                    accentColor={accentColor}
                    disabled={isProcessing}
                  />
                ))}
              </div>
            ) : (
              /* Clean Empty State */
              <div className="py-12 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/20">
                <FolderOpen className="w-10 h-10 text-neutral-400 mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  No files in queue
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  Drag and drop files from Windows Explorer or click below to load demo sample batch files.
                </p>
                <button
                  onClick={handleLoadSamples}
                  className="mt-4 px-4 py-2 text-xs font-medium text-white rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor.hex }}
                >
                  Load Demo Batch Files
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Windows Explorer Status Strip */}
        <WindowsStatusBar
          totalFiles={files.length}
          completedCount={completedCount}
          totalOriginalSize={totalOriginalSize}
          totalConvertedSize={totalConvertedSize}
          concurrency={concurrency}
          isProcessing={isProcessing}
        />
      </div>

      {/* Options Tuning Modal */}
      <FileOptionsModal
        item={selectedOptionsItem}
        onClose={() => setSelectedOptionsItem(null)}
        onSaveOptions={handleSaveOptions}
        accentColor={accentColor}
      />

      {/* Preview & Comparison Modal */}
      <FilePreviewModal
        item={selectedPreviewItem}
        onClose={() => setSelectedPreviewItem(null)}
        accentColor={accentColor}
      />

      {/* Windows 11 Action Center Notification Toasts */}
      <WindowsNotificationToast accentColor={accentColor} />
    </div>
  );
}
