import JSZip from 'jszip';
import { FileItem, FileCategory, SUPPORTED_FORMATS } from '../../types/converter';
import { convertImage } from './imageConverter';
import { convertDocument } from './documentConverter';
import { convertVideo } from './videoConverter';
import { emitToast } from '../../utils/notification';

export function detectFileCategory(file: File): { category: FileCategory; defaultTarget: string } {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (SUPPORTED_FORMATS.image.inputs.includes(ext) || file.type.startsWith('image/')) {
    const defaultTarget = ext === 'webp' ? 'png' : 'webp';
    return { category: 'image', defaultTarget };
  }

  if (SUPPORTED_FORMATS.video.inputs.includes(ext) || file.type.startsWith('video/')) {
    const defaultTarget = ext === 'webm' ? 'mp4' : 'webm';
    return { category: 'video', defaultTarget };
  }

  if (SUPPORTED_FORMATS.audio.inputs.includes(ext) || file.type.startsWith('audio/')) {
    return { category: 'audio', defaultTarget: 'wav' };
  }

  // Fallback to document
  const defaultTarget = ext === 'pdf' ? 'txt' : 'pdf';
  return { category: 'document', defaultTarget };
}

export function createFileItem(file: File): FileItem {
  const { category, defaultTarget } = detectFileCategory(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  let previewUrl: string | undefined = undefined;
  if (category === 'image' || category === 'video') {
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      // ignore
    }
  }

  return {
    id: 'file-' + Math.random().toString(36).substring(2, 10),
    file,
    name: file.name,
    size: file.size,
    extension: ext,
    category,
    targetFormat: defaultTarget,
    status: 'idle',
    progress: 0,
    previewUrl,
    options: {
      quality: 85,
      resizeMode: 'original',
      scalePercent: 100,
      grayscale: false,
      backgroundColor: '#ffffff',
      fps: 8,
    },
  };
}

export async function processSingleFile(
  item: FileItem,
  onProgress: (percent: number) => void
): Promise<{ blob: Blob; resultName: string; durationMs: number }> {
  const startTime = performance.now();
  const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
  let targetExt = item.targetFormat.toLowerCase().replace('.', '');
  if (targetExt === 'frames-zip') targetExt = 'zip';

  const resultName = `${baseName}_converted.${targetExt}`;
  let resultBlob: Blob;

  if (item.category === 'image') {
    resultBlob = await convertImage(item.file, item.targetFormat, item.options, onProgress);
  } else if (item.category === 'document') {
    resultBlob = await convertDocument(item.file, item.targetFormat, item.options, onProgress);
  } else if (item.category === 'video' || item.category === 'audio') {
    resultBlob = await convertVideo(item.file, item.targetFormat, item.options, onProgress);
  } else {
    throw new Error(`Unsupported category: ${item.category}`);
  }

  const durationMs = Math.round(performance.now() - startTime);
  return { blob: resultBlob, resultName, durationMs };
}

/**
 * Packs all completed files into a single ZIP file for one-click batch download.
 */
export async function createBatchZip(
  items: FileItem[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const completedItems = items.filter((item) => item.status === 'completed' && item.resultBlob);

  if (completedItems.length === 0) {
    throw new Error('No completed files available to package into ZIP.');
  }

  const nameCounts = new Map<string, number>();

  completedItems.forEach((item) => {
    let filename = item.resultName || `converted_${item.name}`;
    if (nameCounts.has(filename)) {
      const count = nameCounts.get(filename)! + 1;
      nameCounts.set(filename, count);
      const dotIndex = filename.lastIndexOf('.');
      if (dotIndex > 0) {
        filename = `${filename.slice(0, dotIndex)}_${count}${filename.slice(dotIndex)}`;
      } else {
        filename = `${filename}_${count}`;
      }
    } else {
      nameCounts.set(filename, 1);
    }

    if (item.resultBlob) {
      zip.file(filename, item.resultBlob);
    }
  });

  return await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );
}

/**
 * Triggers a browser download for a blob.
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates sample demo files so the user can test batch conversion instantly with zero effort.
 */
export async function createSampleBatchFiles(): Promise<File[]> {
  const files: File[] = [];

  // 1. Sample High-Res Color Gradient Image
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#0078D4');
    gradient.addColorStop(0.5, '#60CDFF');
    gradient.addColorStop(1, '#8764B8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('OmniConvert Sample', 80, 200);
    ctx.font = '28px sans-serif';
    ctx.fillText('100% Local Machine Transcoding Test File', 80, 260);

    // Decorative geometric shapes
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(80, 320, 400, 240);
    ctx.beginPath();
    ctx.arc(800, 400, 180, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();

    const imgBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (imgBlob) {
      files.push(new File([imgBlob], 'windows_wallpaper_sample.png', { type: 'image/png' }));
    }
  }

  // 2. Sample Data CSV File
  const csvContent = `Id,Item,Category,Price,Stock,Rating
101,Fluent Modern Keyboard,Hardware,89.99,145,4.8
102,Precision Gaming Mouse,Hardware,59.50,210,4.6
103,Mica Transcoder Pro,Software,29.99,999,4.9
104,Studio Microphone,Audio,129.00,45,4.7
105,4K IPS Monitor,Display,349.00,32,4.9`;
  files.push(new File([csvContent], 'hardware_catalog.csv', { type: 'text/csv' }));

  // 3. Sample Markdown Document
  const mdContent = `# OmniConvert Local Engine Specification

## Overview
All conversion workloads execute **100% client-side** inside the browser execution runtime. Zero bits are transferred over public or private networks.

### Performance Highlights
- Multi-core concurrent queue processing
- In-memory memory-efficient binary packing
- Zero-cloud data sovereignty guarantees

### Supported Pipelines
1. **Images**: PNG, JPG, WebP, BMP, Windows ICO, SVG, PDF
2. **Documents**: PDF, Markdown, HTML, JSON, CSV, TXT
3. **Media**: WebM, MP4, Animated GIF, Studio WAV 16-bit PCM

OmniConvert is designed for privacy, speed, and reliability.`;
  files.push(new File([mdContent], 'engine_whitepaper.md', { type: 'text/markdown' }));

  // 4. Sample Audio File (synthesized harmonic wave)
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const sampleRate = audioCtx.sampleRate;
      const durationSec = 2;
      const numSamples = sampleRate * durationSec;
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Compose a gentle pleasant acoustic wave (A4 440Hz + harmonics with decay)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 2);
        data[i] = (Math.sin(2 * Math.PI * 440 * t) * 0.4 + Math.sin(2 * Math.PI * 880 * t) * 0.2) * decay;
      }

      // Convert to wav
      const pcm16 = new Int16Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, data[i] * 32767));
      }

      const wavHeader = new ArrayBuffer(44 + pcm16.byteLength);
      const view = new DataView(wavHeader);
      // RIFF
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + pcm16.byteLength, true);
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // 1 channel
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, pcm16.byteLength, true);

      new Uint8Array(wavHeader, 44).set(new Uint8Array(pcm16.buffer));
      const audioBlob = new Blob([wavHeader], { type: 'audio/wav' });
      files.push(new File([audioBlob], 'acoustic_chime_sample.wav', { type: 'audio/wav' }));
      audioCtx.close().catch(() => {});
    }
  } catch {
    // audio fallback
  }

  return files;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
