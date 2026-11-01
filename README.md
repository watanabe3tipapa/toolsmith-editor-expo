# toolsmith-editor-expo

**Markdown を、あなたのポケットに。iOS / Android で書く、ローカルファーストの Markdown ワークスペース。**

toolsmith-editor-expo は、Web版 TOOLSMITH EDITOR の編集体験を Expo（React Native）で iOS / Android ネイティブアプリとして再構築するプロジェクトです。Lexical ベースのリッチテキストエディタを WebView 内で動かし、文書管理・自動保存・書き出しは React Native 側で担当します。原稿は端末内の SQLite に保存され、アカウント登録もサーバーへの送信も必要ありません。

> **書く、整える、持ち出す。その流れを、端末内で完結させる。** クラウドへのアカウント登録も、原稿の送信も不要です。編集内容は端末内に自動保存され、必要なときだけ共有シートから Markdown や HTML として取り出せます。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.1.0-blue.svg)](https://github.com/watanabe3tipapa/toolsmith-editor-expo/releases)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/toolsmith-editor-expo/)
[![CI](https://github.com/watanabe3tipapa/toolsmith-editor-expo/actions/workflows/ci.yml/badge.svg)](https://github.com/watanabe3tipapa/toolsmith-editor-expo/actions/workflows/ci.yml)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-58-000020?logo=expo)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react)](https://reactnative.dev/)
[![Lexical](https://img.shields.io/badge/Lexical-0.32-1877F2)](https://lexical.dev/)

**クイックリンク:** [公開サイト](https://watanabe3tipapa.github.io/toolsmith-editor-expo/) · [開発メモ](./DEV-MEMO.md) · [Web版](https://github.com/watanabe3tipapa/toolsmith-editor) · [Desktop版](https://github.com/watanabe3tipapa/toolsmith-editor-desktop) · [Issues](https://github.com/watanabe3tipapa/toolsmith-editor-expo/issues)

## 開発状況

モバイル版の土台（Phase 0〜1 相当）は実装済みです。iOS / Android 実機での WebView 読み込み、ABC 音声、10万字文書の性能検証はこれからです。

> 本リポジトリは開発中です。ストア配信、署名、EAS Build の設定は未完了です。

## コンセプト

### なぜ「Expo」なのか

Web版は手軽ですが、原稿の保存先はブラウザの IndexedDB に閉じます。Desktop版は macOS のフォルダを直接編集できますが、iOS / Android のサンドボックスでは同じようには扱えません。Expo版は、**端末内の SQLite を唯一の保存先**にしつつ、共有シートと DocumentPicker で既存のファイルワークフローと接続します。

| 体験 | toolsmith-editor-expo の対応物 |
|---|---|
| 書く | WebView 内の Lexical によるリッチテキスト編集（見出し・リスト・引用・表・リンク・コード） |
| 確かめる | Markdown ソースのプレビュー（GFM テーブルの変換に対応、モバイルでは初期非表示） |
| 残す | 端末内 SQLite へ自動保存。保存中・保存済み・未保存・保存エラーをヘッダーに表示 |
| 鳴らす | `abc` / `music-abc` のコードフェンスを abcjs で楽譜描画・再生 |
| 持ち出す | Markdown / HTML / JSON / Quarto / Plain Text を共有シートへ |
| 受け取る | DocumentPicker から Markdown / テキストを読み込んで新規文書化 |

### 設計方針

1. **端末内が保存先** — アプリ独自の SQLite を正とし、外部サーバーへ原稿を送らない
2. **エディタ資産を活かす** — Lexical のノード・Markdown 変換・ABC 再生を WebView で再利用する
3. **ネイティブの作法** — 文書一覧、保存状態、共有シート、ファイル選択は React Native 側で実装する
4. **壊さない** — 保存の直列化、バックグラウンド移行時の flush、書き出しによるバックアップ導線を用意する

## 主な特徴

### 機能

- **文書ライブラリ** — 端末内の文書を更新日時順に一覧表示。新規作成・削除・Markdown インポートに対応
- **リッチテキスト編集** — 太字、斜体、下線、取り消し線、インラインコード、下付き・上付き、H1〜H6、各種リスト、チェックリスト、引用、コードブロック、リンク、表
- **Markdown 同期** — 編集内容を Markdown へ変換し、ソースプレビューへ反映。Markdown ショートカット入力にも対応
- **自動保存** — 編集停止後に SQLite へ保存。待ち時間は設定画面から 400 / 800 / 1500 / 2500ms に変更可能
- **保存状態の可視化** — 保存中・保存済み・未保存・保存エラーをヘッダーに常時表示
- **ABC 記譜** — 楽譜ブロックを abcjs で描画し、再生・一時停止・停止・テンポ（QPM）調整が可能
- **書き出し** — 共有シートから Markdown / HTML / JSON / Quarto / Plain Text を保存・共有
- **インポート** — DocumentPicker で `.md` / `.markdown` / `.txt` を読み込み、新しい文書として保存
- **設定** — ソースプレビューの初期表示、自動保存の待ち時間を端末内に保存
- **オフライン動作** — エディタと abcjs をアプリに同梱し、ネットワークなしで動作
- **モバイル向けツールバー** — 横スクロール可能な書式ツールバーと、44px 以上のタッチ領域

### アーキテクチャ

- **モバイルシェル**: Expo SDK 58 + React Native 0.88 + React 19.3 + Expo Router
- **エディタ**: Vite + React 18 + Lexical 0.32 + abcjs 6.7（WebView 内）
- **スタイリング**: WebView 側は Tailwind CSS v4、ネイティブ側は React Native StyleSheet
- **データ層**: `expo-sqlite`（`documents` / `app_settings` / `auto_save_log`）
- **ファイル連携**: `expo-file-system` + `expo-sharing` + `expo-document-picker`
- **ブリッジ**: `window.ReactNativeWebView.postMessage` と `injectJavaScript` による JSON メッセージ
- **ビルド**: エディタを単一HTMLへビルドし、`editorHtml.ts` としてアプリへ同梱。同じHTMLを LP のライブデモ用に `docs/demo/editor.html` へも出力

### データとセキュリティ

- 原稿は端末内の SQLite にのみ保存され、外部サーバーへ送信されません
- アカウント登録、テレメトリ、クラウド同期はありません
- 書き出しは OS の共有シート、読み込みは DocumentPicker でユーザーが選んだファイルのみを扱います
- WebView は同梱コンテンツのみを読み込み、外部リンクは OS のブラウザへ渡します
- Ollama 連携、Quarto CLI レンダリングは対象外です。Web クリップは初期スコープ外です
- アプリを削除すると SQLite のデータも失われます。重要な文書は書き出しからバックアップしてください

## インストールとビルド

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---:|---|
| Node.js | 22 LTS または 24 LTS | `node --version` |
| npm | 10 以降 | `npm --version` |
| Xcode | iOS ビルド用（macOS） | `xcodebuild -version` |
| Android Studio | Android ビルド用 | — |
| Expo Go | 任意（基本動作の確認用） | — |

> Node.js 25 系では Expo の依存パッケージが `EBADENGINE` 警告を出します。nvm などで 22 / 24 LTS に切り替えてください。

### 基本的な手順

1. リポジトリを取得

```bash
git clone https://github.com/watanabe3tipapa/toolsmith-editor-expo.git
cd toolsmith-editor-expo
```

2. 依存をインストール

```bash
npm install
```

3. エディタバンドルを生成

```bash
npm run build:editor
```

`packages/editor-web` が単一HTMLへビルドされ、`apps/mobile/src/generated/editorHtml.ts` に埋め込まれます。同じHTMLが LP のライブデモ用に `docs/demo/editor.html` へ出力されます。

4. アプリを起動

```bash
npm run ios
# または
npm run android
```

Expo の開発サーバーが起動します。ネイティブビルドを直接作成する場合は、次のコマンドを使用します。

```bash
npx expo run:ios
npx expo run:android
```

### 主要コマンド

| コマンド | 用途 |
|---|---|
| `npm run build:editor` | Lexical + abcjs のエディタバンドルを再生成 |
| `npm run dev` | Expo 開発サーバーを起動 |
| `npm run ios` | iOS シミュレータ / Expo Go で起動 |
| `npm run android` | Android エミュレータ / Expo Go で起動 |
| `npm run typecheck` | 全ワークスペースの TypeScript 型検査 |
| `npx expo run:ios` | iOS の Development Build を作成・起動 |
| `npx expo run:android` | Android の Development Build を作成・起動 |

### リリース

EAS Build による配信を予定しています。`app.json` の `version` を更新し、EAS プロジェクトを設定したうえでビルドします。

```bash
npx eas build --platform ios
npx eas build --platform android
```

ストア申請用の署名、スクリーンショット、プライバシーポリシーはリリース準備で整備します。

### LP の公開

`docs/` に GitHub Pages 用の LP を配置しています。`main` ブランチへの push で `.github/workflows/pages.yml` が実行され、自動的にデプロイされます。

ワークフローは `configure-pages` の `enablement: true` で Pages を自動的に有効化するため、通常は初回設定は不要です。組織のポリシーなどで自動有効化できない場合のみ、**Settings → Pages → Build and deployment → Source** を「GitHub Actions」に設定してください。

### CI

`main` への push と Pull Request で GitHub Actions の CI が実行されます。

- 依存関係のインストール（`npm ci`）
- 全ワークスペースの型検査（`npm run typecheck`）
- エディタバンドルのビルド（`npm run build:editor`）
- 生成された `apps/mobile/src/generated/editorHtml.ts` と `docs/demo/editor.html` に未コミットの差分がないこと

## ディレクトリ構成

```text
apps/mobile/                        # Expo アプリ
├── app/
│   ├── _layout.tsx                 # Expo Router レイアウト
│   ├── index.tsx                   # 文書ライブラリ
│   ├── editor/[id].tsx             # エディタ画面（WebView + 保存）
│   └── settings.tsx                # 設定画面
├── src/
│   ├── bridge/
│   │   └── useEditorBridge.ts      # RN <-> WebView メッセージング
│   ├── components/
│   │   ├── WebEditor.tsx           # WebView の読み込みと INIT
│   │   └── webview.ts              # react-native-webview の型ラッパー
│   ├── db/
│   │   ├── database.ts             # SQLite スキーマ・文書CRUD
│   │   └── settings.ts             # 設定の読み書き
│   ├── features/
│   │   ├── importDocument.ts       # DocumentPicker 読み込み
│   │   └── shareDocument.ts        # 共有シート書き出し
│   ├── stores/                     # Zustand ストア
│   ├── theme/tokens.ts             # ネイティブ側の配色
│   ├── utils/format.ts             # 日付・サイズ・保存状態
│   └── generated/editorHtml.ts     # 自動生成のエディタHTML
├── app.json
└── metro.config.js
packages/editor-web/                # WebView 内エディタ
├── src/
│   ├── EditorApp.tsx               # Lexical 構成・ブリッジ・保存通知
│   ├── bridge.ts                   # postMessage ラッパー
│   ├── components/
│   │   ├── Toolbar.tsx             # 書式・挿入・書き出し
│   │   ├── MarkdownPreview.tsx     # Markdown / ABC プレビュー
│   │   ├── AbcSheet.tsx            # abcjs 描画・再生
│   │   └── LinkEditorModal.tsx     # リンク入力
│   ├── lib/
│   │   ├── markdown.ts             # Lexical トランスフォーマー（music-abc 対応）
│   │   └── table.ts                # GFM テーブル変換
│   ├── main.tsx                    # エディタのエントリポイント
│   ├── theme.css                   # Tailwind テーマ
│   └── editor.css                  # Lexical / WebView シェル
└── scripts/emit-html.mjs           # 単一HTMLをアプリと LP デモへ出力
packages/shared/                    # Web / RN 共通ロジック
└── src/
    ├── bridge.ts                   # メッセージ型・パーサー
    ├── constants.ts                # 既定文書
    ├── export.ts                   # 5形式の変換
    ├── title.ts                    # タイトル抽出・文字数
    └── types.ts                    # DocumentRecord など
docs/                               # GitHub Pages 用 LP
├── index.html                      # ランディングページ
├── demo/editor.html                # ライブデモ用エディタ（自動生成）
├── demo/architecture.html          # Archify によるアーキテクチャ図
└── assets/                         # アイコン・静的ポスター
.github/workflows/pages.yml         # LP のデプロイ
.github/workflows/ci.yml            # 型検査・エディタビルド検証
DEV-MEMO.md                         # 実装メモ・調査記録
```

## 使い方

1. 起動すると、初回は案内文つきの文書が作成されます
2. 「＋ 新しい文書」で空の文書を作成するか、「インポート」から Markdown を取り込みます
3. ツールバーで書式を整え、必要ならメニューの「ソースプレビュー」をオンにします
4. 編集内容は自動保存されます。ツールバーの保存ボタンで即時保存もできます
5. 書き出したいときは右上のメニューから形式を選択します。共有シートが開きます
6. 自動保存の待ち時間やプレビューの初期表示は、メニュー →「設定」から変更できます
7. 文書を削除するときは、ライブラリで対象の文書を長押しします

## 既知の制約とロードマップ

### v0.1.0

- [x] Expo SDK 58 + Expo Router のモノレポ構成
- [x] Web版からの Lexical エディタ抽出と単一HTMLビルド
- [x] WebView ブリッジ（READY / INIT / CONTENT_CHANGED / SAVE_REQUEST / EXPORT_REQUEST）
- [x] SQLite スキーマ・文書CRUD・設定保存
- [x] 文書ライブラリ・エディタ・設定のネイティブ画面
- [x] Markdown / HTML / JSON / Quarto / Plain Text の書き出し
- [x] DocumentPicker による Markdown インポート
- [x] 自動保存の直列化とバックグラウンド flush
- [ ] iOS / Android 実機での WebView 読み込み検証
- [ ] abcjs の音声再生検証（マナーモード・Bluetooth）
- [ ] 10万字文書の入力・保存ベンチマーク
- [ ] App Store / Google Play 向けアイコン・スクリーンショット
- [x] CI（型検査・エディタビルド検証）
- [ ] EAS Build の整備

### 次の候補

- [ ] 文書検索・タグ・並び替え
- [ ] 全文書の一括バックアップ（ZIP / JSON）
- [ ] iPad の横向きレイアウトと外付けキーボード対応
- [ ] HTML 書き出しの改善（表・リスト・コードフェンス対応）
- [ ] Web クリップ（Readability + Turndown）— 初期スコープ外。需要があれば検討
- [ ] UI テーマ追加（brutalist / cupertino）

### 制約

- 対象は iOS / Android です。Web版は別リポジトリで提供します
- 保存先はアプリ内 SQLite です。任意の外部フォルダを直接編集することはできません
- Quarto CLI はモバイルで実行できないため、`.qmd` の書き出しのみ対応します
- Ollama 連携は対象外です
- HTML 書き出しは見出し・強調・インラインコードのみ変換します（表・リスト・コードフェンスは未対応）
- モバイルではソースプレビューを初期状態で非表示にしています

## ドキュメント

1. [DEV-MEMO.md](./DEV-MEMO.md) — 参照元調査、実装方針、リスク、Phase 0 の検証項目
2. [公開サイト](https://watanabe3tipapa.github.io/toolsmith-editor-expo/) — 機能紹介と実装状況の LP
3. [Web版](https://github.com/watanabe3tipapa/toolsmith-editor) / [Desktop版](https://github.com/watanabe3tipapa/toolsmith-editor-desktop) — 移植元

## ライセンス

MIT ライセンス — 詳細はリポジトリの [LICENSE](LICENSE) ファイルを参照してください。

TOOLSMITH EDITOR は個人プロジェクトです。Expo、React Native、Lexical、abcjs、Tailwind CSS はそれぞれのライセンスに従います。
