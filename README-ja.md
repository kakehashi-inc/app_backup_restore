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

### 開発ルール

- 開発者の参照するドキュメントは`README.md`を除き`Documents`に配置すること。
- 対応後は必ずリンターで確認を行い適切な修正を行うこと。故意にリンターエラーを許容する際は、その旨をコメントで明記すること。 **ビルドはリリース時に行うものでデバックには不要なのでリンターまでで十分**
- モデルの実装時は、テーブル単位でファイルを配置すること。
- 部品化するものは`modules`にファイルを作成して実装すること。
- 一時的なスクリプトなど（例:調査用スクリプト）は`scripts`ディレクトリに配置すること。
- モデルを作成および変更を加えた場合は、`Documents/テーブル定義.md`を更新すること。テーブル定義はテーブルごとに表で表現し、カラム名や型およびリレーションを表内で表現すること。
- システムの動作などに変更があった場合は、`Documents/システム仕様.md`を更新すること。

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
