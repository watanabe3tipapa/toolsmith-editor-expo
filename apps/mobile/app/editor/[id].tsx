import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  countWords,
  extractTitle,
  type DocumentRecord,
  type EditorToHostMessage,
  type ExportFormat,
  type SaveStatus,
} from '@toolsmith/shared';
import { WebEditor } from '../../src/components/WebEditor';
import { getDocument, saveDocument } from '../../src/db/database';
import { shareDocument } from '../../src/features/shareDocument';
import { useDocumentStore } from '../../src/stores/useDocumentStore';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { colors } from '../../src/theme/tokens';
import { statusLabel } from '../../src/utils/format';

const EXPORT_FORMATS: Array<{ format: ExportFormat; label: string }> = [
  { format: 'md', label: 'Markdown' },
  { format: 'html', label: 'HTML' },
  { format: 'json', label: 'JSON' },
  { format: 'qmd', label: 'Quarto' },
  { format: 'txt', label: 'Plain Text' },
];

export default function EditorScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const settings = useSettingsStore((state) => state.settings);
  const patchSettings = useSettingsStore((state) => state.patch);
  const upsertDocument = useDocumentStore((state) => state.upsert);

  const documentRef = useRef<DocumentRecord | null>(null);
  const markdownRef = useRef('');
  const lastSavedRef = useRef('');
  const statusRef = useRef<SaveStatus>('saved');
  const savingRef = useRef(false);
  const pendingSaveRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveNowRef = useRef<(content?: string) => Promise<void>>(async () => {});

  const applyStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    setPreviewVisible(settings.previewVisible);
  }, [settings.previewVisible]);

  useEffect(() => {
    let cancelled = false;
    if (!documentId) return;

    void (async () => {
      try {
        const record = await getDocument(documentId);
        if (cancelled) return;
        if (!record) {
          Alert.alert('文書が見つかりません', '削除された可能性があります。');
          router.back();
          return;
        }
        documentRef.current = record;
        markdownRef.current = record.content;
        lastSavedRef.current = record.content;
        setDocument(record);
        setMarkdown(record.content);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        Alert.alert(
          '文書を読み込めませんでした',
          error instanceof Error ? error.message : '不明なエラーが発生しました。',
        );
        router.back();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, router]);

  const saveNow = useCallback(
    async (content?: string) => {
      const current = documentRef.current;
      if (!current) return;

      const value = content ?? markdownRef.current;
      if (savingRef.current) {
        pendingSaveRef.current = value;
        return;
      }
      if (value === lastSavedRef.current && statusRef.current === 'saved') {
        return;
      }

      savingRef.current = true;
      applyStatus('saving');

      const next: DocumentRecord = {
        ...current,
        title: extractTitle(value),
        content: value,
        updatedAt: Date.now(),
        wordCount: countWords(value),
      };

      try {
        await saveDocument(next);
        lastSavedRef.current = value;
        documentRef.current = next;
        setDocument(next);
        upsertDocument(next);
        const stillDirty = markdownRef.current !== value;
        applyStatus(stillDirty ? 'unsaved' : 'saved');
      } catch (error) {
        applyStatus('error');
        console.error('Failed to save document', error);
      } finally {
        savingRef.current = false;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (pending !== null && pending !== lastSavedRef.current) {
          void saveNowRef.current(pending);
        }
      }
    },
    [applyStatus, upsertDocument],
  );

  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);

  const scheduleSave = useCallback(
    (value: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void saveNowRef.current(value);
      }, settings.autoSaveDelayMs);
    },
    [settings.autoSaveDelayMs],
  );

  const exportDocument = useCallback(async (format: ExportFormat, content: string) => {
    try {
      await shareDocument(content, documentRef.current?.title ?? 'document', format);
    } catch (error) {
      Alert.alert(
        '書き出せませんでした',
        error instanceof Error ? error.message : '不明なエラーが発生しました。',
      );
    }
  }, []);

  const handleEditorMessage = useCallback(
    (message: EditorToHostMessage) => {
      switch (message.type) {
        case 'CONTENT_CHANGED': {
          markdownRef.current = message.markdown;
          setMarkdown(message.markdown);
          applyStatus('unsaved');
          scheduleSave(message.markdown);
          break;
        }
        case 'SAVE_REQUEST': {
          markdownRef.current = message.markdown;
          setMarkdown(message.markdown);
          void saveNowRef.current(message.markdown);
          break;
        }
        case 'EXPORT_REQUEST': {
          setMenuVisible(false);
          void exportDocument(message.format, message.markdown);
          break;
        }
        case 'OPEN_LINK': {
          void Linking.openURL(message.url);
          break;
        }
        case 'ERROR': {
          Alert.alert('エディタエラー', message.message);
          break;
        }
        default:
          break;
      }
    },
    [applyStatus, exportDocument, scheduleSave],
  );

  const goBack = useCallback(async () => {
    await saveNowRef.current();
    router.back();
  }, [router]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void saveNowRef.current();
      }
    });

    return () => {
      subscription.remove();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void saveNowRef.current();
    };
  }, []);

  const togglePreview = async (value: boolean) => {
    setPreviewVisible(value);
    await patchSettings({ previewVisible: value });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="文書一覧へ戻る"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.documentTitle} numberOfLines={1}>
            {document?.title ?? '読み込み中…'}
          </Text>
          <Text style={[styles.statusText, statusColor(status)]}>{statusLabel(status)}</Text>
        </View>

        <Pressable
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="メニューを開く"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.menuGlyph}>⋯</Text>
        </Pressable>
      </View>

      {loading || !document ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>文書を読み込んでいます…</Text>
        </View>
      ) : (
        <WebEditor
          documentId={document.id}
          markdown={markdown}
          previewVisible={previewVisible}
          theme={settings.theme}
          onMessage={handleEditorMessage}
        />
      )}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetEyebrow}>DOCUMENT</Text>
            <Text style={styles.sheetTitle}>メニュー</Text>

            <Text style={styles.sheetSection}>書き出し</Text>
            <View style={styles.exportGrid}>
              {EXPORT_FORMATS.map((item) => (
                <Pressable
                  key={item.format}
                  onPress={() => {
                    setMenuVisible(false);
                    void exportDocument(item.format, markdownRef.current);
                  }}
                  style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
                >
                  <Text style={styles.exportButtonLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>ソースプレビュー</Text>
                <Text style={styles.toggleHint}>MarkdownとABC楽譜を表示します</Text>
              </View>
              <Switch
                value={previewVisible}
                onValueChange={(value) => void togglePreview(value)}
                trackColor={{ false: colors.surfaceElevated, true: colors.primaryBorder }}
                thumbColor={previewVisible ? colors.primary : colors.textFaint}
              />
            </View>

            <Pressable
              onPress={() => {
                setMenuVisible(false);
                router.push('/settings');
              }}
              style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            >
              <Text style={styles.menuRowLabel}>設定</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable
              onPress={() => setMenuVisible(false)}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonLabel}>閉じる</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function statusColor(status: SaveStatus) {
  switch (status) {
    case 'saving':
      return { color: colors.primary };
    case 'unsaved':
      return { color: colors.warning };
    case 'error':
      return { color: colors.danger };
    default:
      return { color: colors.success };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primaryBorder,
    backgroundColor: colors.background,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  backGlyph: {
    color: colors.primary,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -4,
  },
  menuGlyph: {
    color: colors.primary,
    fontSize: 26,
    lineHeight: 26,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  documentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: '90%',
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.65,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    gap: 12,
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 2,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -6,
  },
  sheetSection: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 6,
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exportButton: {
    width: '31%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  exportButtonLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
  },
  toggleHint: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  menuRowLabel: {
    color: colors.text,
    fontSize: 14,
  },
  chevron: {
    color: colors.primary,
    fontSize: 22,
  },
  closeButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonLabel: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
