import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image, Film, Music, CheckCircle2 } from 'lucide-react';
import { FileItem } from '../types/converter';
import { formatBytes, triggerDownload } from '../services/engine/batchManager';
import { AccentColor } from './WindowsTitleBar';

interface FilePreviewModalProps {
  item: FileItem | null;
  onClose: () => void;
  accentColor: AccentColor;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  item,
  onClose,
  accentColor,
}) => {
  if (!item) return null;

  const [textContent, setTextContent] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (item.resultBlob) {
      url = URL.createObjectURL(item.resultBlob);
      setResultUrl(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  useEffect(() => {
    if (item.category === 'document') {
      if (item.resultBlob) {
        item.resultBlob.text().then(setTextContent).catch(() => {});
      } else {
        item.file.text().then(setTextContent).catch(() => {});
      }
    } else {
      setTextContent(null);
    }
  }, [item]);

  const isCompleted = item.status === 'completed' && item.resultBlob;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#1a1a20] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="flex items-center gap-2 truncate">
            {item.category === 'image' && <Image className="w-4 h-4 text-sky-500" />}
            {item.category === 'document' && <FileText className="w-4 h-4 text-emerald-500" />}
            {item.category === 'video' && <Film className="w-4 h-4 text-purple-500" />}
            {item.category === 'audio' && <Music className="w-4 h-4 text-amber-500" />}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              Preview & Inspector: {item.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-50 dark:bg-[#151518]">
          {/* IMAGE PREVIEW */}
          {item.category === 'image' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Preview */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-[#1f1f26] border border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-500 mb-2">Original ({item.extension.toUpperCase()})</span>
                <div className="w-full h-64 flex items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900/50">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Image className="w-12 h-12 text-neutral-400" />
                  )}
                </div>
                <div className="w-full mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between text-[11px] text-neutral-500 font-mono">
                  <span>Size: {formatBytes(item.size)}</span>
                  <span>Type: {item.file.type || item.extension}</span>
                </div>
              </div>

              {/* Converted Output Preview */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-white dark:bg-[#1f1f26] border border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-500 mb-2 flex items-center gap-1">
                  <span>Converted Output ({item.targetFormat.toUpperCase()})</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </span>
                <div className="w-full h-64 flex items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900/50">
                  {resultUrl && (item.targetFormat !== 'pdf' && item.targetFormat !== 'ico') ? (
                    <img
                      src={resultUrl}
                      alt="Converted"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : isCompleted ? (
                    <div className="text-center p-4">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.resultName} Ready
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Compiled successfully ({item.targetFormat.toUpperCase()})
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400 italic">Not yet converted</span>
                  )}
                </div>
                <div className="w-full mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between text-[11px] text-neutral-500 font-mono">
                  <span>Size: {item.resultSize ? formatBytes(item.resultSize) : '—'}</span>
                  <span>Format: {item.targetFormat.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT PREVIEW */}
          {item.category === 'document' && (
            <div className="rounded-xl bg-white dark:bg-[#1f1f26] border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span>Text / Document Content</span>
                <span className="font-mono">{item.resultSize ? formatBytes(item.resultSize) : formatBytes(item.size)}</span>
              </div>
              <pre className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 max-h-96 overflow-auto whitespace-pre-wrap">
                {textContent || 'Loading document preview...'}
              </pre>
            </div>
          )}

          {/* MEDIA (VIDEO / AUDIO) PREVIEW */}
          {(item.category === 'video' || item.category === 'audio') && (
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-[#1f1f26] border border-neutral-200 dark:border-neutral-800">
              {item.category === 'video' && item.previewUrl && (
                <video
                  src={resultUrl || item.previewUrl}
                  controls
                  className="max-w-full max-h-80 rounded-lg shadow-sm mb-4"
                />
              )}
              {item.category === 'audio' && (
                <div className="w-full max-w-md py-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6" />
                  </div>
                  <audio
                    src={resultUrl || item.previewUrl}
                    controls
                    className="w-full"
                  />
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono mt-2">
                <span>Original: {formatBytes(item.size)}</span>
                {item.resultSize && <span>Converted: {formatBytes(item.resultSize)}</span>}
                {item.conversionTimeMs && <span>Processed in: {(item.conversionTimeMs / 1000).toFixed(2)}s</span>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="text-neutral-500">
            Status: <span className="font-medium text-neutral-800 dark:text-neutral-200 capitalize">{item.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Close
            </button>
            {isCompleted && item.resultBlob && (
              <button
                onClick={() => triggerDownload(item.resultBlob!, item.resultName || `converted_${item.name}`)}
                className="flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all"
                style={{ backgroundColor: accentColor.hex }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Converted File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
