import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import type { DocumentRecord } from '@toolsmith/shared';
import { useDocumentStore } from '../src/stores/useDocumentStore';
import { importMarkdownDocument } from '../src/features/importDocument';
import { colors } from '../src/theme/tokens';
import { formatDate } from '../src/utils/format';

export default function LibraryScreen() {
  const documents = useDocumentStore((state) => state.documents);
  const loading = useDocumentStore((state) => state.loading);
  const error = useDocumentStore((state) => state.error);
  const load = useDocumentStore((state) => state.load);
  const create = useDocumentStore((state) => state.create);
  const remove = useDocumentStore((state) => state.remove);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openDocument = (id: string) => {
    router.push({ pathname: '/editor/[id]', params: { id } });
  };

  const createDocument = async () => {
    try {
      const document = await create('');
      openDocument(document.id);
    } catch (cause) {
      Alert.alert(
        '文書を作成できませんでした',
        cause instanceof Error ? cause.message : '不明なエラーが発生しました。',
      );
    }
  };

  const importDocument = async () => {
    try {
      const document = await importMarkdownDocument();
      if (!document) return;
      await load();
      openDocument(document.id);
    } catch (cause) {
      Alert.alert(
        '読み込めませんでした',
        cause instanceof Error ? cause.message : '不明なエラーが発生しました。',
      );
    }
  };

  const confirmDelete = (document: DocumentRecord) => {
    Alert.alert(
      `「${document.title}」を削除しますか？`,
      'この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            void remove(document.id);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: DocumentRecord }) => (
    <Pressable
      onPress={() => openDocument(item.id)}
      onLongPress={() => confirmDelete(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}を開く`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {formatDate(item.updatedAt)} · {item.wordCount.toLocaleString('ja-JP')}語
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>LOCAL-FIRST WORKSPACE</Text>
          <Text style={styles.title}>TOOLSMITH{'\n'}EDITOR</Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="設定を開く"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Text style={styles.iconGlyph}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={createDocument}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonLabel}>＋ 新しい文書</Text>
        </Pressable>
        <Pressable
          onPress={importDocument}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonLabel}>インポート</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.mutedText}>文書を読み込んでいます…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>再試行</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.mutedText}>文書がありません。</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Text style={styles.footer}>
        文書はこの端末内のSQLiteに保存されます。長押しで削除できます。
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primaryBorder,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  title: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
    lineHeight: 30,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
  },
  iconGlyph: {
    color: colors.primary,
    fontSize: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  primaryButtonLabel: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  secondaryButtonLabel: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primaryBorder,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  chevron: {
    color: colors.primary,
    fontSize: 26,
    lineHeight: 26,
  },
  separator: {
    height: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    color: colors.textFaint,
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 14,
  },
});
