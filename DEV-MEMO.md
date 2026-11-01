# DEV-MEMO — TOOLSMITH EDITOR Expo版

- 作成日: 2026-11-01
- 状態: Phase 0 実装済み / 実機検証待ち
- 対象: iOS / Android（Expo + React Native）
- **Ollama連携は対象外**（ユーザー判断）
- 参照元:
  - Web版: `/Users/watanabe3tipapa/github/toolsmith-editor`（v0.6.2）
  - Desktop版: `/Users/watanabe3tipapa/github/toolsmith-editor-desktop`（v0.1.1）

---

## 0. 結論

### 実装可能性: **可能（条件付き）**

既存のLexicalエディタをWebView内でほぼそのまま動かし、React Native側で文書管理・永続化・書き出し・共有を担う構成で実装できる。エディタ本体を作り直す必要はない。

ただし、以下4点はPhase 0で実機検証し、成立しなければ方針を変える。

| # | 検証項目 | 合格条件（案） | 失敗時の代替 |
|---|---|---|---|
| G1 | ローカル同梱したWebViewコンテンツがiOS/Androidでオフライン起動する | 両OSで起動・編集・再起動後も動作 | HTML文字列を`source={{ html }}`で直接注入 |
| G2 | abcjsの楽譜描画と音声再生が実機で動く | iOS/Android実機で再生・停止・テンポ変更が可能 | abcjsでWAVを生成し`expo-audio`で再生 |
| G3 | 10万字文書で入力遅延が実用範囲内 | キー入力が引っかからず、保存が1秒以内 | プレビュー遅延更新・非表示、WebView分割 |
| G4 | ストア審査を通過できる「ネイティブ機能」がある | SQLite保存・共有・DocumentPicker・音声が動作 | ネイティブシェルを厚くする（後述） |

### 採用する移植元

**Web版 v0.6.2を主移植元**とし、Desktop版からはUI・設定・テーマ・競合対策の知見を選択的に取り込む。

理由:

- Web版は保存先がIndexedDBで、SQLiteへの置換が素直（`src/lib/storage.ts`）
- Desktop版の「ユーザーが選んだ任意フォルダを直接編集」は、iOS/Androidのサンドボックス制約により**完全再現できない**
- Desktop版のQuarto CLIレンダリングはモバイルでは実行できない
- エディタ本体（Lexical 0.32 + 変換ロジック）は両者ほぼ同一で、Web版の方が構成が小さい

### やらないこと（スコープ外）

- Ollama連携
- Quarto CLIによるHTML/PDFレンダリング（`.qmd`書き出しのみ）
- Desktop版の任意フォルダ監視・外部変更競合検知（単一アプリDBのため不要）
- Webクリップ（`@mozilla/readability` + Turndown）は初期スコープ外。需要があればv1.1以降
- PWAのIndexedDBデータ自動移行（ブラウザ領域へネイティブからアクセス不可。エクスポート/インポートで対応）

---

## 1. 参照元の事実確認

### 1.1 Web版（v0.6.2）

**スタック**

- React 18 / Vite 7 / Tailwind CSS v4
- Lexical 0.32.1（`@lexical/*` 一式）
- abcjs 6.7.0
- lucide-react / cosmic-ui
- 永続化: IndexedDB（`toolsmith-db` / `documents`）

**主要ファイル**

| ファイル | 行数 | 役割 |
|---|---:|---|
| `src/components/Editor.tsx` | 408 | Lexical構成、文書CRUD、自動保存、Markdown同期 |
| `src/components/Toolbar.tsx` | 296 | 書式・見出し・リスト・リンク・表・書き出し |
| `src/components/MarkdownPreview.tsx` | 41 | Markdownソース表示 + ABCブロック抽出 |
| `src/components/AbcSheet.tsx` | 147 | abcjs描画・再生・テンポ |
| `src/components/DocumentSidebar.tsx` | 86 | 文書一覧 |
| `src/lib/storage.ts` | 144 | IndexedDB CRUD・タイトル抽出 |
| `src/lib/export.ts` | 57 | 5形式の変換・ダウンロード |
| `src/lib/table.ts` | 111 | GFMテーブル ↔ Lexical TableNode |
| `src/lib/constants.ts` | 47 | 既定文書（ABCサンプル含む） |

**エディタ構成**（`Editor.tsx:103-120`）

- ノード: `HeadingNode`, `ListNode`, `ListItemNode`, `QuoteNode`, `CodeNode`, `LinkNode`, `TableNode`, `TableCellNode`, `TableRowNode`
- プラグイン: RichText / History / MarkdownShortcut / List / CheckList / Link / Table / OnChange（`Editor.tsx:358-371`）
- Markdown変換: `$convertFromMarkdownString` / `$convertToMarkdownString` + `TRANSFORMERS_WITH_TABLE`（`Editor.tsx:124-137`, `297-310`）

**自動保存**（`Editor.tsx:219-223`）

- `hasChanges` から **800msデバウンス**で `saveNow()`
- `saveNow()` は文書全量をIndexedDBへ`put`（`Editor.tsx:188-217`）

**データモデル**（`storage.ts:7-13`）

```ts
type DocumentRecord = {
  id: string;
  title: string;
  content: string;   // Markdown
  createdAt: number;
  updatedAt: number;
};
```

- タイトルは本文の `^# ` 見出しから抽出。なければ先頭40文字（`storage.ts:15-21`）
- IDは `crypto.randomUUID()`、フォールバックあり（`storage.ts:23-28`）
- 初回起動時に既定文書を作成（`storage.ts:125-145`）

**書き出し**（`export.ts:9-58`）

| 形式 | 実装 | 備考 |
|---|---|---|
| Markdown | 本文そのまま | |
| HTML | 正規表現で見出し・強調・コードのみ変換 | 表・コードフェンス・リストは未対応。**既知の技術的負債** |
| JSON | `{content, createdAt, format, editor}` | |
| Quarto | YAMLフロントマター + 本文 | タイトル固定 |
| Plain Text | 本文そのまま | |

**MUSIC-ABC**

- 対象フェンス: `abc` / `music-abc` のコードフェンス（`MarkdownPreview.tsx:8-17`）
- `abcjs` を動的importし、`renderAbc` + `SynthController` で描画・再生（`AbcSheet.tsx:40-87`）
- テンポはQPMスライダーで `setWarp`（`AbcSheet.tsx:97-106`）
- 音声はWeb Audio API（abcjs内蔵シンセ）

**モバイル移植上の注意点（調査で判明）**

- `onChange` のたびに `setMarkdown` し、`MarkdownPreview` が全文 `<pre>` を再描画する（`Editor.tsx:297-310`, `MarkdownPreview.tsx:31-33`）。10万字では重くなる可能性が高い
- Google Fonts（Orbitron / Roboto）を外部読み込みしている（`index.html`）。オフライン同梱時はセルフホストが必要
- Tailwind v4 の `color-mix(in oklab, ...)` を使用（`src/index.css`）。古いAndroid WebViewでは要確認

### 1.2 Desktop版（v0.1.1）

**スタック**

- tinyjs 0.60+（txiki.js + ネイティブWebView）
- React 18 / Vite / Tailwind CSS v4 / Lexical 0.32.1
- バックエンド: `src/backend/*.js`（ファイルI/O、監視、Quarto、設定）

**Web版との差分**

| 項目 | Web版 | Desktop版 | Expoでの扱い |
|---|---|---|---|
| 保存先 | IndexedDB | ユーザー選択フォルダの`.md` | **SQLite**（アプリ内） |
| 文書一覧 | DBレコード | フォルダ内ファイル | SQLiteレコード |
| 競合検知 | なし | mtime比較 + 再読込/上書き | 不要（単一ライター） |
| 自動保存 | 800ms固定 | 設定可能（`autoSaveDelayMs`） | 設定可能にする |
| 設定 | localStorage | `settings.json` | SQLite / kv-store |
| テーマ | cosmicのみ | cosmic / brutalist / cupertino | 初期はcosmic。テーマ抽象化は用意 |
| 書き出し | ブラウザDL | OS保存パネル | 共有シート / SAF |
| Quarto | `.qmd`のみ | CLIでHTML/PDF | `.qmd`のみ |
| Webクリップ | なし | Readability + Turndown | 初期スコープ外 |
| メニュー | なし | ネイティブメニュー | ネイティブUIで代替 |

**Desktop版から参考にする実装**

- 自動保存の直列化・保存中フラグ・保留保存（`Editor.tsx:326-380`）
- 保存状態 `saved / saving / unsaved / error / conflict` の明示（`Editor.tsx:146`）
- atomic write（temp → rename）（`backend/workspace.js:135-148`）
- 設定のバリデーション（`backend/settings.js`）
- テーマCSSの設計（cosmic は `src/frontend/index.css`、brutalist / cupertino は `src/frontend/*-ui/theme.css`）
- Quarto書き出しのYAMLフロントマター生成（`backend/quarto.js`）

---

## 2. Expo実装アーキテクチャ

### 2.1 全体構成

```
┌──────────────────────────────────────────────────────┐
│ Expo Router (Native Shell)                           │
│  /              文書ライブラリ（FlatList / 検索）       │
│  /editor/[id]   エディタ画面                           │
│  /settings      設定                                  │
│  - 保存状態 / 戻る / メニュー / 共有                    │
├──────────────────────────────────────────────────────┤
│ react-native-webview                                 │
│  - 同梱した editor-web バンドル（Lexical + abcjs）      │
│  - 書式ツールバー / Markdownプレビュー / 楽譜           │
│  - window.ReactNativeWebView.postMessage で通知         │
├──────────────────────────────────────────────────────┤
│ Bridge Layer (src/bridge)                            │
│  - メッセージ型・バリデーション・キュー                  │
├──────────────────────────────────────────────────────┤
│ Domain / State (Zustand)                             │
│  - useDocumentStore / useSettingsStore（画面状態はローカル） │
├──────────────────────────────────────────────────────┤
│ Data Layer                                           │
│  - expo-sqlite: documents / app_settings / migrations │
│  - expo-file-system: 書き出し一時ファイル               │
│  - expo-sharing: 共有シート                            │
│  - expo-document-picker: Markdownインポート            │
└──────────────────────────────────────────────────────┘
```

**方針**: エディタ画面だけWebView。文書一覧・設定・保存状態・共有はネイティブ。全画面WebViewラッパーにはしない（ストア審査の「最小機能性」リスクとモバイルUXのため）。

### 2.2 リポジトリ構成（案）

```
toolsmith-editor-expo/
├─ apps/
│  └─ mobile/                  # Expoアプリ
│     ├─ app/                  # Expo Router
│     │  ├─ _layout.tsx
│     │  ├─ index.tsx          # ライブラリ
│     │  ├─ editor/[id].tsx
│     │  └─ settings.tsx
│     ├─ src/
│     │  ├─ bridge/            # RN <-> WebView
│     │  ├─ db/                # SQLite, migrations
│     │  ├─ stores/            # Zustand
│     │  ├─ features/          # documents, export, settings
│     │  └─ theme/
│     ├─ src/generated/        # editorHtml.ts（自動生成）
│     ├─ app.json
│     └─ metro.config.js
├─ packages/
│  ├─ editor-web/              # Vite + React + Lexical + abcjs
│  │  ├─ src/
│  │  ├─ index.html
│  │  └─ vite.config.ts
│  └─ shared/                  # 型・純粋関数・定数
│     ├─ src/bridge.ts
│     ├─ src/export.ts
│     ├─ src/title.ts
│     └─ src/constants.ts
├─ docs/                      # GitHub Pages 用 LP
├─ .github/workflows/pages.yml
├─ LICENSE
├─ DEV-MEMO.md
└─ README.md
```

- モノレポにする場合も、まずはnpm workspacesで十分（Turborepoは不要）
- リポジトリはgit管理済み（`main` ブランチへpushするとLPがデプロイされる）

### 2.3 editor-web バンドル

- Web版の `src/components/Editor.tsx` から**サイドバー・オンボーディング・IndexedDB保存を除去**した「エディタ専用エントリ」を作る
- 残すもの: Lexical、Toolbar、MarkdownPreview、AbcSheet、テーマCSS、表変換
- 保存・書き出し・文書切替はブリッジ経由でRNへ委譲
- Vite + `vite-plugin-singlefile` で **単一HTML** に出力（JS/CSSインライン）
- 出力先: `apps/mobile/src/generated/editorHtml.ts`（HTML文字列をTypeScript定数として生成）
- フォントはOrbitron/Robotoを参照し、未インストール時はシステムフォントへフォールバック
- abcjsは動的importをやめ、バンドルに含める（オフライン保証）。初期表示を軽くしたい場合は`React.lazy`ではなく、ABCブロックがある時だけ`import()`する手もあるが、ローカルバンドル内ならコード分割の意味は小さい

**読み込み方法**

```tsx
<WebView
  source={{ html: editorHtml, baseUrl: 'https://toolsmith.local/' }}
  originWhitelist={['*']}
  javaScriptEnabled
  domStorageEnabled
  mediaPlaybackRequiresUserAction={false}
  allowsInlineMediaPlayback
  onMessage={handleMessage}
  ref={webViewRef}
/>
```

- HTMLはアプリに同梱した文字列を `source={{ html }}` で直接注入する（`file://` は使わない）
- リモートURLは読み込まない。リンクタップは `onShouldStartLoadWithRequest` で止め、`Linking.openURL` へ

### 2.4 ブリッジプロトコル

`packages/shared/src/bridge.ts` に型を集約。

**RN → WebView**

| type | payload | 用途 |
|---|---|---|
| `INIT` | `{documentId, markdown, theme, previewVisible}` | 初期化 |
| `LOAD_DOCUMENT` | `{documentId, markdown}` | 文書切替（WebView再マウントでも可） |
| `REQUEST_MARKDOWN` | `{requestId}` | 現在のMarkdown取得 |
| `INSERT_TEXT` | `{text}` | テンプレート挿入 |
| `SET_PREVIEW_VISIBLE` | `{visible}` | プレビュー表示切替 |
| `SET_THEME` | `{theme}` | テーマ切替 |
| `FOCUS_EDITOR` | `{}` | フォーカス |

**WebView → RN**

| type | payload | 用途 |
|---|---|---|
| `READY` | `{}` | ハンドシェイク |
| `CONTENT_CHANGED` | `{documentId, markdown, charCount, wordCount}` | 編集通知（デバウンス） |
| `SAVE_REQUEST` | `{documentId, markdown, charCount, wordCount}` | 手動保存（⌘S相当） |
| `EXPORT_REQUEST` | `{format, markdown}` | 書き出し要求 |
| `OPEN_LINK` | `{url}` | 外部リンク |
| `ERROR` | `{message}` | エラー通知 |
| `MARKDOWN_RESULT` | `{requestId, documentId, markdown}` | `REQUEST_MARKDOWN` への応答 |

**実装ルール**

- WebView側は `window.ReactNativeWebView?.postMessage(JSON.stringify(msg))`
- RN側は `injectJavaScript('window.__toolsmithReceive(' + JSON.stringify(JSON.stringify(msg)) + '); true;')`
- `</script>` を含む文字列はエスケープ
- READY前にRNから送らない（RN側でキューイング）
- `CONTENT_CHANGED` はWebView側で **300msデバウンス**、RN側のSQLite保存はさらに **800msデバウンス**
- 文字数・語数はWebView側で計算して送る（RNで全文を数え直さない）
- メッセージは `type` ごとにランタイムバリデーション（zodは不要。手書きガードで十分）

### 2.5 SQLite設計

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  exported_at INTEGER,
  word_count  INTEGER NOT NULL DEFAULT 0,
  tags        TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auto_save_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL,
  saved_at    INTEGER NOT NULL,
  size_bytes  INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

- スキーマバージョンは `PRAGMA user_version` で管理（`app_settings`より単純）
- `content_json` は初期実装では持たない。Markdownを正とし、起動時にLexicalへ変換する（既存Web版と同じ）
- `expo-sqlite` の async API（`openDatabaseAsync` / `execAsync` / `runAsync` / `getAllAsync` / `getFirstAsync`）を使用
- 保存は直列キューで実行。`updated_at` は保存成功時に更新
- アプリのバックグラウンド移行時に `AppState` で即時flush
- タイトル抽出はWeb版 `extractTitle` を `packages/shared` へ移植して共用
- IDは `expo-crypto` の `randomUUID()`

**保存の状態**

`saved` / `saving` / `unsaved` / `error`

- UIにはヘッダーに「保存済み」「未保存」「保存中…」「保存エラー」を表示
- エラー時はヘッダーの表示のみ（自動保存の再試行は次回編集時）

### 2.6 書き出し・インポート

**書き出し**

1. RNが最新Markdownを保持（`CONTENT_CHANGED` または `REQUEST_MARKDOWN`）
2. `packages/shared/export.ts` で5形式へ変換
3. `expo-file-system` のキャッシュ領域へ一時ファイル書き込み
4. `Sharing.shareAsync(uri, { mimeType, dialogTitle })` で共有シート
5. iOSは「ファイルに保存」、Androidは共有先/SAFをユーザーが選択

- ファイル名: `sanitize(title) + '_' + YYYYMMDD_HHmmss + '.' + ext`
- Androidで直接SAF保存を提供する場合は `StorageAccessFramework` を追加（v1.1でも可）
- HTML変換はWeb版の実装をそのまま移植。**表・リスト・コードブロックが変換されない**ため、v1.0で簡易Markdownパーサ（`marked`等）へ置換するか要判断
- Quartoは `.qmd` のみ。CLIレンダリングは行わない

**インポート**

- `expo-document-picker` で `.md` / `.markdown` / `.txt` を選択
- `copyToCacheDirectory: true` → `expo-file-system` で読み込み → 新規文書として保存
- 同名文書は「新規作成」とし、上書きはしない
- JSONエクスポートの再インポート（`content` フィールド）にも対応するとバックアップとして有用

### 2.7 MUSIC-ABC

- 描画・再生とも **WebView内のabcjs** で完結させる（既存実装をそのまま利用）
- `MarkdownPreview` のABCフェンス抽出（`MarkdownPreview.tsx:8-17`）を維持
- iOSのWeb Audioはユーザー操作起点なら再生可能。`mediaPlaybackRequiresUserAction={false}` と `allowsInlineMediaPlayback` を設定
- マナーモード時の挙動、バックグラウンド移行時の停止は実機で確認
- 失敗時のフォールバック: `abcjs.synth.renderAbcToAudioBuffer` でAudioBufferを作り、WAVへエンコードして `expo-audio` で再生（実装コスト高。Phase 2の保険）

### 2.8 UI / UX

**画面**

1. **ライブラリ**: 文書一覧（更新日時降順）、新規作成、検索、削除、インポート
2. **エディタ**: 戻る、タイトル、保存状態、メニュー（書き出し・プレビュー切替・設定）、WebView
3. **設定**: テーマ、自動保存間隔、プレビュー初期表示、バージョン、ストレージ使用量、（将来）バックアップ

**モバイル最適化**

- ツールバーはWebView内に置く（既存UIを再利用）。ただし横スクロール可能にし、タッチ領域を44px以上へ
- `MarkdownPreview` は初期状態で**非表示**を推奨（画面が狭い・再描画コスト）。設定でON
- WebViewの`onChange`→`setMarkdown`は300msデバウンスし、プレビュー再描画を間引く
- キーボード: Androidは `android.softwareKeyboardLayoutMode: "resize"`、iOSは `KeyboardAvoidingView` + `keyboardVerticalOffset`。`react-native-keyboard-controller` の採用も検討
- セーフエリア: `react-native-safe-area-context`
- ダークテーマ固定（cosmic）。ライトテーマはv1.1以降
- アクセシビリティ: ネイティブ側に `accessibilityLabel`、WebView内は既存のariaを維持。Dynamic TypeはWebView内で追従しないため、設定で文字サイズを渡す案を検討

**テーマ**

- cosmicの主要色: primary `#14A0E6` / background は primaryを80%黒寄せ（概ね `#071526`）/ foreground `#FFFFFF`
- WebViewへはCSS変数 `--color-primary` 等を `injectJavaScript` で上書き、またはテーマクラスを付与
- ネイティブ側は同じ値を `src/theme/tokens.ts` に定義
- Desktop版のbrutalist / cupertinoは初期実装では移植しない（CSSは参考として保持）

### 2.9 状態管理

| ストア | 責務 | 永続化 |
|---|---|---|
| `useDocumentStore` | 文書一覧、作成、削除、更新の反映 | SQLite |
| `useSettingsStore` | テーマ、自動保存間隔、プレビュー初期値 | SQLite `app_settings` |

- Zustand 5系を使用
- エディタ画面のMarkdown・保存状態・文字数は `useState` / `useRef` で保持
- `persist` ミドルウェアは使わず、設定もSQLiteへ保存
- Ollama用ストアは作らない

### 2.10 依存パッケージ（Expo SDK 58時点）

2026-11-01時点のnpmレジストリ確認値。

| パッケージ | バージョン | 用途 |
|---|---:|---|
| expo | 58.0.22 | SDK |
| expo-router | 58.0.29 | ナビゲーション |
| react-native-webview | 14.0.1 | エディタ |
| expo-sqlite | 58.0.15 | 文書DB |
| expo-file-system | 58.0.13 | 書き出し |
| expo-sharing | 58.0.21 | 共有シート |
| expo-document-picker | 58.0.4 | インポート |
| expo-crypto | 58.0.7 | UUID |
| expo-asset | 58.0.19 | 同梱HTML |
| expo-audio | 58.0.11 | ABC音声フォールバック |
| expo-status-bar / expo-splash-screen | 58.x | 起動 |
| react-native-safe-area-context | 5.11.0 | セーフエリア |
| react-native-screens | 4.30.1 | Router |
| zustand | 5.0.16 | 状態管理 |

**使用しないもの**

- `expo-av`（非推奨。音声はWebView内abcjs、フォールバックは`expo-audio`）
- NativeWind（初期実装ではStyleSheet + デザイントークン。SDK 58 / RN 0.88との相性を検証してから判断）
- Ollama関連パッケージ
- `@10play/tentap-editor`（Lexical資産を活かせないため不要）

**開発環境**

- Expo SDK 58のテンプレートは React 19.3.0 / React Native 0.88.1（`expo-template-blank-typescript@58.0.31` で確認）
- 現在のNodeは v25.9.0。ExpoはLTS（22/24系）推奨のため、nvm等で切り替えるのが無難
- `npx create-expo-app@latest` で雛形生成後、`npx expo install` でバージョンをSDKに整合させる

---

## 3. 移植マッピング

| 既存機能 | 既存実装 | Expo実装 | 難易度 |
|---|---|---|---|
| リッチテキスト編集 | `Editor.tsx:103-120` | WebView内でそのまま | 低 |
| Markdown双方向変換 | `Editor.tsx:297-310` / `markdown.ts` | そのまま | 低 |
| 表変換 | `table.ts` | そのまま | 低 |
| 文書CRUD | `storage.ts` | `expo-sqlite` へ置換 | 低 |
| タイトル抽出 | `storage.ts:15-21` | sharedへ移植 | 低 |
| 自動保存 | `Editor.tsx:219-223` | RN側デバウンス + SQLite | 中 |
| 文書一覧 | `DocumentSidebar.tsx` | ネイティブFlatList | 中 |
| 書式ツールバー | `Toolbar.tsx` | WebView内で再利用 | 低 |
| Markdownプレビュー | `MarkdownPreview.tsx` | WebView内。モバイルでは初期非表示 | 低 |
| ABC描画・再生 | `AbcSheet.tsx` | WebView内abcjs | 中（実機音声検証） |
| 5形式書き出し | `export.ts` | shared + FileSystem + Sharing | 中 |
| インポート | なし | DocumentPicker | 低 |
| 設定 | localStorage / settings.json | SQLite | 低 |
| テーマ | cosmic | WebView CSS変数 + Native tokens | 中 |
| オンボーディング | `Editor.tsx:383-396` | ネイティブモーダル（任意） | 低 |
| キーボードショートカット | `Editor.tsx:225-234` | WebView内は維持。RN側は保存ボタン | 低 |
| 競合検知 | Desktop `Editor.tsx:769-790` | 不要 | — |
| Quarto CLI | `backend/quarto.js` | 対象外（.qmdのみ） | — |
| Webクリップ | `web-clip.ts` | 初期スコープ外 | — |
| Ollama | （元実装なし） | 対象外 | — |

---

## 4. 開発フェーズ（改訂案）

13週間案を、Ollama除外・WebView検証先行に合わせて調整。

### Phase 0 — 技術検証（2週間）

- npm workspaces + Expo SDK 58 + Expo Router 雛形
- Web版から `packages/editor-web` を抽出
- 単一HTMLビルド + WebView読み込み（iOS/Android実機）
- ブリッジ `INIT` / `READY` / `CONTENT_CHANGED` / `SAVE_REQUEST` のPoC
- SQLite CRUD + 自動保存のPoC
- **G1〜G4の判定**
- 10k / 50k / 100k文字の入力・保存ベンチマーク

**Phase 0の成果物**: 実機で「編集→自動保存→再起動→復元」が動く最小アプリ

### Phase 1 — MVP（3〜4週間）

- ライブラリ画面（一覧・新規・削除・タイトル）
- エディタ画面（WebView、保存状態、戻る）
- 自動保存（設定可能なデバウンス、バックグラウンドflush）
- 書き出し5形式 + 共有シート
- Markdownインポート
- 設定画面（テーマ、自動保存間隔、プレビュー）
- エラーハンドリング、空状態、ローディング

### Phase 2 — 機能拡張（2〜3週間）

- ABC描画・再生の実機調整（音声セッション、マナーモード）
- プレビュー切替、文字数・語数
- 検索・並び替え・タグ（SQLite）
- テーマ調整（cosmic完成、必要ならbrutalist）
- 書き出しHTMLの改善（`marked`等の導入判断）
- バックアップ（全文書ZIP/JSONエクスポート）

### Phase 3 — 品質向上（2週間）

- 大容量文書の性能改善
- キーボード・スクロール・セーフエリア
- アクセシビリティ
- オフライン完全動作
- クラッシュ・DB破損時の復旧（バックアップ/リストア）
- E2E（Maestro）: 起動→作成→編集→保存→書き出し

### Phase 4 — 配信準備（2週間）

- EAS Build / EAS Update設定
- アプリアイコン・スプラッシュ・スクリーンショット
- プライバシーポリシー（ローカル完結・収集なし）
- TestFlight / Google Play内部テスト
- ストア申請

**合計: 約11〜13週間**（1名フルタイム換算）

---

## 5. リスクと対策

### R1. WebViewエディタの性能（最重要）

- 現状のWeb版は1キーストロークごとに全文Markdownをstateへ反映し、プレビュー全文を再描画する
- 対策:
  - WebView内のプレビュー更新を300msデバウンス
  - モバイルではプレビュー初期非表示
  - `React.memo` / `useDeferredValue` の活用
  - 10万字超は「プレビュー無効」を自動提案
  - それでも重い場合: 編集画面を分割し、プレビューは別画面へ

### R2. iOS / AndroidのWebView差異

- WKWebViewとAndroid WebViewでCSS/JSの挙動差（`color-mix`、`Intl`、Web Audio）
- 対策: 両OS実機でPhase 0検証、Feature Detection、polyfill、最低OSバージョンの明示

### R3. ローカルHTMLの読み込み

- `file://` 制約、WKWebViewのread access、Androidの`allowFileAccess`
- 対策: 単一HTML化、`allowingReadAccessToURL`、失敗時は`source={{ html }}`。CDNは使わない

### R4. ABC音声

- iOSのサイレントスイッチ、Web Audioの自動再生制限、バックグラウンド遷移
- 対策: ユーザー操作起点で再生、`mediaPlaybackRequiresUserAction={false}`、実機検証。失敗時はWAV生成 + `expo-audio`

### R5. データ消失

- SQLiteはアプリ削除で消える。端末故障・OSのストレージ整理の影響も受ける
- 対策: 自動保存に加え、全文書バックアップ（JSON/ZIP）、iCloud/Googleドライブへの手動エクスポート導線、`documents` の`exported_at`記録

### R6. ストア審査（4.2 Minimum Functionality）

- WebViewラッパーと見なされるとリジェクトリスク
- 対策: ネイティブの文書管理・SQLite・共有・DocumentPicker・音声を実装し、WebViewはエディタ部分に限定。スクリーンショットでもネイティブUIを見せる

### R7. フォント・CSSのオフライン化

- Google Fonts外部読み込みはオフラインで失敗
- 対策: woff2を同梱。Tailwind v4のCSSをビルド時にインライン化

### R8. バージョンドリフト

- Lexical 0.32.1 / abcjs 6.7.0 は現行最新より古い可能性
- 対策: 初期移植では**あえて既存バージョンを固定**し、挙動差分を出さない。アップデートはPhase 3以降に分離

### R9. 参照元の更新

- Web版・Desktop版は今後も更新される
- 対策: 移植時点のコミットハッシュをDEV-MEMOに記録。共有ロジックは`packages/shared`へ寄せ、二重管理を避ける

### R10. 日本語IME・長文入力

- WebView内の`contentEditable`で日本語変換（composition）が正常に動くか、Androidで変換確定時のカーソルずれがないかは実機依存
- 対策: iOS/Android実機で「変換→確定→改行→Undo」をPhase 0で確認。問題があればLexicalのバージョンアップまたは`beforeinput`対応を検討
- 外付けキーボード（iPad/Androidタブレット）のショートカットはPhase 2以降

---

## 6. 未確認事項（Phase 0で潰す）

1. 同梱HTML文字列を `react-native-webview` がiOS/Android実機で読めるか（Expo Go / Development Build双方）
2. 単一HTMLのサイズ（Lexical + abcjs + CSS + フォント）と初回ロード時間
3. abcjsの音声がiOS実機のマナーモード・Bluetooth・バックグラウンドでどう振る舞うか
4. 10万字文書での入力遅延・メモリ・保存時間
5. `color-mix(in oklab)` とTailwind v4出力がAndroidの最低サポートWebViewで動くか
6. キーボード表示時のWebViewリサイズ（iOS/Android）と、ツールバーの追従
7. Google Fontsを同梱した場合のアプリサイズ増加
8. Expo SDK 58 / RN 0.88 と `react-native-webview` 14.0.1 の組み合わせの安定性
9. EAS Buildでの `editorHtml.ts` のバンドル方法
10. App Store審査でWebView利用が問題にならないか（4.2）

---

## 7. 決定が必要な事項

| # | 論点 | 推奨 |
|---|---|---|
| D1 | 全画面WebViewか、ネイティブシェル+エディタWebViewか | **ネイティブシェル+エディタWebView** |
| D2 | テーマ | 初期はcosmicのみ。抽象化は用意 |
| D3 | ストレージ | アプリ内SQLite。外部フォルダ直接編集はしない |
| D4 | 同期 | なし（ローカルファースト）。バックアップは手動エクスポート |
| D5 | 対応端末 | iPhone / Android phone を優先。iPadでも動作するが、レイアウト最適化はPhase 2以降 |
| D6 | Webクリップ | 初期スコープ外 |
| D7 | HTML書き出し | まず既存移植。Phase 2で改善判断 |
| D8 | アプリ名 / Bundle ID | `TOOLSMITH EDITOR` / 例 `app.toolsmith.editor` |
| D9 | 課金 | 無料（初期） |
| D10 | 最小OS | iOS 15+ / Android 8+（WebView更新前提）を仮置き |

---

## 8. 直近のNext Action

1. `npm install` と `npm run build:editor` で開発環境を準備
2. `npm run typecheck` で全ワークスペースの型検査
3. `npx expo run:ios` / `npx expo run:android` で実機・シミュレータ起動
4. `INIT` / `READY` / `CONTENT_CHANGED` / `SAVE_REQUEST` を実機確認
5. SQLiteに1文書を保存し、再起動復元を確認
6. abcjsの音声再生と10万字文書の性能を検証
7. G1〜G4を判定し、DEV-MEMOに結果を追記

---

## 9. 参考: 主要コード位置

### Web版

- エディタ構成: `src/components/Editor.tsx:103-120`
- 初期Markdown投入: `src/components/Editor.tsx:124-137`
- 自動保存: `src/components/Editor.tsx:219-223`
- Markdown同期: `src/components/Editor.tsx:297-310`
- 文書CRUD: `src/lib/storage.ts:47-101`
- タイトル抽出: `src/lib/storage.ts:15-21`
- 書き出し: `src/lib/export.ts:9-58`
- 表変換: `src/lib/table.ts:74-110`
- ABC抽出: `src/components/MarkdownPreview.tsx:8-17`
- ABC描画・再生: `src/components/AbcSheet.tsx:40-87`
- ツールバー: `src/components/Toolbar.tsx:241-289`

### Desktop版

- 保存の直列化・競合: `src/frontend/components/Editor.tsx:326-380`
- 外部変更の競合解決: `src/frontend/components/Editor.tsx:769-790`
- atomic write: `src/backend/workspace.js:135-148`
- 設定バリデーション: `src/backend/settings.js`
- Quarto: `src/backend/quarto.js`
- Webクリップ: `src/frontend/lib/web-clip.ts`

---

## 10. 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-11-01 | 初版。Web版v0.6.2 / Desktop版v0.1.1を調査。Ollama除外を前提に実装可能性を判定し、WebViewハイブリッド構成・SQLite設計・Phase 0ゲートを記録 |
