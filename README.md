# App Backup Restore

Electron-based desktop app to backup and restore your development environment package managers and editor extensions. It prioritizes safety (read-only on startup), single-app-id restore execution, and portability across Windows/macOS/Linux.

## Features

- Package managers backup (installed identifiers to JSON):
  - Windows: winget, Microsoft Store (via winget), Scoop, Chocolatey
  - macOS/Linux: planned (APT/Homebrew/Pacman etc.)
- VS Code family and config files: planned according to the requirements spec
- List view of backup datasets (planned)
- Per app_id last-backup tracking (`backup_metadata.json`)
- Restore by app_id with multiple identifiers:
  - Execute mode: run install commands sequentially
  - Script mode: export a single script with all commands
- WSL-aware extension listing for editors (planned)

## Supported OS

- Windows 11 (WSL considered)
- macOS (planned)
- Linux (planned)

## Requirements

- Node.js 22+
- yarn 4
- Git

## Install

```bash
# Clone the repository
git clone <repository-url>
cd app_backup_restore

# Install dependencies
yarn install

# Start development (TS main watch / Vite / Electron)
yarn dev
```

DevTools in development:

- DevTools open in detached mode automatically
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

## Build/Distribute

- All platforms: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

In development the app uses BrowserRouter with `http://localhost:3001`, and in production it uses HashRouter to load `dist/renderer/index.html`.

### Windows prerequisite: Developer Mode

When building or running unsigned local releases on Windows, enable Developer Mode:

1. Open Settings → Privacy & security → For developers
2. Turn on "Developer Mode"
3. Reboot if Windows asks you to

Note: The app is not code-signed on Windows. SmartScreen may show a warning; click "More info" → "Run anyway".

## Project Structure (excerpt)

```text
src/
├── main/
│   ├── index.ts                # Electron boot
│   ├── ipc/                    # IPC handlers
│   └── services/
│       ├── config.ts           # ~/.abr config handling
│       ├── managers.ts         # winget/msstore/scoop/choco listing + cache
│       ├── backup.ts           # write JSON + backup_metadata.json
│       └── restore.ts          # sequential execution or script export
├── preload/                    # Safe bridge (window.abr)
├── renderer/                   # React + MUI UI
└── shared/                     # Types, constants, IPC types
```

## Tech Stack

- Electron
- React (MUI v7)
- TypeScript
- Vite

## For Developers

### Execution Modes

- Development: `yarn dev` (Vite: http://localhost:3001, BrowserRouter)
- Production: `yarn build && yarn start` (HashRouter loading `dist/renderer/index.html`)

### Create Windows Icon

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
