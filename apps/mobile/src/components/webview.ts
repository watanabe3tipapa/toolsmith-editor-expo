import type { ComponentType, Ref } from 'react';
import {
  WebView as RawWebView,
  type WebViewProps,
} from 'react-native-webview';

/**
 * react-native-webview 14's root type declaration exposes a generic class whose
 * default type parameter makes JSX props resolve to `never` with React 19 types.
 * The runtime component is fine, so wrap it with the exported props type.
 */
export type WebViewHandle = {
  injectJavaScript(script: string): void;
};

type TypedWebViewProps = WebViewProps & {
  ref?: Ref<WebViewHandle>;
};

export const WebView = RawWebView as unknown as ComponentType<TypedWebViewProps>;
