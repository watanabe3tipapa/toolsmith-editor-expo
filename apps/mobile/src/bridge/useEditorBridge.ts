import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebViewMessageEvent } from 'react-native-webview';
import type { WebViewHandle } from '../components/webview';
import {
  parseEditorToHostMessage,
  serializeMessage,
  type EditorToHostMessage,
  type HostToEditorMessage,
} from '@toolsmith/shared';

type UseEditorBridgeResult = {
  webViewRef: React.RefObject<WebViewHandle | null>;
  ready: boolean;
  send: (message: HostToEditorMessage) => void;
  handleMessage: (event: WebViewMessageEvent) => void;
  handleLoadStart: () => void;
};

export function useEditorBridge(
  onMessage: (message: EditorToHostMessage) => void,
): UseEditorBridgeResult {
  const webViewRef = useRef<WebViewHandle | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  const inject = useCallback((payload: string) => {
    const script = `window.__toolsmithReceive && window.__toolsmithReceive(${JSON.stringify(payload)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const send = useCallback(
    (message: HostToEditorMessage) => {
      const payload = serializeMessage(message);
      if (!readyRef.current) {
        queueRef.current.push(payload);
        return;
      }
      inject(payload);
    },
    [inject],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorToHostMessage(event.nativeEvent.data);
      if (!message) return;

      if (message.type === 'READY') {
        readyRef.current = true;
        setReady(true);
        const pending = queueRef.current;
        queueRef.current = [];
        pending.forEach(inject);
      }

      handlerRef.current(message);
    },
    [inject],
  );

  const handleLoadStart = useCallback(() => {
    readyRef.current = false;
    setReady(false);
    queueRef.current = [];
  }, []);

  return { webViewRef, ready, send, handleMessage, handleLoadStart };
}
