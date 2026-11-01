export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusLabel(status: 'saved' | 'saving' | 'unsaved' | 'error'): string {
  switch (status) {
    case 'saving':
      return '保存中…';
    case 'unsaved':
      return '未保存';
    case 'error':
      return '保存エラー';
    default:
      return '保存済み';
  }
}
