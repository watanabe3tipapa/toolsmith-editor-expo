import { describe, expect, it } from 'vitest';
import type { EditorToHostMessage, HostToEditorMessage } from '../bridge';
import {
  parseEditorToHostMessage,
  parseHostToEditorMessage,
  serializeMessage,
} from '../bridge';

describe('parseEditorToHostMessage', () => {
  it('parses a CONTENT_CHANGED message', () => {
    const message: EditorToHostMessage = {
      type: 'CONTENT_CHANGED',
      documentId: 'doc-1',
      markdown: '# Hello',
      charCount: 7,
      wordCount: 2,
    };

    expect(parseEditorToHostMessage(serializeMessage(message))).toEqual(message);
  });

  it('parses a READY message without a payload', () => {
    expect(parseEditorToHostMessage('{"type":"READY"}')).toEqual({ type: 'READY' });
  });

  it('rejects malformed JSON', () => {
    expect(parseEditorToHostMessage('not json')).toBeNull();
  });

  it('rejects non-object JSON values', () => {
    expect(parseEditorToHostMessage('null')).toBeNull();
    expect(parseEditorToHostMessage('"READY"')).toBeNull();
  });

  it('rejects unknown message types', () => {
    expect(parseEditorToHostMessage('{"type":"UNKNOWN"}')).toBeNull();
  });

  it('rejects host-to-editor message types', () => {
    expect(parseEditorToHostMessage('{"type":"INIT"}')).toBeNull();
  });
});

describe('parseHostToEditorMessage', () => {
  it('parses an INIT message', () => {
    const message: HostToEditorMessage = {
      type: 'INIT',
      documentId: 'doc-1',
      markdown: '# Hello',
      previewVisible: false,
      theme: 'cosmic',
    };

    expect(parseHostToEditorMessage(serializeMessage(message))).toEqual(message);
  });

  it('rejects editor-to-host message types', () => {
    expect(parseHostToEditorMessage('{"type":"READY"}')).toBeNull();
  });

  it('rejects invalid payloads', () => {
    expect(parseHostToEditorMessage('')).toBeNull();
    expect(parseHostToEditorMessage('[]')).toBeNull();
    expect(parseHostToEditorMessage('{"type":42}')).toBeNull();
  });
});
