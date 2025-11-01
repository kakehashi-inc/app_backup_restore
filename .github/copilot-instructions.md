# App Backup Restore - AI Agent Instructions

## Project Overview

Electron-based desktop app for backing up and restoring development environment packages, VS Code extensions, and config files across Windows/macOS/Linux. Built with **TypeScript + React + MUI + Vite**.

**Critical constraint**: Restore operations use **app_id** (e.g., `winget`, `vscode`) as the primary unit—one app_id per restore execution. Within each app_id, multiple **identifiers** (packages/extensions) can be selected for sequential processing.

## Architecture Pattern

### Three-Layer IPC Communication

1. **Main Process** (`src/main/`): Electron entry, IPC handlers, file system operations, child processes
2. **Preload** (`src/preload/index.ts`): Secure bridge exposing `window.abr` API to renderer
3. **Renderer** (`src/renderer/`): React UI consuming `window.abr`, MUI components, Zustand state

**IPC Flow**: Renderer → `window.abr.methodName()` → Preload → IPC Channel → Main handler → Service layer

### Service Layer Organization

- **`config.ts`**: Reads/writes `~/.abr/config.json` (backup directory, user prefs)
- **`managers.ts`**: Detects package managers, lists installed items, caches winget display names (`.cache/winget_cache.json`)
- **`backup.ts`**: Exports installed items to JSON (`{managerId}_apps.json`, `{vscodeId}/extensions.json`)
- **`restore.ts`**: Generates install commands or scripts from backed-up identifiers
- **`backup-manager.ts`** & **`restore-manager.ts`**: Orchestrators wrapping low-level service functions

## Development Workflow

### Running Dev Environment

```bash
yarn dev  # Starts 3 concurrent processes: TS watch (main), Vite (renderer), Electron
```

- Main: `tsc -w -p tsconfig.main.json` → `dist/main/index.js`
- Renderer: Vite on `http://localhost:3001` (BrowserRouter)
- Electron: `wait-on` then launches with `--dev` flag, opens DevTools in detached mode
- DevTools toggle: F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Building for Distribution

```bash
yarn build          # Main + Renderer → dist/
yarn dist:win       # Windows installer
yarn dist:mac       # macOS .dmg
yarn dist:linux     # Linux packages
```

Production uses **HashRouter** to load `dist/renderer/index.html` (Vite builds to `base: './'`).

### TypeScript Configuration

- `tsconfig.json`: Shared config with path aliases (`@shared/*`, `@renderer/*`, `@main/*`)
- `tsconfig.main.json`: Extends base for main process (Node.js target, includes `src/main`, `src/shared`)
- `vite.config.ts`: Renderer build config with matching aliases

## Project-Specific Conventions

### Package Manager Identifier Extraction

Each manager type has specific identifier keys (see `src/shared/types.ts`):

- `winget`/`msstore`: `PackageId`
- `scoop`/`homebrew`/`pacman`/`snap`: `Name`
- `chocolatey`: `PackageId`
- `apt`: `Package`
- VS Code extensions: `id` (e.g., `ms-python.python`)

When filtering or matching identifiers in backup/restore, use the correct field name for the manager type.

### Winget Display Name Caching

Winget's `PackageId` (e.g., `Microsoft.VisualStudioCode`) often doesn't match the user-friendly display name. The app:

1. Runs `winget show <id>`, `winget search`, or `winget list` to extract display name
2. Caches to `{backupDirectory}/.cache/winget_cache.json` with structure:
   ```json
   {
     "Microsoft.VisualStudioCode": {
       "package_id": "Microsoft.VisualStudioCode",
       "cached_at": "2025-11-01T...",
       "display_name": "Visual Studio Code"
     }
   }
   ```
3. Uses `normalizeWingetOutput()` to strip ANSI codes and sanitize before parsing

See `src/main/services/managers.ts` `getWingetDisplayName()` for the full logic.

### Command Execution Patterns

- **Sync commands**: Use `runCommand(cmd, args)` from `src/main/utils/exec.ts` (returns `{code, stdout, stderr}`)
- **WSL commands**: Use `runCommandInWSL(cmd, args)` which wraps commands in `wsl.exe`
- **Progress updates**: Send `IPC_CHANNELS.TASK_PROGRESS` events to main window for long operations (see `managers.ts` display name fetching)

### File System Helpers

Use `src/main/utils/fsx.ts` wrappers instead of raw `fs`:

- `readJsonFile<T>(path, defaultValue)`: Auto-handles missing files
- `writeJsonFile(path, data)`: Creates parent dirs, formats with 2-space indent
- `copyFile(src, dest)`: Creates dest dirs, copies with permissions
- `resolveEnvPath(path)`: Expands `%APPDATA%`, `~`, etc. to absolute paths

## UI State Management

### Zustand Store (`src/renderer/store/useAppStore.ts`)

Single global store with:

- **Config/info**: `config` (backupDirectory, etc.), `info` (OS, language, theme)
- **View state**: `view` ('home'|'settings'|'details'), `selectedManager`
- **Data state**: `packageItems`, `extensionItems`, `extensionItemsInWSL`
- **Selection state**: `selectedIds`, `selectedIdsInWSL`
- **Processing state**: `isProcessing`, `processingMessage`, `progressMessage`

**Pattern**: Pages call store setters directly, e.g., `setView('details')`. No Redux actions or reducers.

### MUI Component Standards

- Import from `@mui/material` and `@mui/icons-material`
- Use `sx` prop for styling (no CSS files, no `styled()` unless complex)
- Typography: `variant='h6'` for section titles, `variant='body1'` for content
- Buttons: `variant='contained'` for primary, `variant='outlined'` for secondary
- Tables: `size='small'` for list views, `hover` for clickable rows

### i18n Translation Keys

- Translations in `src/renderer/i18n/locales/{ja,en}.ts`
- Use `const { t } = useTranslation();` then `t('keyName')`
- Key naming: camelCase (e.g., `packagesTitle`, `backupAll`, `lastModified`)
- Parametrized: `t('gettingDisplayNames', { source, current, total })`

## Testing and Debugging

### Manual Testing Workflow

1. Start dev: `yarn dev`
2. Change backup directory in Settings to a test folder
3. Verify detection: Home page should show detected managers with green status
4. Test backup: Click "Backup" on a single manager, confirm JSON written to backup directory
5. Test restore: Open details, select items, choose Execute/Script mode

### Common Issues

- **"Manager not detected"**: Check `isPackageManagerAvailable()` in `exec.ts` uses correct detection command
- **Empty backup files**: Verify manager listing command in `managers.ts` parses output correctly
- **Restore script not working**: Check command generation in `restore.ts` matches manager's CLI syntax
- **Windows SmartScreen warning**: Expected for unsigned builds—instruct users to enable Developer Mode

## Key Files for Common Tasks

| Task | Files to Modify |
|------|----------------|
| Add new package manager | `src/shared/types.ts` (ManagerId + Item type), `src/shared/constants.ts` (MANAGER_DEFS), `src/main/services/managers.ts` (list + detect), `src/main/services/backup.ts` (backup logic), `src/main/services/restore.ts` (restore commands) |
| Add new VS Code variant | `src/shared/types.ts` (VSCodeId), `src/shared/constants.ts` (VS_CODE_DEFS with command + settingsPaths), `src/main/services/managers.ts` (detect), `src/main/services/backup.ts` (list extensions), `src/main/services/restore.ts` (install command) |
| Change IPC method | `src/shared/constants.ts` (IPC_CHANNELS), `src/shared/ipc.ts` (IpcApi type), `src/preload/index.ts` (api implementation), `src/main/ipc/index.ts` (handler registration) |
| Add UI page | `src/renderer/pages/NewPage.tsx`, update `src/renderer/main.tsx` routing, add translations to `src/renderer/i18n/locales/{ja,en}.ts` |

## Build and Release

- Windows: `yarn dist:win` → NSIS installer in `release/`
- macOS: `yarn dist:mac` → `.dmg` in `release/`
- Linux: `yarn dist:linux` → AppImage/deb/rpm in `release/`
- Icons: `public/icon.{png,ico,icns}` (512x512 PNG source)
- Config: `electron-builder.yml` (appId, copyright, publish settings)

**Windows Developer Mode required** for running unsigned local builds without SmartScreen blocking.

---

**When in doubt**: Check `Documents/要件定義書.md` (Japanese requirements doc) for feature intent, or `.cursor/rules/global.mdc` for existing agent conventions.
