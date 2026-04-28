# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Auto-update via `electron-updater`: opt-in download flow with a Snackbar prompt, live download progress bar, and silent post-download install. The flow is fully no-op in development.
- Renderer `UpdateNotification` component plus `updater.*` i18n keys (ja/en).
- `updater` sub-API on the preload bridge (`getState` / `check` / `download` / `quitAndInstall` / `onStateChanged`).

### Changed

- Upgraded `@mui/material` and `@mui/icons-material` from 7.x to 9.x. Migrated deprecated v9 patterns: `Dialog#PaperProps` → `slotProps.paper`, `TextField#InputProps` → `slotProps.input`, and removed Stack system props (`alignItems` / `justifyContent`) by moving them into `sx`.
- Set `moduleResolution: "bundler"` in the root tsconfig (required by MUI v9, which only ships `.d.mts` types) and pinned `moduleResolution: "node"` in the main-process tsconfig (CommonJS is incompatible with `bundler`).
- `electron-builder.yml` `publish.repo` reduced to a bare repo name; `publish.releaseType` switched to `draft` so per-platform release uploads aggregate into a single GitHub draft.
