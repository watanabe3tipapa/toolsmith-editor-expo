import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type EditorState,
  type LexicalEditor,
} from 'lexical';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  BRIDGE_DEBOUNCE_MS,
  countWords,
  type EditorToHostMessage,
  type ExportFormat,
  type HostToEditorMessage,
  type ThemeName,
} from '@toolsmith/shared';
import { postToHost, subscribeToHost } from './bridge';
import { applyTheme } from './theme';
import { TRANSFORMERS_WITH_TABLE } from './lib/markdown';
import MarkdownPreview from './components/MarkdownPreview';
import Toolbar from './components/Toolbar';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: { listitem: 'editor-nested-listitem' },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    checklist: 'editor-checklist',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
    subscript: 'editor-text-subscript',
    superscript: 'editor-text-superscript',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenConstant',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenConstant',
    decorator: 'editor-tokenFunction',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    keyword: 'editor-tokenAtrule',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenConstant',
    operator: 'editor-tokenOperator',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenConstant',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

const editorConfig = {
  namespace: 'ToolsmithEditor',
  theme,
  onError(error: Error) {
    console.error('TOOLSMITH EDITOR: Lexical error', error);
    postToHost({ type: 'ERROR', message: error.message });
  },
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    LinkNode,
    TableNode,
    TableCellNode,
    TableRowNode,
  ],
};

function InitialMarkdownPlugin({ markdown }: { markdown: string }) {
  const [editor] = useLexicalComposerContext();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    editor.update(
      () => {
        $convertFromMarkdownString(markdown, TRANSFORMERS_WITH_TABLE);
      },
      { tag: 'initial-load' },
    );
  }, [editor, markdown]);

  return null;
}

function EditorSetupPlugin({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onReady(editor);
  }, [editor, onReady]);

  return null;
}

export default function EditorApp() {
  const [documentId, setDocumentId] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [initialMarkdown, setInitialMarkdown] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [themeName, setThemeName] = useState<ThemeName>('cosmic');
  const [editor, setEditor] = useState<LexicalEditor | null>(null);

  const documentIdRef = useRef('');
  const markdownRef = useRef('');
  const editorRef = useRef<LexicalEditor | null>(null);
  const contentTimerRef = useRef<number | null>(null);
  const readySentRef = useRef(false);

  const deferredMarkdown = useDeferredValue(markdown);
  const stats = useMemo(
    () => ({ charCount: markdown.length, wordCount: countWords(markdown) }),
    [markdown],
  );

  const emitCurrentMarkdown = useCallback((type: 'CONTENT_CHANGED' | 'SAVE_REQUEST') => {
    const currentDocumentId = documentIdRef.current;
    if (!currentDocumentId) return;
    const currentMarkdown = markdownRef.current;
    postToHost({
      type,
      documentId: currentDocumentId,
      markdown: currentMarkdown,
      charCount: currentMarkdown.length,
      wordCount: countWords(currentMarkdown),
    } satisfies EditorToHostMessage);
  }, []);

  const flushPendingSave = useCallback(() => {
    if (contentTimerRef.current !== null) {
      window.clearTimeout(contentTimerRef.current);
      contentTimerRef.current = null;
    }
    emitCurrentMarkdown('SAVE_REQUEST');
  }, [emitCurrentMarkdown]);

  const scheduleContentChanged = useCallback(() => {
    if (contentTimerRef.current !== null) {
      window.clearTimeout(contentTimerRef.current);
    }
    contentTimerRef.current = window.setTimeout(() => {
      contentTimerRef.current = null;
      emitCurrentMarkdown('CONTENT_CHANGED');
    }, BRIDGE_DEBOUNCE_MS);
  }, [emitCurrentMarkdown]);

  const onChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const nextMarkdown = $convertToMarkdownString(TRANSFORMERS_WITH_TABLE);
        if (nextMarkdown === markdownRef.current) return;
        markdownRef.current = nextMarkdown;
        setMarkdown(nextMarkdown);
        scheduleContentChanged();
      });
    },
    [scheduleContentChanged],
  );

  const handleExport = useCallback((format: ExportFormat) => {
    postToHost({
      type: 'EXPORT_REQUEST',
      format,
      markdown: markdownRef.current,
    });
  }, []);

  const insertText = useCallback((text: string) => {
    const instance = editorRef.current;
    if (!instance) return;
    instance.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(text);
        return;
      }
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().append(paragraph);
    });
  }, []);

  const handleHostMessage = useCallback(
    (message: HostToEditorMessage) => {
      switch (message.type) {
        case 'INIT': {
          documentIdRef.current = message.documentId;
          markdownRef.current = message.markdown;
          setDocumentId(message.documentId);
          setMarkdown(message.markdown);
          setInitialMarkdown(message.markdown);
          setEditorKey((key) => key + 1);
          if (typeof message.previewVisible === 'boolean') {
            setPreviewVisible(message.previewVisible);
          }
          if (message.theme) {
            setThemeName(message.theme);
            applyTheme(message.theme);
          }
          break;
        }
        case 'LOAD_DOCUMENT': {
          flushPendingSave();
          documentIdRef.current = message.documentId;
          markdownRef.current = message.markdown;
          setDocumentId(message.documentId);
          setMarkdown(message.markdown);
          setInitialMarkdown(message.markdown);
          setEditorKey((key) => key + 1);
          break;
        }
        case 'REQUEST_MARKDOWN': {
          postToHost({
            type: 'MARKDOWN_RESULT',
            requestId: message.requestId,
            documentId: documentIdRef.current,
            markdown: markdownRef.current,
          });
          break;
        }
        case 'INSERT_TEXT': {
          insertText(message.text);
          break;
        }
        case 'SET_PREVIEW_VISIBLE': {
          setPreviewVisible(message.visible);
          break;
        }
        case 'SET_THEME': {
          setThemeName(message.theme);
          applyTheme(message.theme);
          break;
        }
        case 'FOCUS_EDITOR': {
          editorRef.current?.focus();
          break;
        }
        default:
          break;
      }
    },
    [flushPendingSave, insertText],
  );

  const hostHandlerRef = useRef(handleHostMessage);
  useEffect(() => {
    hostHandlerRef.current = handleHostMessage;
  }, [handleHostMessage]);

  useEffect(() => {
    const unsubscribe = subscribeToHost((message) => hostHandlerRef.current(message));

    const handleBeforeUnload = () => flushPendingSave();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);

    if (!readySentRef.current) {
      readySentRef.current = true;
      postToHost({ type: 'READY' });
    }

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushPendingSave]);

  useEffect(() => {
    applyTheme(themeName);
  }, [themeName]);

  return (
    <div className="toolsmith-shell" data-document-id={documentId}>
      <LexicalComposer key={editorKey} initialConfig={editorConfig}>
        <div className="editor-frame">
          <Toolbar
            editor={editor}
            onExport={handleExport}
            onSaveRequest={() => {
              flushPendingSave();
              editorRef.current?.focus();
            }}
          />
          <div className="editor-scroll">
            <div className="editor-body">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="editor-input"
                    role="textbox"
                    ariaLabel="リッチテキストエディタ"
                    ariaMultiline
                  />
                }
                placeholder={
                  <div className="editor-placeholder">書き始める…</div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS_WITH_TABLE} />
              <ListPlugin />
              <CheckListPlugin />
              <LinkPlugin />
              <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
              <OnChangePlugin onChange={onChange} ignoreSelectionChange />
              <InitialMarkdownPlugin markdown={initialMarkdown} />
              <EditorSetupPlugin
                onReady={(instance) => {
                  editorRef.current = instance;
                  setEditor(instance);
                }}
              />
            </div>
            <MarkdownPreview markdown={deferredMarkdown} visible={previewVisible} />
            <div className="editor-stats" aria-live="polite">
              <span>{stats.charCount.toLocaleString('ja-JP')}文字</span>
              <span>{stats.wordCount.toLocaleString('ja-JP')}語</span>
            </div>
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
