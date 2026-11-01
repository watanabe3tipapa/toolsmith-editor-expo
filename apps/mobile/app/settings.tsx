import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { APP_NAME } from '@toolsmith/shared';
import { getStorageSummary } from '../src/db/database';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { colors } from '../src/theme/tokens';
import { formatBytes } from '../src/utils/format';

const DELAY_OPTIONS = [400, 800, 1500, 2500];
const APP_VERSION = Constants.expoConfig?.version ?? '0.1.0';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);
  const loaded = useSettingsStore((state) => state.loaded);
  const load = useSettingsStore((state) => state.load);
  const patch = useSettingsStore((state) => state.patch);

  const [storage, setStorage] = useState<{ documents: number; bytes: number } | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [load, loaded]);

  useEffect(() => {
    void getStorageSummary().then(setStorage).catch(() => setStorage(null));
  }, [settings]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>設定</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>エディタ</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>ソースプレビュー</Text>
              <Text style={styles.rowHint}>MarkdownとABC楽譜をエディタ下部に表示します</Text>
            </View>
            <Switch
              value={settings.previewVisible}
              onValueChange={(value) => void patch({ previewVisible: value })}
              trackColor={{ false: colors.surfaceElevated, true: colors.primaryBorder }}
              thumbColor={settings.previewVisible ? colors.primary : colors.textFaint}
            />
          </View>

          <Text style={styles.rowLabel}>自動保存の待ち時間</Text>
          <View style={styles.chipRow}>
            {DELAY_OPTIONS.map((delay) => {
              const active = settings.autoSaveDelayMs === delay;
              return (
                <Pressable
                  key={delay}
                  onPress={() => void patch({ autoSaveDelayMs: delay })}
                  style={({ pressed }) => [
                    styles.chip,
                    active && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {delay}ms
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>テーマ</Text>
              <Text style={styles.rowHint}>cosmic（Sci-Fi）固定</Text>
            </View>
            <Text style={styles.valueText}>{settings.theme}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ストレージ</Text>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>文書数</Text>
            </View>
            <Text style={styles.valueText}>{storage?.documents ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>データベースサイズ</Text>
            </View>
            <Text style={styles.valueText}>
              {storage ? formatBytes(storage.bytes) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>バージョン</Text>
            <Text style={styles.valueText}>{APP_VERSION}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>アプリ名</Text>
            <Text style={styles.valueText}>{APP_NAME}</Text>
          </View>
          <Text style={styles.note}>
            文書はこの端末内のSQLiteにのみ保存されます。アプリを削除するとデータも失われるため、
            必要な文書はメニューの「書き出し」からバックアップしてください。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
  },
  rowHint: {
    color: colors.textFaint,
    fontSize: 11,
    lineHeight: 16,
  },
  valueText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chipLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  note: {
    color: colors.textFaint,
    fontSize: 11,
    lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  pressed: {
    opacity: 0.65,
  },
});
