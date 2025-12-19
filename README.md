# App Backup Restore

Electron-based desktop application for backing up and restoring development environment package managers and editor extensions.
Designed for Windows / macOS / Linux.

## Features

- Backup package managers (export installed identifiers to JSON)
- VS Code family variants, config files, and extension lists (includes WSL-installed extensions on Windows)
- Full or individual backups
- Browse backup data
- Restore per app

## Supported OS

- Windows 11 (WSL aware)
- macOS 10.15+
- Linux (Debian/RHEL-based)

Note: This project is not code-signed on Windows. If SmartScreen shows a warning, click "More info" → "Run anyway".

## 3. Developer Reference

### Development Rules

- Developer documentation (except `README.md`, `README-ja.md`) should be placed in the `Documents` directory.
- Always run the linter after making changes and apply appropriate fixes. If intentionally allowing a linter error, document the reason in a comment. **Building is for release only; linting is sufficient for debugging.**
- When implementing models, place files per table.
- Components to be modularized should be implemented in the `modules` directory.
- Temporary scripts (e.g., investigation scripts) should be placed in the `scripts` directory.
- When creating or modifying models, update `Documents/Table Definition.md`. Express table definitions as tables per entity, including column names, types, and relations.
- When system behavior changes, update `Documents/System Specification.md`.

### Requirements

- Node.js 22.x or higher
- yarn 4
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
yarn install

# Start development
yarn dev
```

DevTools in development:

- DevTools open in detached mode automatically
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Build/Distribute

- All platforms: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

In development the app uses BrowserRouter with `<http://localhost:3001>`, and in production it uses HashRouter to load `dist/renderer/index.html`.

### Windows Prerequisite: Developer Mode

When building or running unsigned local releases on Windows, enable Developer Mode:

1. Open Settings → Privacy & security → For developers
2. Turn on "Developer Mode"
3. Reboot the OS

### Project Structure (excerpt)

```text
src/
├── main/
│   ├── index.ts                # Electron boot
│   ├── ipc/                    # IPC handlers
│   └── services/
│       ├── config.ts           # ~/.abr config handling
│       ├── managers.ts         # winget/msstore/scoop/choco listing + cache
│       ├── backup.ts           # JSON export + backup_metadata.json update
│       └── restore.ts          # Sequential execution or script export
├── preload/                    # Safe bridge (window.abr)
├── renderer/                   # React + MUI UI
└── shared/                     # Types, constants, IPC definitions
```

### Tech Stack

- **Electron**
- **React (MUI v7)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Create Windows Icon

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
