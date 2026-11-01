import { DEFAULT_TITLE } from './constants';

/**
 * 本文の先頭H1を見出しとして採用し、なければ最初の非空行の先頭40文字を使う。
 * Web版 toolsmith-editor/src/lib/storage.ts の extractTitle と同等。
 */
export function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  const firstLine = content.split('\n').find((line) => line.trim().length > 0);
  if (firstLine) return firstLine.trim().slice(0, 40);
  return DEFAULT_TITLE;
}

export function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(content: string): number {
  return content.length;
}
