import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { createDocument } from '../db/database';
import type { DocumentRecord } from '@toolsmith/shared';

const MARKDOWN_TYPES = ['text/markdown', 'text/plain', 'text/x-markdown'];

export async function importMarkdownDocument(): Promise<DocumentRecord | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: MARKDOWN_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];

  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return createDocument({
    content,
    title: asset.name?.replace(/\.(md|markdown|txt)$/i, ''),
  });
}
