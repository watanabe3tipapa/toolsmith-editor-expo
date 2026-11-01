import { useCallback, useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';
import type { EditorToHostMessage, ThemeName } from '@toolsmith/shared';
import { editorHtml } from '../generated/editorHtml';
import { useEditorBridge } from '../bridge/useEditorBridge';
import { WebView } from './webview';

type WebEditorProps = {
  documentId: string;
  markdown: string;
  previewVisible: boolean;
  theme: ThemeName;
  onMessage: (message: EditorToHostMessage) => void;
};

const LOCAL_ORIGIN = 'https://toolsmith.local/';

export function WebEditor({
  documentId,
  markdown,
  previewVisible,
  theme,
  onMessage,
}: WebEditorProps) {
  const initializedRef = useRef(false);
  const lastDocumentIdRef = useRef<string | null>(null);

  const { webViewRef, ready, send, handleMessage, handleLoadStart } =
    useEditorBridge(onMessage);

  useEffect(() => {
    if (!ready || initializedRef.current) return;
    initializedRef.current = true;
    lastDocumentIdRef.current = documentId;
    send({
      type: 'INIT',
      documentId,
      markdown,
      previewVisible,
      theme,
    });
  }, [documentId, markdown, previewVisible, ready, send, theme]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (lastDocumentIdRef.current === documentId) return;
    lastDocumentIdRef.current = documentId;
    send({ type: 'LOAD_DOCUMENT', documentId, markdown });
  }, [documentId, markdown, send]);

  useEffect(() => {
    if (!initializedRef.current) return;
    send({ type: 'SET_PREVIEW_VISIBLE', visible: previewVisible });
  }, [previewVisible, send]);

  useEffect(() => {
    if (!initializedRef.current) return;
    send({ type: 'SET_THEME', theme });
  }, [send, theme]);

  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    const url = request.url;
    if (
      url === 'about:blank' ||
      url.startsWith('about:') ||
      url.startsWith('data:') ||
      url.startsWith('file:') ||
      url.startsWith(LOCAL_ORIGIN)
    ) {
      return true;
    }
    if (/^https?:\/\//i.test(url)) {
      void Linking.openURL(url);
    }
    return false;
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: editorHtml, baseUrl: LOCAL_ORIGIN }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        keyboardDisplayRequiresUserAction={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        textZoom={100}
        mixedContentMode="never"
        allowsBackForwardNavigationGestures={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071526',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#071526',
  },
  webView: {
    flex: 1,
    backgroundColor: '#071526',
  },
});
