# App Backup Restore

An Electron-based desktop application.
It backs up and restores package managers and editor extensions used in your development environment.
Designed with Windows / macOS / Linux in mind.

## Features

- Backup package managers (export installed identifiers to JSON)
- VS Code family variants, configuration files, and extension lists (includes extensions installed inside WSL on Windows)
- Backup everything at once, or individually
- List backup data
- Restore per application

## Supported OS

- Windows 11 (WSL aware)
- macOS 10.15+
- Linux (Debian-based / RHEL-based)

Note: This project is not code-signed on Windows. If SmartScreen displays a warning, click "More info" → "Run anyway".

## 3. Developer Reference

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

- DevTools open automatically in detached mode
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Build / Distribute

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

In development the app uses BrowserRouter to load `<http://localhost:3001>`. In distribution builds it uses HashRouter to load `dist/renderer/index.html`.

### Direct Release to GitHub (for Auto-Update)

These commands upload build artifacts and `latest*.yml` (auto-update metadata) directly to the GitHub repository configured in `publish:` of `electron-builder.yml`. Because `releaseType: draft` is configured, each command **aggregates artifacts into a single draft release of the same version** on GitHub. Once all platforms are in place, press "Publish release" in the GitHub UI to deliver the update to users.

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

Before running, set a GitHub Personal Access Token (`public_repo` scope) in the `GH_TOKEN` environment variable.

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

When building each platform on multiple machines, make sure the `version` in `package.json` matches across all machines, then run the corresponding `release:*` command on each machine in order.

### macOS Prerequisite: Environment Variables for Signing & Notarization

To build a signed and notarized macOS distribution, set the following environment variables before running `yarn dist:mac`.

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows Prerequisite: Developer Mode

To run or test unsigned local builds/distributables on Windows, enable Developer Mode in the OS.

1. Settings → Privacy & security → For developers
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
