import {
  parseHostToEditorMessage,
  serializeMessage,
  type EditorToHostMessage,
  type HostToEditorMessage,
} from '@toolsmith/shared';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage(data: string): void;
    };
    __toolsmithReceive?: (raw: string) => void;
    __toolsmithOutbox?: string[];
  }
}

export function postToHost(message: EditorToHostMessage): void {
  const payload = serializeMessage(message);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(payload);
    return;
  }

  // Browser development fallback.
  window.__toolsmithOutbox = window.__toolsmithOutbox ?? [];
  window.__toolsmithOutbox.push(payload);
  console.debug('[toolsmith] outbound', message);
}

export function subscribeToHost(handler: (message: HostToEditorMessage) => void): () => void {
  window.__toolsmithReceive = (raw: string) => {
    const message = parseHostToEditorMessage(raw);
    if (message) handler(message);
  };

  return () => {
    delete window.__toolsmithReceive;
  };
}
