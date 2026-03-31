# App Backup Restore（日本語）

Electron ベースのデスクトップアプリです。
開発環境のパッケージマネージャーおよびエディタ拡張機能のバックアップ／リストアを行います。
Windows / macOS / Linux を念頭に設計されています。

## 特長

- パッケージマネージャーのバックアップ（インストール済み識別子を JSON 出力）
- VS Code 系と設定ファイル（および拡張機能の一覧。Windowsの場合はWSL内にインストールしたものも含む）
- 全て、または個別のバックアップ
- バックアップデータの一覧表示
- アプリ単位のリストア

## 対応OS

- Windows 11（WSL 考慮）
- macOS 10.15+
- Linux (Debian系/RHEL系)

注記: 本プロジェクトは Windows ではコード署名を行っていません。SmartScreen が警告を表示する場合は「詳細情報」→「実行」を選択してください。

## 3. 開発者向けリファレンス

### 必要要件

- Node.js 22.x以上
- yarn 4
- Git

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd <repository-name>

# 依存関係のインストール
yarn install

# 開発起動
yarn dev
```

開発時のDevTools:

- DevTools はデタッチ表示で自動的に開きます
- F12 または Ctrl+Shift+I（macOSは Cmd+Option+I）でトグル可能

### ビルド/配布

- 全プラットフォーム: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter で `<http://localhost:3001>` を、配布ビルドでは HashRouter で `dist/renderer/index.html` を読み込みます。

### macOS 事前準備: 署名・公証用の環境変数

macOS 向けに署名・公証付きビルドを行う場合は、`yarn dist:mac` の実行前に以下の環境変数を設定してください。

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows 事前準備: 開発者モード

Windows で署名なしのローカルビルド/配布物を実行・テストする場合は、OSの開発者モードを有効にしてください。

1. 設定 → プライバシーとセキュリティ → 開発者向け
2. 「開発者モード」をオンにする
3. OSを再起動

### プロジェクト構成（抜粋）

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

### 使用技術

- **Electron**
- **React (MUI v7)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
