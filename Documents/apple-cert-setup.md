# Electronアプリ向けApple Developer ID証明書取得〜ビルド手順

Apple Developer Program契約済みの前提で、`Documents` 配下の手順書として GateKeeper 対応済みの macOS ビルドを得るまでの流れをまとめます。

## 1. 前提条件

- Apple Developer Program アカウント（個人 / 法人）
- 開発用 macOS 端末（Xcode Command Line Tools／キーチェーンアクセス）
- プロジェクト（`/Users/yendo/Sources/electron-projects/app_backup_restore`）に含まれる `entitlements.mac.plist`
- Node.js 22 + Yarn 4（既存環境）

## 2. CSR（証明書署名要求）の作成

1. macOS で「キーチェーンアクセス」を開く。
2. メニュー「キーチェーンアクセス」→「証明書アシスタント」→「証明書の認証局に署名を要求…」を選択。
3. Apple ID メールアドレスと任意の Common Name を入力。
4. 「ディスクに保存」を選び、RSA 2048bit のまま `.certSigningRequest` を保存。

## 3. Apple Developer で Developer ID 証明書を発行

1. [Apple Developer → Certificates, IDs & Profiles](https://developer.apple.com/account/resources/certificates/list) にログイン。
2. `Certificates` で `＋` → `Production` → `Developer ID Application` を選択。
3. 先ほどの CSR ファイルをアップロードし、発行された `.cer`（Developer ID Application）をダウンロード。
4. インストーラ署名も必要な場合は同画面で `Developer ID Installer` も発行。

## 4. 証明書のキーチェーン登録と `.p12` 作成（任意）

1. ダウンロードした `.cer` をダブルクリックして「ログイン」キーチェーンに追加。
2. キーチェーンで対象証明書を右クリック → 「書き出す…」→ `.p12` を作成し、パスワードを設定（CI や別端末で使用する場合）。
3. `.p12` を Base64 化して `CSC_LINK` / `CSC_KEY_PASSWORD` をそろえるか、ローカルではキーチェーンの自動検出（`CSC_IDENTITY_AUTO_DISCOVERY=true`）を利用。

## 5. Notarization 用アカウント情報の準備

- Apple ID と App-Specific Password を作成（[appleid.apple.com](https://appleid.apple.com/) → セキュリティ → App 用パスワード）。
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`（electron-builder では `APPLE_ID_PASSWORD`）を環境変数として設定。
- チームIDが複数ある場合は `APPLE_TEAM_ID` も設定。

## 6. プロジェクト設定の確認

- `electron-builder.yml` で `mac.sign` / `mac.entitlements` に `entitlements.mac.plist` が指定されていること。
- `package.json` の `scripts` に `yarn dist:mac` があること。
- 必要な依存（`@emotion/react` など）を `yarn install` 済みでビルドが成功する状態にする。

## 7. 署名付きビルドの実行

1. 必要な環境変数を設定（例）:

   ```bash
   export CSC_LINK="file:///path/to/developer-id.p12"
   export CSC_KEY_PASSWORD="p12-password"
   export APPLE_ID="you@example.com"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="ABCDE12345"
   ```

   ※ローカルキーチェーン使用時は `CSC_LINK` 省略可。
2. プロジェクトルートで `yarn dist:mac` を実行。
3. electron-builder が Developer ID 署名 → notarization → stapler attach（公証チケット付与）まで自動で実行。

## 8. ビルド成果物の検証

1. `dist/mac`（または `release/`）に生成された `.app` / `.dmg` を確認。
2. 署名確認:

   ```bash
   codesign -dv --verbose=4 /path/to/App.app
   codesign -dv --verbose=4 /path/to/App.dmg
   ```

   `Authority=Developer ID Application: ...` が表示されれば署名成功。
3. GateKeeper 判定:

   ```bash
   spctl -a -vv /path/to/App.dmg
   ```

   `accepted` であれば GateKeeper でブロックされない。
4. 公証チケットの記録確認:

   ```bash
   xcrun stapler validate /path/to/App.dmg
   ```

## 9. トラブルシュートのポイント

- `code object is not signed at all` → 署名未適用。`CSC_*` の設定やキーチェーン登録を再確認。
- `missing required entitlement` → `entitlements.mac.plist` のキーと `electron-builder.yml` の指定を確認。
- `Could not find Developer ID Application certificate` → キーチェーンに証明書＋秘密鍵が揃っているか、または `CSC_LINK` が有効か確認。

以上で、`Documents` 配下から参照できる証明書取得〜ビルド手順書が整います。
