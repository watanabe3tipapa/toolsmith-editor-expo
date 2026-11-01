import type { ExportFormat, ExportOption } from './types';

export function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function sanitizeFilename(input: string): string {
  const sanitized = input
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return sanitized || 'document';
}

export function buildFilename(title: string, ext: string, date = new Date()): string {
  return `${sanitizeFilename(title)}_${formatTimestamp(date)}.${ext}`;
}

/**
 * 既存Web版の convertToHtml をそのまま移植。
 * 見出し・強調・インラインコードのみ対応（表・リスト・コードフェンスは未対応）。
 */
export function convertToHtml(markdown: string): string {
  const html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TOOLSMITH EDITOR Export</title><style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto;color:#fff;background:#0a1929}h1,h2,h3{color:#14a0e6}code{background:#14a0e622;padding:2px 6px;border-radius:4px}strong{color:#14a0e6}</style></head><body>${html}</body></html>`;
}

export function convertToJson(markdown: string): string {
  const data = {
    content: markdown,
    createdAt: new Date().toISOString(),
    format: 'markdown',
    editor: 'TOOLSMITH EDITOR',
  };
  return JSON.stringify(data, null, 2);
}

export function convertToQmd(markdown: string, title = 'TOOLSMITH EDITOR Document'): string {
  const escapedTitle = title.replace(/"/g, '\\"');
  return `---
title: "${escapedTitle}"
date: ${new Date().toISOString()}
---

${markdown}`;
}

export function buildExportOptions(markdown: string, title = 'document'): ExportOption[] {
  return [
    { format: 'md', label: 'Markdown (.md)', ext: 'md', mime: 'text/markdown', content: markdown },
    { format: 'html', label: 'HTML (.html)', ext: 'html', mime: 'text/html', content: convertToHtml(markdown) },
    { format: 'json', label: 'JSON (.json)', ext: 'json', mime: 'application/json', content: convertToJson(markdown) },
    { format: 'qmd', label: 'Quarto (.qmd)', ext: 'qmd', mime: 'text/markdown', content: convertToQmd(markdown, title) },
    { format: 'txt', label: 'Plain Text (.txt)', ext: 'txt', mime: 'text/plain', content: markdown },
  ];
}

export function findExportOption(
  options: ExportOption[],
  format: ExportFormat,
): ExportOption | undefined {
  return options.find((option) => option.format === format);
}
