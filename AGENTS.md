# AGENTS.md - AI Coding Agent Instructions

> Comprehensive guide for AI agents working on the App Backup Restore project

## 🎯 Agent Operating Principles

### Context Gathering Strategy

**Goal**: Get enough context fast. Parallelize discovery and stop as soon as you can act.

**Method**:
- Start broad, then fan out to focused subqueries
- Launch varied queries in parallel; read top hits per query
- Deduplicate paths and cache; don't repeat queries
- Avoid over-searching for context

**Early Stop Criteria**:
- You can name exact content to change
- Top hits converge (~70%) on one area/path

**Escalation Rule**:
- If signals conflict or scope is fuzzy, run one refined parallel batch, then proceed
- Trace only symbols you'll modify or whose contracts you rely on
- Prefer acting over more searching

### Self-Reflection & Quality

Before implementing, think deeply about:
- What makes a world-class solution for this specific task?
- Create an internal rubric (5-7 categories) - don't show to user
- Iterate until your response hits top marks across all categories

### Persistence

- **Keep going** until the user's query is completely resolved
- Only terminate when you're sure the problem is solved
- Never stop or hand back when you encounter uncertainty
- Research or deduce the most reasonable approach and continue
- Don't ask to confirm assumptions - decide, proceed, document after acting

---

## 📐 Project Overview

**App Backup Restore**: Electron-based desktop app for backing up and restoring development environment packages, VS Code extensions, and config files across Windows/macOS/Linux.

**Tech Stack**: TypeScript 5 + React 19 + MUI v7 + Vite + Electron 38 + Zustand

**Critical Constraint**: Restore operations use **app_id** (e.g., `winget`, `vscode`) as the primary unit—**one app_id per restore execution**. Within each app_id, multiple **identifiers** (packages/extensions) can be selected for sequential processing.

---

## 🏗️ Architecture Deep Dive

### Three-Layer IPC Communication

```
┌─────────────┐
│  Renderer   │  React UI + MUI + Zustand
│  (Browser)  │  Calls: window.abr.methodName()
└──────┬──────┘
       │
┌──────▼──────┐
│   Preload   │  Security bridge
│ (Isolated)  │  Exposes: window.abr API
└──────┬──────┘
       │
┌──────▼──────┐
│    Main     │  Electron entry + Node.js
│  (Node.js)  │  IPC handlers → Services
└─────────────┘
```

**IPC Flow**: Renderer → `window.abr.methodName()` → Preload → IPC Channel → Main handler → Service layer

### Service Layer Organization

| Service | Responsibility | Key Functions |
|---------|---------------|---------------|
| `config.ts` | Config management | `loadConfig()`, `saveConfig()`, reads/writes `~/.abr/config.json` |
| `managers.ts` | Detection & listing | `detectManagers()`, `listWinget()`, caches winget display names to `.cache/winget_cache.json` |
| `backup.ts` | Export to JSON | `runBackup()`, writes `{managerId}_apps.json`, `{vscodeId}/extensions.json` |
| `restore.ts` | Command generation | `runSequentialInstall()`, `writeInstallScript()` for execution or script export |
| `backup-manager.ts` | High-level orchestration | Wraps backup operations |
| `restore-manager.ts` | High-level orchestration | Wraps restore operations |

---

## 🔧 Development Workflow

### Running Dev Environment

```bash
yarn dev  # Starts 3 concurrent processes
```

1. **Main Process**: `tsc -w -p tsconfig.main.json` → `dist/main/index.js`
2. **Renderer**: Vite dev server on `http://localhost:3001` (BrowserRouter)
3. **Electron**: `wait-on` then launches with `--dev` flag, DevTools in detached mode

**DevTools Toggle**: F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Building for Distribution

```bash
yarn build          # TypeScript compile + Vite build → dist/
yarn dist:win       # Windows NSIS installer → release/
yarn dist:mac       # macOS .dmg → release/
yarn dist:linux     # Linux AppImage/deb/rpm → release/
```

**Router Difference**:
- Development: `BrowserRouter` with `http://localhost:3001`
- Production: `HashRouter` loading `dist/renderer/index.html`

### TypeScript Configuration

- **`tsconfig.json`**: Shared config with path aliases (`@shared/*`, `@renderer/*`, `@main/*`)
- **`tsconfig.main.json`**: Extends base, targets Node.js, includes `src/main` + `src/shared`
- **`vite.config.ts`**: Renderer build, matches aliases, builds to `dist/renderer`

---

## 🎨 Code Editing Rules

### Guiding Principles

- **Readability**: No environment-dependent characters, emojis, or non-standard strings in code/comments
- **Maintainability**: Proper directory structure, consistent naming, organized shared logic
- **Consistency**: UI adheres to design system—color tokens, typography, spacing unified
- **Visual Quality**: High OSS standard (spacing, padding, hover states, etc.)

### Frontend Stack Conventions

- **Coding**: TypeScript 5, strict mode enabled
- **Styling**: `@mui/material` components with `sx` prop (no CSS files, no `styled()` unless complex)
- **Icons**: `@mui/icons-material`
- **State**: Zustand (single global store, direct setters, no Redux)
- **i18n**: react-i18next, keys in `src/renderer/i18n/locales/{ja,en}.ts`

### Developer Stack

- **Packaging**: yarn 4 (Node.js 22+ required)
- **Builder**: electron-builder
- **Linter**: ESLint 9
- **Formatter**: Prettier 3

---

## 📦 Project-Specific Conventions

### Package Manager Identifier Fields

Each manager uses different field names for identifiers (see `src/shared/types.ts`):

| Manager | Identifier Field | Example |
|---------|-----------------|---------|
| `winget`, `msstore` | `PackageId` | `Microsoft.VisualStudioCode` |
| `scoop`, `homebrew`, `pacman`, `snap` | `Name` | `git`, `wget` |
| `chocolatey` | `PackageId` | `git.install` |
| `apt` | `Package` | `git` |
| VS Code extensions | `id` | `ms-python.python` |

**Critical**: When filtering/matching in backup/restore, use the correct field name.

### Winget Display Name Caching

Winget's `PackageId` is not user-friendly. The app resolves display names:

1. Runs `winget show <id>`, `winget search`, or `winget list`
2. Caches to `{backupDirectory}/.cache/winget_cache.json`:
   ```json
   {
     "Microsoft.VisualStudioCode": {
       "package_id": "Microsoft.VisualStudioCode",
       "cached_at": "2025-11-01T10:30:00Z",
       "display_name": "Visual Studio Code"
     }
   }
   ```
3. Uses `normalizeWingetOutput()` to strip ANSI codes and sanitize

**Implementation**: See `getWingetDisplayName()` in `src/main/services/managers.ts`

### Command Execution Patterns

```typescript
// Sync commands (returns { code, stdout, stderr })
import { runCommand } from '../utils/exec';
const result = await runCommand('winget', ['list']);

// WSL commands (wraps in wsl.exe)
import { runCommandInWSL } from '../utils/exec';
await runCommandInWSL('code', ['--install-extension', 'ms-python.python']);

// Progress updates (for long operations)
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
const win = BrowserWindow.getAllWindows()[0];
win?.webContents.send(IPC_CHANNELS.TASK_PROGRESS, 'Processing...');
```

### File System Helpers

**Never use raw `fs`**. Use wrappers from `src/main/utils/fsx.ts`:

```typescript
import { readJsonFile, writeJsonFile, copyFile, resolveEnvPath } from '../utils/fsx';

// Auto-handles missing files with default
const config = readJsonFile<AppConfig>('/path/to/config.json', { backupDirectory: '' });

// Creates parent dirs, formats with 2-space indent
writeJsonFile('/path/to/output.json', { items: [...] });

// Creates dest dirs, copies with permissions
await copyFile('/src/file.txt', '/dest/file.txt');

// Expands %APPDATA%, ~, etc. to absolute paths
const resolved = resolveEnvPath('%APPDATA%\\Code\\User');
```

---

## 🎭 UI State Management

### Zustand Store (`src/renderer/store/useAppStore.ts`)

**Single global store** with direct setters (no actions/reducers):

```typescript
import useAppStore from '../store/useAppStore';

function MyComponent() {
  const { view, setView, packageItems, setPackageItems } = useAppStore();

  // Direct state updates
  setView('details');
  setPackageItems([...newItems]);
}
```

**State Categories**:
- **Config/info**: `config`, `info` (OS, language, theme)
- **View state**: `view` ('home'|'settings'|'details'), `selectedManager`
- **Data state**: `packageItems`, `extensionItems`, `extensionItemsInWSL`
- **Selection state**: `selectedIds`, `selectedIdsInWSL`
- **Processing state**: `isProcessing`, `processingMessage`, `progressMessage`

### MUI Component Standards

```tsx
import { Button, Typography, Table, TableCell } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Styling with sx prop (no CSS files)
<Button variant='contained' sx={{ mt: 2, px: 3 }}>
  {t('backupAll')}
</Button>

// Typography variants
<Typography variant='h6'>{t('sectionTitle')}</Typography>
<Typography variant='body1'>{t('content')}</Typography>

// Tables
<Table size='small' hover>
  <TableCell sx={{ width: '100%' }}>{name}</TableCell>
</Table>
```

### i18n Translation Pattern

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  // Simple key
  const title = t('packagesTitle');

  // Parametrized
  const message = t('gettingDisplayNames', { source: 'winget', current: 5, total: 10 });
}
```

**Key Naming**: camelCase (e.g., `packagesTitle`, `backupAll`, `lastModified`)
**Files**: `src/renderer/i18n/locales/{ja,en}.ts`

---

## 🧪 Testing and Debugging

### Manual Testing Workflow

1. **Start dev**: `yarn dev`
2. **Configure**: Change backup directory in Settings to test folder
3. **Verify detection**: Home page shows detected managers (green status)
4. **Test backup**: Click "Backup" on manager → verify JSON in backup directory
5. **Test restore**: Open details → select items → choose Execute/Script mode

### Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|------------|----------|
| "Manager not detected" | Wrong detection command | Check `isPackageManagerAvailable()` in `exec.ts` |
| Empty backup files | Parsing failure | Verify listing command in `managers.ts` |
| Restore script not working | Wrong CLI syntax | Check command generation in `restore.ts` |
| Windows SmartScreen warning | Unsigned build | Enable Developer Mode (Settings → Privacy & security → For developers) |

---

## 🗺️ Key Files for Common Tasks

| Task | Files to Modify |
|------|----------------|
| **Add new package manager** | 1. `src/shared/types.ts` (add `ManagerId` + `*Item` type)<br>2. `src/shared/constants.ts` (add to `MANAGER_DEFS`)<br>3. `src/main/services/managers.ts` (add `list*()` + detection)<br>4. `src/main/services/backup.ts` (add backup case)<br>5. `src/main/services/restore.ts` (add restore command) |
| **Add new VS Code variant** | 1. `src/shared/types.ts` (add to `VSCodeId`)<br>2. `src/shared/constants.ts` (add to `VS_CODE_DEFS` with command + settingsPaths)<br>3. `src/main/services/managers.ts` (add detection)<br>4. `src/main/services/backup.ts` (list extensions)<br>5. `src/main/services/restore.ts` (install command) |
| **Add new IPC method** | 1. `src/shared/constants.ts` (add to `IPC_CHANNELS`)<br>2. `src/shared/ipc.ts` (add to `IpcApi` type)<br>3. `src/preload/index.ts` (implement in `api` object)<br>4. `src/main/ipc/index.ts` (register handler) |
| **Add new UI page** | 1. `src/renderer/pages/NewPage.tsx` (create component)<br>2. `src/renderer/main.tsx` (add route)<br>3. `src/renderer/i18n/locales/{ja,en}.ts` (add translations) |

---

## 🚀 Build and Release

### Build Commands

```bash
# Development build
yarn build

# Distribution packages
yarn dist:win       # → release/*.exe (NSIS installer)
yarn dist:mac       # → release/*.dmg
yarn dist:linux     # → release/*.AppImage, *.deb, *.rpm
```

### Build Configuration

- **Icons**: `public/icon.{png,ico,icns}` (512x512 PNG source)
- **Config**: `electron-builder.yml` (appId, copyright, publish settings)
- **Output**: `release/` directory

### Windows Prerequisites

**Developer Mode required** for unsigned local builds:
1. Settings → Privacy & security → For developers
2. Turn on "Developer Mode"
3. Reboot if prompted

---

## 📚 Reference Documents

- **Requirements**: `Documents/要件定義書.md` (Japanese spec for feature intent)
- **README**: `README.md` (user-facing documentation)
- **Cursor Rules**: `.cursor/rules/global.mdc` (agent behavior patterns)

---

## 🎯 Critical Reminders

1. **app_id constraint**: Never allow multiple app_ids in single restore operation
2. **Identifier fields**: Use correct field name per manager type
3. **File system**: Always use `fsx.ts` helpers, never raw `fs`
4. **IPC flow**: Renderer → Preload → Main → Service (maintain security boundary)
5. **Progress updates**: Send `TASK_PROGRESS` events for long operations
6. **Error handling**: Fail gracefully, log to console, inform user via UI
7. **Router mode**: BrowserRouter (dev) vs HashRouter (prod)
8. **Path aliases**: Use `@shared/*`, `@renderer/*`, `@main/*` in imports

---

*Last updated: 2025-11-01*
