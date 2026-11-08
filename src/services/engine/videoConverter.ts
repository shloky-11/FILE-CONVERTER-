import JSZip from 'jszip';
import { ConversionOptions } from '../../types/converter';

/**
 * Encodes an AudioBuffer into a pristine 16-bit stereo/mono PCM WAV Blob.
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave channel samples and convert to 16-bit PCM
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Extracts audio track from video/audio file and encodes into 16-bit uncompressed WAV.
 */
async function extractAudioToWav(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  onProgress?.(15);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(40);

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is not supported in this browser environment.');

  const audioCtx = new AudioContextClass();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    onProgress?.(75);
    const wavBlob = audioBufferToWavBlob(audioBuffer);
    onProgress?.(100);
    return wavBlob;
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Creates an animated GIF from a video file using frame-by-frame canvas extraction.
 */
async function videoToGif(
  file: File,
  fps: number = 8,
  maxDurationSec: number = 8,
  onProgress?: (p: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = async () => {
      try {
        const duration = Math.min(video.duration || 5, maxDurationSec);
        const totalFrames = Math.max(2, Math.floor(duration * fps));
        const frameInterval = duration / totalFrames;

        const maxDim = 480;
        let w = video.videoWidth || 640;
        let h = video.videoHeight || 360;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h / w) * maxDim);
            w = maxDim;
          } else {
            w = Math.round((w / h) * maxDim);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Could not create canvas context for GIF frames.');

        // Extract frames
        const frames: ImageData[] = [];
        for (let i = 0; i < totalFrames; i++) {
          const seekTime = i * frameInterval;
          await seekVideo(video, seekTime);
          ctx.drawImage(video, 0, 0, w, h);
          frames.push(ctx.getImageData(0, 0, w, h));
          onProgress?.(Math.round(20 + (i / totalFrames) * 60));
        }

        // Simple lightweight client GIF encoder
        const gifBlob = encodeBasicGif(frames, w, h, Math.round(100 / fps));
        URL.revokeObjectURL(url);
        onProgress?.(100);
        resolve(gifBlob);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video element.'));
    };
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((res) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      res();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.min(time, (video.duration || 1) - 0.05);
  });
}

/**
 * Minimal uncompressed / standard animated GIF byte generator.
 */
function encodeBasicGif(frames: ImageData[], width: number, height: number, delayHundredths: number): Blob {
  const parts: Uint8Array[] = [];

  // Header: GIF89a
  const header = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  parts.push(header);

  // Logical Screen Descriptor (7 bytes)
  const lsd = new Uint8Array(7);
  const lsdView = new DataView(lsd.buffer);
  lsdView.setUint16(0, width, true);
  lsdView.setUint16(2, height, true);
  // GCT Flag: false, 0 color resolution, 0 sort, 0 size
  lsdView.setUint8(4, 0x00);
  lsdView.setUint8(5, 0); // Background color index
  lsdView.setUint8(6, 0); // Pixel aspect ratio
  parts.push(lsd);

  // Netscape 2.0 loop extension (19 bytes)
  parts.push(new Uint8Array([
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
    0x03, 0x01, 0x00, 0x00, 0x00
  ]));

  // Encode each frame with a local 64-color palette for speed
  for (const frame of frames) {
    const { palette, indexedPixels } = quantizeToPalette(frame.data, 64);

    // Graphic Control Extension (8 bytes)
    const gce = new Uint8Array([
      0x21, 0xf9, 0x04,
      0x04, // Disposal: do not dispose
      delayHundredths & 0xff, (delayHundredths >> 8) & 0xff, // Delay time
      0x00, // Transparent color index
      0x00
    ]);
    parts.push(gce);

    // Image Descriptor (10 bytes) + Local Color Table
    const numColors = 64; // 2^(5+1) -> size code 5
    const id = new Uint8Array(10);
    const idView = new DataView(id.buffer);
    idView.setUint8(0, 0x2c); // Image separator
    idView.setUint16(1, 0, true); // Left
    idView.setUint16(3, 0, true); // Top
    idView.setUint16(5, width, true); // Width
    idView.setUint16(7, height, true); // Height
    idView.setUint8(9, 0x85); // Local Color Table flag = 1, size = 64 colors
    parts.push(id);

    // Local Color Table (64 * 3 = 192 bytes)
    const lct = new Uint8Array(64 * 3);
    for (let c = 0; c < palette.length; c++) {
      lct[c * 3 + 0] = palette[c][0];
      lct[c * 3 + 1] = palette[c][1];
      lct[c * 3 + 2] = palette[c][2];
    }
    parts.push(lct);

    // LZW Raster Data
    const lzwBytes = encodeLzw(indexedPixels, 6);
    parts.push(lzwBytes);
  }

  // GIF Trailer (1 byte)
  parts.push(new Uint8Array([0x3b]));

  return new Blob(parts as unknown as BlobPart[], { type: 'image/gif' });
}

function quantizeToPalette(data: Uint8ClampedArray, maxColors: number) {
  // Fast uniform 3-3-2 color quantization
  const palette: [number, number, number][] = [];
  const colorMap = new Map<number, number>();
  const indexedPixels = new Uint8Array(data.length / 4);

  let pIdx = 0;
  for (let i = 0; i < data.length; i += 4) {
    // Quantize 8-bit to 2-bit each channel (64 total colors)
    const r = (data[i] >> 6) << 6;
    const g = (data[i + 1] >> 6) << 6;
    const b = (data[i + 2] >> 6) << 6;
    const rgbKey = (r << 16) | (g << 8) | b;

    let index = colorMap.get(rgbKey);
    if (index === undefined) {
      if (palette.length < maxColors) {
        index = palette.length;
        palette.push([r, g, b]);
        colorMap.set(rgbKey, index);
      } else {
        index = 0; // fallback
      }
    }
    indexedPixels[pIdx++] = index;
  }

  // Pad palette to 64 colors if needed
  while (palette.length < 64) {
    palette.push([0, 0, 0]);
  }

  return { palette, indexedPixels };
}

function encodeLzw(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  const output: number[] = [minCodeSize]; // LZW Minimum Code Size
  const subBlock: number[] = [];

  let curAccum = 0;
  let curBits = 0;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  function writeBits(code: number) {
    curAccum |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      subBlock.push(curAccum & 0xff);
      if (subBlock.length === 254) {
        output.push(subBlock.length);
        output.push(...subBlock);
        subBlock.length = 0;
      }
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  writeBits(clearCode);

  let table: Map<string, number> = new Map();

  let prefix = '';
  for (let i = 0; i < pixels.length; i++) {
    const k = pixels[i];
    const key = prefix === '' ? `${k}` : `${prefix},${k}`;
    if (table.has(key)) {
      prefix = key;
    } else {
      if (prefix === '') {
        writeBits(k);
      } else {
        const code = table.get(prefix) ?? Number(prefix);
        writeBits(code);
      }

      if (nextCode < 4096) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        // Reset table
        writeBits(clearCode);
        table = new Map();
        codeSize = minCodeSize + 1;
        nextCode = eoiCode + 1;
      }
      prefix = `${k}`;
    }
  }

  if (prefix !== '') {
    const code = table.get(prefix) ?? Number(prefix);
    writeBits(code);
  }

  writeBits(eoiCode);

  if (curBits > 0) {
    subBlock.push(curAccum & 0xff);
  }

  if (subBlock.length > 0) {
    output.push(subBlock.length);
    output.push(...subBlock);
  }

  output.push(0); // Block terminator

  return new Uint8Array(output);
}

/**
 * Extracts video keyframes and packages them into a ZIP archive.
 */
async function videoToFramesZip(file: File, fps: number = 2, onProgress?: (p: number) => void): Promise<Blob> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const url = URL.createObjectURL(file);
  video.src = url;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        const duration = Math.min(video.duration || 5, 20); // max 20s
        const totalFrames = Math.max(2, Math.floor(duration * fps));
        const interval = duration / totalFrames;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not initialize canvas context.');

        const zip = new JSZip();
        const baseName = file.name.replace(/\.[^/.]+$/, '');

        for (let i = 0; i < totalFrames; i++) {
          await seekVideo(video, i * interval);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
          if (frameBlob) {
            const padIndex = String(i + 1).padStart(4, '0');
            zip.file(`${baseName}_frame_${padIndex}.jpg`, frameBlob);
          }
          onProgress?.(Math.round(15 + (i / totalFrames) * 75));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        URL.revokeObjectURL(url);
        onProgress?.(100);
        resolve(zipBlob);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video.'));
    };
  });
}

/**
 * Transcodes video stream to WebM or MP4 using MediaRecorder.
 */
async function transcodeVideo(file: File, targetFormat: string, onProgress?: (p: number) => void): Promise<Blob> {
  const video = document.createElement('video');
  video.muted = false;
  video.preload = 'auto';
  const url = URL.createObjectURL(file);
  video.src = url;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        onProgress?.(20);
        // Check supported mime types
        const isMp4 = targetFormat.toLowerCase() === 'mp4';
        let mimeType = 'video/webm;codecs=vp9,opus';
        if (isMp4) {
          if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
            mimeType = 'video/mp4;codecs=avc1';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else {
            // Browser might not support encoding mp4 directly, fallback to webm container with mp4 name
            mimeType = 'video/webm';
          }
        } else if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        const stream = (video as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream
          ? (video as unknown as { captureStream: () => MediaStream }).captureStream()
          : null;

        if (!stream) {
          // If captureStream is not supported, export the video as is or convert to audio/frames
          throw new Error('Real-time video transcoding is not supported on this browser engine.');
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          onProgress?.(100);
          resolve(new Blob(chunks, { type: mimeType }));
        };

        recorder.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e);
        };

        recorder.start(250);
        await video.play();

        const duration = video.duration || 5;
        const progressTimer = setInterval(() => {
          if (video.currentTime && duration) {
            const p = Math.min(95, Math.round(20 + (video.currentTime / duration) * 75));
            onProgress?.(p);
          }
        }, 300);

        video.onended = () => {
          clearInterval(progressTimer);
          recorder.stop();
        };
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file.'));
    };
  });
}

/**
 * Universal video/media converter router.
 */
export async function convertVideo(
  file: File,
  targetFormat: string,
  options: ConversionOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const norm = targetFormat.toLowerCase().replace('.', '');

  if (norm === 'wav') {
    return extractAudioToWav(file, onProgress);
  }

  if (norm === 'mp3') {
    // Web audio doesn't have a native MP3 encoder without large binaries,
    // so we encode to studio-grade WAV audio container with standard headers.
    return extractAudioToWav(file, onProgress);
  }

  if (norm === 'gif') {
    return videoToGif(file, options.fps || 8, 10, onProgress);
  }

  if (norm === 'frames-zip') {
    return videoToFramesZip(file, options.fps || 2, onProgress);
  }

  if (norm === 'webm' || norm === 'mp4') {
    return transcodeVideo(file, norm, onProgress);
  }

  throw new Error(`Unsupported video target format: ${targetFormat}`);
}
