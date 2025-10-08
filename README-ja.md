# App Backup Restore（日本語）

Electron ベースのデスクトップアプリです。開発環境のパッケージマネージャーおよびエディタ拡張機能のバックアップ／リストアを行います。起動時は読み取り専用で安全に動作し、リストアは常に単一の app_id 単位で実行、Windows / macOS / Linux を念頭に設計されています。

## 特長

- パッケージマネージャーのバックアップ（インストール済み識別子を JSON 出力）
  - Windows: winget, Microsoft Store（winget 経由）, Scoop, Chocolatey
  - macOS / Linux: 近日対応予定（APT / Homebrew / Pacman など）
- VS Code 系と設定ファイル: 要件定義に基づき今後対応予定
- バックアップデータの一覧表示（予定）
- app_id ごとの最終バックアップ日付管理（`backup_metadata.json`）
- app_id 単位のリストア（複数の識別子を順次処理）
  - 実行モード: インストールコマンドを1件ずつ順次実行
  - スクリプトモード: 全コマンドを1つのスクリプトとして出力
- エディタの WSL 拡張機能取得（予定）

## 対応 OS

- Windows 11（WSL 考慮）
- macOS（予定）
- Linux（予定）

## 必要環境

- Node.js 22+
- yarn 4
- Git

## インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd app_backup_restore

# 依存関係をインストール
yarn install

# 開発起動（TS main watch / Vite / Electron）
yarn dev
```

開発時の DevTools:

- DevTools はデタッチモードで自動的に開きます
- F12 または Ctrl+Shift+I（macOS は Cmd+Option+I）で切り替え

## ビルド / 配布

- 全プラットフォーム: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter（`http://localhost:3001`）を使用し、本番では HashRouter で `dist/renderer/index.html` を読み込みます。

### Windows 事前準備: 開発者モード

署名されていないローカルリリースを Windows でビルド／実行する場合、開発者モードを有効化してください:

1. 設定 → プライバシーとセキュリティ → 開発者向け
2. 「開発者モード」をオン
3. 必要に応じて再起動

注意: 本アプリは Windows でコードサインされていません。SmartScreen が警告する場合は「詳細情報」→「実行」から続行できます。

## プロジェクト構成（抜粋）

```text
src/
├── main/
│   ├── index.ts                # Electron 起動
│   ├── ipc/                    # IPC ハンドラ
│   └── services/
│       ├── config.ts           # ~/.abr の設定管理
│       ├── managers.ts         # winget/msstore/scoop/choco の一覧 + キャッシュ
│       ├── backup.ts           # JSON 出力 + backup_metadata.json 更新
│       └── restore.ts          # 逐次実行 or スクリプト出力
├── preload/                    # セーフブリッジ（window.abr）
├── renderer/                   # React + MUI UI
└── shared/                     # 型・定数・IPC 定義
```

## 技術スタック

- Electron
- React（MUI v7）
- TypeScript
- Vite

## 開発者向け

### 実行モード

- Development: `yarn dev`（Vite: `http://localhost:3001`, BrowserRouter）
- Production: `yarn build && yarn start`（HashRouter で `dist/renderer/index.html` をロード）

### Windows アイコン作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
