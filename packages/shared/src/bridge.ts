import type { ExportFormat, ThemeName } from './types';

export type EditorInitMessage = {
  type: 'INIT';
  documentId: string;
  markdown: string;
  theme?: ThemeName;
  previewVisible?: boolean;
};

export type EditorLoadDocumentMessage = {
  type: 'LOAD_DOCUMENT';
  documentId: string;
  markdown: string;
};

export type EditorRequestMarkdownMessage = {
  type: 'REQUEST_MARKDOWN';
  requestId: string;
};

export type EditorInsertTextMessage = {
  type: 'INSERT_TEXT';
  text: string;
};

export type EditorSetPreviewVisibleMessage = {
  type: 'SET_PREVIEW_VISIBLE';
  visible: boolean;
};

export type EditorSetThemeMessage = {
  type: 'SET_THEME';
  theme: ThemeName;
};

export type EditorFocusMessage = {
  type: 'FOCUS_EDITOR';
};

export type HostToEditorMessage =
  | EditorInitMessage
  | EditorLoadDocumentMessage
  | EditorRequestMarkdownMessage
  | EditorInsertTextMessage
  | EditorSetPreviewVisibleMessage
  | EditorSetThemeMessage
  | EditorFocusMessage;

export type EditorReadyMessage = {
  type: 'READY';
};

export type EditorContentChangedMessage = {
  type: 'CONTENT_CHANGED';
  documentId: string;
  markdown: string;
  charCount: number;
  wordCount: number;
};

export type EditorSaveRequestMessage = {
  type: 'SAVE_REQUEST';
  documentId: string;
  markdown: string;
  charCount: number;
  wordCount: number;
};

export type EditorExportRequestMessage = {
  type: 'EXPORT_REQUEST';
  format: ExportFormat;
  markdown: string;
};

export type EditorOpenLinkMessage = {
  type: 'OPEN_LINK';
  url: string;
};

export type EditorErrorMessage = {
  type: 'ERROR';
  message: string;
};

export type EditorMarkdownResultMessage = {
  type: 'MARKDOWN_RESULT';
  requestId: string;
  documentId: string;
  markdown: string;
};

export type EditorToHostMessage =
  | EditorReadyMessage
  | EditorContentChangedMessage
  | EditorSaveRequestMessage
  | EditorExportRequestMessage
  | EditorOpenLinkMessage
  | EditorErrorMessage
  | EditorMarkdownResultMessage;

const HOST_TO_EDITOR_TYPES = new Set([
  'INIT',
  'LOAD_DOCUMENT',
  'REQUEST_MARKDOWN',
  'INSERT_TEXT',
  'SET_PREVIEW_VISIBLE',
  'SET_THEME',
  'FOCUS_EDITOR',
]);

const EDITOR_TO_HOST_TYPES = new Set([
  'READY',
  'CONTENT_CHANGED',
  'SAVE_REQUEST',
  'EXPORT_REQUEST',
  'OPEN_LINK',
  'ERROR',
  'MARKDOWN_RESULT',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseHostToEditorMessage(raw: string): HostToEditorMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || typeof value.type !== 'string') return null;
    if (!HOST_TO_EDITOR_TYPES.has(value.type)) return null;
    return value as HostToEditorMessage;
  } catch {
    return null;
  }
}

export function parseEditorToHostMessage(raw: string): EditorToHostMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || typeof value.type !== 'string') return null;
    if (!EDITOR_TO_HOST_TYPES.has(value.type)) return null;
    return value as EditorToHostMessage;
  } catch {
    return null;
  }
}

export function serializeMessage(message: HostToEditorMessage | EditorToHostMessage): string {
  return JSON.stringify(message);
}
