export type FileCategory = 'image' | 'document' | 'video' | 'audio';

export type ConversionStatus = 'idle' | 'queued' | 'converting' | 'completed' | 'error';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  extension: string;
  category: FileCategory;
  targetFormat: string;
  status: ConversionStatus;
  progress: number; // 0 to 100
  errorMessage?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  resultSize?: number;
  resultName?: string;
  conversionTimeMs?: number;
  previewUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    lines?: number;
  };
  options: ConversionOptions;
}

export interface ConversionOptions {
  quality: number; // 1 to 100 (for images/lossy formats)
  resizeMode: 'original' | 'scale' | 'custom' | 'maxBound';
  scalePercent: number; // e.g. 50, 75
  customWidth?: number;
  customHeight?: number;
  maxBound?: number; // e.g. 1920
  grayscale: boolean;
  backgroundColor: string; // for transparency conversion like PNG -> JPG
  fps?: number; // for video to GIF / frames
  extractAudio?: boolean;
}

export interface FormatDefinition {
  ext: string;
  label: string;
  category: FileCategory;
  mime: string;
  description: string;
}

export const SUPPORTED_FORMATS: Record<FileCategory, { inputs: string[]; outputs: string[] }> = {
  image: {
    inputs: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'],
    outputs: ['webp', 'png', 'jpg', 'bmp', 'ico', 'pdf', 'svg', 'gif'],
  },
  document: {
    inputs: ['txt', 'md', 'markdown', 'json', 'csv', 'html', 'htm', 'xml', 'log'],
    outputs: ['pdf', 'txt', 'html', 'md', 'json', 'csv'],
  },
  video: {
    inputs: ['mp4', 'webm', 'mov', 'mkv', 'ogg', 'avi'],
    outputs: ['webm', 'mp4', 'gif', 'wav', 'mp3', 'frames-zip'],
  },
  audio: {
    inputs: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
    outputs: ['wav', 'mp3', 'ogg'],
  },
};

export const FORMAT_DESCRIPTIONS: Record<string, string> = {
  webp: 'Modern compressed image format (efficient for web)',
  png: 'Lossless image with full transparency support',
  jpg: 'Standard photography compression with quality slider',
  bmp: 'Standard Windows Bitmap format (uncompressed)',
  ico: 'Windows Icon format with multiple embedded resolutions',
  pdf: 'Portable Document Format ready for printing & archiving',
  svg: 'Scalable Vector Graphics container',
  gif: 'Animated or static GIF graphic',
  txt: 'Universal plain text document',
  html: 'Clean HTML webpage document with styling',
  md: 'Markdown document with readable structure',
  json: 'Structured JavaScript Object Notation',
  csv: 'Comma-Separated Values table for Excel and data tools',
  webm: 'Modern lightweight HTML5 video container',
  mp4: 'Universal MP4 H.264 / AAC video container',
  wav: '100% Uncompressed 16-bit PCM studio audio',
  mp3: 'Standard compressed digital audio format',
  'frames-zip': 'ZIP archive containing extracted video frames',
};

export interface BatchStats {
  totalFiles: number;
  completedFiles: number;
  errorFiles: number;
  convertingFiles: number;
  totalOriginalBytes: number;
  totalConvertedBytes: number;
  elapsedTimeMs: number;
  throughputBytesPerSec: number;
}
