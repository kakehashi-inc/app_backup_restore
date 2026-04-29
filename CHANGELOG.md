# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Auto-update via `electron-updater`: opt-in download flow with a Snackbar prompt, live download progress bar, and silent post-download install. The flow is fully no-op in development.
- Renderer `UpdateNotification` component plus `updater.*` i18n keys (ja/en).
- `updater` sub-API on the preload bridge (`getState` / `check` / `download` / `quitAndInstall` / `onStateChanged`).
- Windows portable release packaging: `scripts/zip-portable.js` (electron-builder `afterAllArtifactBuild` hook) compresses the portable `.exe` into a `.zip` and removes the original `.exe`, so unsigned binaries are not distributed bare. NSIS artifacts (`.exe`, `.exe.blockmap`, `latest.yml`) are untouched. macOS / Linux builds are no-ops.

### Changed

- Skip `electron-updater` initialization, scheduled startup check, and all updater calls when running as a Windows portable build (detected via `process.env.PORTABLE_EXECUTABLE_FILE`). This prevents the portable build from downloading the NSIS installer and silently installing the regular build to an unintended location. NSIS-installed builds and dev mode are unaffected.
- Upgraded `@mui/material` and `@mui/icons-material` from 7.x to 9.x. Migrated deprecated v9 patterns: `Dialog#PaperProps` → `slotProps.paper`, `TextField#InputProps` → `slotProps.input`, and removed Stack system props (`alignItems` / `justifyContent`) by moving them into `sx`.
- Set `moduleResolution: "bundler"` in the root tsconfig (required by MUI v9, which only ships `.d.mts` types) and pinned `moduleResolution: "node"` in the main-process tsconfig (CommonJS is incompatible with `bundler`).
- `electron-builder.yml` `publish.repo` reduced to a bare repo name; `publish.releaseType` switched to `draft` so per-platform release uploads aggregate into a single GitHub draft.
