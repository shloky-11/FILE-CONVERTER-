import { ConversionOptions } from '../../types/converter';
import { jsPDF } from 'jspdf';

/**
 * Creates a valid Windows .ICO binary file containing multi-resolution PNG icons.
 */
function createWindowsIcoBlob(pngBlobs: { width: number; height: number; blob: Blob; buffer: ArrayBuffer }[]): Blob {
  const count = pngBlobs.length;
  // Header: 6 bytes
  // Directory entries: 16 bytes each
  let offset = 6 + count * 16;
  const headerBuffer = new ArrayBuffer(6 + count * 16);
  const headerView = new DataView(headerBuffer);

  headerView.setUint16(0, 0, true); // Reserved
  headerView.setUint16(2, 1, true); // Type 1 = ICO
  headerView.setUint16(4, count, true); // Number of images

  const totalByteLength = offset + pngBlobs.reduce((acc, p) => acc + p.buffer.byteLength, 0);
  const finalBuffer = new Uint8Array(totalByteLength);

  pngBlobs.forEach((item, i) => {
    const entryOffset = 6 + i * 16;
    headerView.setUint8(entryOffset + 0, item.width >= 256 ? 0 : item.width);
    headerView.setUint8(entryOffset + 1, item.height >= 256 ? 0 : item.height);
    headerView.setUint8(entryOffset + 2, 0); // Palette count
    headerView.setUint8(entryOffset + 3, 0); // Reserved
    headerView.setUint16(entryOffset + 4, 1, true); // Color planes
    headerView.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    headerView.setUint32(entryOffset + 8, item.buffer.byteLength, true); // Size
    headerView.setUint32(entryOffset + 12, offset, true); // Offset in file

    // Copy image bytes into final buffer
    finalBuffer.set(new Uint8Array(item.buffer), offset);
    offset += item.buffer.byteLength;
  });

  // Copy header
  finalBuffer.set(new Uint8Array(headerBuffer), 0);
  return new Blob([finalBuffer], { type: 'image/x-icon' });
}

/**
 * Creates an uncompressed 24-bit/32-bit Windows BMP Blob from ImageData.
 */
function createBmpBlob(imageData: ImageData): Blob {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const rowStride = width * 3;
  const padding = (4 - (rowStride % 4)) % 4;
  const paddedRowSize = rowStride + padding;
  const pixelArraySize = paddedRowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // Bitmap File Header (14 bytes)
  view.setUint16(0, 0x4d42, false); // "BM"
  view.setUint32(2, fileSize, true); // File size
  view.setUint16(6, 0, true); // Reserved
  view.setUint16(8, 0, true); // Reserved
  view.setUint32(10, 54, true); // Offset to pixel data

  // DIB Header - BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true); // Header size
  view.setInt32(18, width, true); // Width
  view.setInt32(22, height, true); // Height (positive = bottom-up)
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 24, true); // 24-bit RGB
  view.setUint32(30, 0, true); // Compression (0 = BI_RGB)
  view.setUint32(34, pixelArraySize, true); // Image size
  view.setInt32(38, 2835, true); // 72 DPI X
  view.setInt32(42, 2835, true); // 72 DPI Y
  view.setUint32(46, 0, true); // Colors in color table
  view.setUint32(50, 0, true); // Important color count

  const uint8 = new Uint8Array(buffer);
  let destOffset = 54;

  // BMP stores rows bottom-up
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const b = data[srcIndex + 2];
      const g = data[srcIndex + 1];
      const r = data[srcIndex + 0];
      uint8[destOffset++] = b;
      uint8[destOffset++] = g;
      uint8[destOffset++] = r;
    }
    for (let p = 0; p < padding; p++) {
      uint8[destOffset++] = 0;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Loads an image file into an HTMLImageElement safely.
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * High-speed local image conversion engine.
 */
export async function convertImage(
  file: File,
  targetFormat: string,
  options: ConversionOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(15);
  const img = await loadImageFromFile(file);
  onProgress?.(35);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  // Apply resize rules
  if (options.resizeMode === 'scale' && options.scalePercent > 0) {
    const scale = options.scalePercent / 100;
    targetWidth = Math.max(1, Math.round(targetWidth * scale));
    targetHeight = Math.max(1, Math.round(targetHeight * scale));
  } else if (options.resizeMode === 'custom' && options.customWidth && options.customHeight) {
    targetWidth = Math.max(1, Math.round(options.customWidth));
    targetHeight = Math.max(1, Math.round(options.customHeight));
  } else if (options.resizeMode === 'maxBound' && options.maxBound && options.maxBound > 0) {
    const max = options.maxBound;
    if (targetWidth > max || targetHeight > max) {
      if (targetWidth >= targetHeight) {
        targetHeight = Math.max(1, Math.round((targetHeight / targetWidth) * max));
        targetWidth = max;
      } else {
        targetWidth = Math.max(1, Math.round((targetWidth / targetHeight) * max));
        targetHeight = max;
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not initialize 2D rendering canvas context.');

  // Handle background color for transparent images converted to non-transparent formats (e.g. JPG, BMP)
  const isLossyOrOpaque = ['jpg', 'jpeg', 'bmp'].includes(targetFormat.toLowerCase());
  if (isLossyOrOpaque) {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Draw image
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Apply grayscale filter if requested
  if (options.grayscale) {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  onProgress?.(65);
  const normalizedFormat = targetFormat.toLowerCase().replace('.', '');
  const quality = Math.max(0.1, Math.min(1.0, (options.quality || 85) / 100));

  // Convert to specific formats
  if (normalizedFormat === 'webp') {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onProgress?.(100);
            resolve(blob);
          } else reject(new Error('Canvas to WebP conversion failed.'));
        },
        'image/webp',
        quality
      );
    });
  }

  if (normalizedFormat === 'jpg' || normalizedFormat === 'jpeg') {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onProgress?.(100);
            resolve(blob);
          } else reject(new Error('Canvas to JPEG conversion failed.'));
        },
        'image/jpeg',
        quality
      );
    });
  }

  if (normalizedFormat === 'png') {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          onProgress?.(100);
          resolve(blob);
        } else reject(new Error('Canvas to PNG conversion failed.'));
      }, 'image/png');
    });
  }

  if (normalizedFormat === 'bmp') {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const bmpBlob = createBmpBlob(imgData);
    onProgress?.(100);
    return bmpBlob;
  }

  if (normalizedFormat === 'ico') {
    // Generate icons at standard Windows resolutions: 256, 128, 64, 48, 32, 16
    const sizes = [16, 32, 48, 64, 128, 256];
    const iconItems: { width: number; height: number; blob: Blob; buffer: ArrayBuffer }[] = [];

    for (const size of sizes) {
      const icoCanvas = document.createElement('canvas');
      icoCanvas.width = size;
      icoCanvas.height = size;
      const icoCtx = icoCanvas.getContext('2d');
      if (icoCtx) {
        icoCtx.drawImage(canvas, 0, 0, size, size);
        const pngBlob = await new Promise<Blob | null>((res) => icoCanvas.toBlob(res, 'image/png'));
        if (pngBlob) {
          const buffer = await pngBlob.arrayBuffer();
          iconItems.push({ width: size, height: size, blob: pngBlob, buffer });
        }
      }
    }

    if (iconItems.length === 0) throw new Error('Could not generate ICO icon set.');
    const icoBlob = createWindowsIcoBlob(iconItems);
    onProgress?.(100);
    return icoBlob;
  }

  if (normalizedFormat === 'pdf') {
    const orientation = targetWidth > targetHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [targetWidth, targetHeight],
    });
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, targetWidth, targetHeight);
    const pdfOutput = pdf.output('blob');
    onProgress?.(100);
    return pdfOutput;
  }

  if (normalizedFormat === 'svg') {
    // Generate an SVG containing clean embedded base64 raster representation
    const dataUrl = canvas.toDataURL('image/png');
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
  <title>${escapeXml(file.name)}</title>
  <image width="${targetWidth}" height="${targetHeight}" href="${dataUrl}"/>
</svg>`;
    onProgress?.(100);
    return new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  }

  if (normalizedFormat === 'gif') {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          onProgress?.(100);
          resolve(blob);
        } else reject(new Error('Canvas to GIF conversion failed.'));
      }, 'image/gif');
    });
  }

  throw new Error(`Unsupported image target format: ${targetFormat}`);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
