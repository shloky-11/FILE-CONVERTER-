import { jsPDF } from 'jspdf';
import { ConversionOptions } from '../../types/converter';

/**
 * Parses CSV text into an array of rows and column headers.
 */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

/**
 * Converts JSON array or object into CSV string.
 */
function jsonToCsv(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    let items: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      items = parsed.filter((item) => typeof item === 'object' && item !== null);
    } else if (typeof parsed === 'object' && parsed !== null) {
      items = [parsed as Record<string, unknown>];
    } else {
      throw new Error('JSON is not an array of objects or an object.');
    }

    if (items.length === 0) return '';
    const headers = Array.from(new Set(items.flatMap((item) => Object.keys(item))));

    const csvRows: string[] = [];
    csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const item of items) {
      const row = headers.map((header) => {
        const val = item[header];
        if (val === undefined || val === null) return '""';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    return csvRows.join('\r\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to convert JSON to CSV: ${msg}`);
  }
}

/**
 * Converts CSV string to JSON formatted string.
 */
function csvToJson(csvStr: string): string {
  const { headers, rows } = parseCsv(csvStr);
  if (headers.length === 0) return '[]';

  const result = rows.map((row) => {
    const obj: Record<string, string | number | boolean> = {};
    headers.forEach((header, idx) => {
      const val = row[idx] ?? '';
      // attempt number / boolean parse
      if (val.toLowerCase() === 'true') obj[header] = true;
      else if (val.toLowerCase() === 'false') obj[header] = false;
      else if (!isNaN(Number(val)) && val.trim() !== '') obj[header] = Number(val);
      else obj[header] = val;
    });
    return obj;
  });

  return JSON.stringify(result, null, 2);
}

/**
 * Converts Markdown or plain text into clean styled standalone HTML.
 */
function textOrMarkdownToHtml(content: string, title: string): string {
  // Simple clean markdown parser
  let htmlBody = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  htmlBody = htmlBody.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Headers
  htmlBody = htmlBody.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  htmlBody = htmlBody.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  htmlBody = htmlBody.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Bold & Italics
  htmlBody = htmlBody.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  htmlBody = htmlBody.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Lists
  htmlBody = htmlBody.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  htmlBody = htmlBody.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  // Paragraphs
  htmlBody = htmlBody.split(/\n{2,}/).map(para => {
    if (para.startsWith('<h') || para.startsWith('<pre') || para.startsWith('<ul')) return para;
    return `<p>${para.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      background: #fafafa;
    }
    .document-card {
      background: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1, h2, h3 { color: #111827; }
    h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    pre { background: #f3f4f6; padding: 16px; border-radius: 6px; overflow-x: auto; font-family: monospace; }
    p { margin-bottom: 1em; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="document-card">
    ${htmlBody}
  </div>
</body>
</html>`;
}

/**
 * Renders any document content into a professional, multi-page PDF document using jsPDF.
 */
function renderDocumentToPdf(content: string, fileName: string): Blob {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(fileName, margin, 45);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(1);
  doc.line(margin, 55, pageWidth - margin, 55);

  // Content
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);

  const lines = doc.splitTextToSize(content, contentWidth);
  let cursorY = 75;
  const lineHeight = 14;

  let pageIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    if (cursorY + lineHeight > pageHeight - margin) {
      // Add page number footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${pageIndex}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

      doc.addPage();
      pageIndex++;
      cursorY = 50;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
    }
    doc.text(lines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  // Footer for last page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageIndex}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  return doc.output('blob');
}

/**
 * High-speed local document conversion engine.
 */
export async function convertDocument(
  file: File,
  targetFormat: string,
  _options: ConversionOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(20);
  const text = await file.text();
  onProgress?.(45);

  const normalizedTarget = targetFormat.toLowerCase().replace('.', '');
  const originalExt = file.name.split('.').pop()?.toLowerCase() || '';

  // TXT Output
  if (normalizedTarget === 'txt') {
    onProgress?.(80);
    let outText = text;
    if (originalExt === 'html' || originalExt === 'htm') {
      const parser = new DOMParser();
      const dom = parser.parseFromString(text, 'text/html');
      outText = dom.body.textContent || dom.body.innerText || text;
    }
    onProgress?.(100);
    return new Blob([outText], { type: 'text/plain;charset=utf-8' });
  }

  // PDF Output
  if (normalizedTarget === 'pdf') {
    onProgress?.(70);
    const pdfBlob = renderDocumentToPdf(text, file.name);
    onProgress?.(100);
    return pdfBlob;
  }

  // HTML Output
  if (normalizedTarget === 'html') {
    onProgress?.(80);
    const htmlContent = textOrMarkdownToHtml(text, file.name);
    onProgress?.(100);
    return new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  }

  // Markdown Output
  if (normalizedTarget === 'md') {
    onProgress?.(80);
    let mdContent = text;
    if (originalExt === 'html' || originalExt === 'htm') {
      // Basic strip down to markdown headings and text
      mdContent = text
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    }
    onProgress?.(100);
    return new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  }

  // JSON Output
  if (normalizedTarget === 'json') {
    onProgress?.(75);
    if (originalExt === 'csv') {
      const jsonStr = csvToJson(text);
      onProgress?.(100);
      return new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    }
    // Pretty-format json if already json or text
    try {
      const parsed = JSON.parse(text);
      onProgress?.(100);
      return new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json;charset=utf-8' });
    } catch {
      const jsonFallback = JSON.stringify({ filename: file.name, content: text }, null, 2);
      onProgress?.(100);
      return new Blob([jsonFallback], { type: 'application/json;charset=utf-8' });
    }
  }

  // CSV Output
  if (normalizedTarget === 'csv') {
    onProgress?.(75);
    if (originalExt === 'json') {
      const csvData = jsonToCsv(text);
      onProgress?.(100);
      return new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    }
    // Text lines to CSV
    const rows = text.split(/\r?\n/).map((line) => `"${line.replace(/"/g, '""')}"`);
    onProgress?.(100);
    return new Blob([`"Text Line"\r\n${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  }

  throw new Error(`Unsupported document target format: ${targetFormat}`);
}
