import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  buildExportOptions,
  buildFilename,
  type ExportFormat,
} from '@toolsmith/shared';

export async function shareDocument(
  markdown: string,
  title: string,
  format: ExportFormat,
): Promise<void> {
  const option = buildExportOptions(markdown, title).find((item) => item.format === format);
  if (!option) throw new Error('未対応の書き出し形式です。');

  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('一時フォルダを利用できません。');

  const uri = `${directory}${buildFilename(title, option.ext)}`;
  await FileSystem.writeAsStringAsync(uri, option.content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('この端末では共有機能を利用できません。');

  await Sharing.shareAsync(uri, {
    mimeType: option.mime,
    dialogTitle: option.label,
  });
}
