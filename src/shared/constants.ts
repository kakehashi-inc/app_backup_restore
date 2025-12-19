import os from 'os';
import path from 'path';

import type { ManagerId, VSCodeId, ManagerDef, BackupFilesDef, VSCodeDef, ConfigAppDef } from './types';

export const APP_DIR_NAME = '.abr';

export function getHomeDir(): string {
    return os.homedir();
}

export function getAppRootDir(): string {
    return path.join(getHomeDir(), APP_DIR_NAME);
}

export function getConfigPath(): string {
    return path.join(getAppRootDir(), 'config.json');
}

// Helper functions for dynamic file name generation
export function getManagerBackupFileName(managerId: ManagerId): string {
    return `${managerId}_apps.json`;
}

export function getVSCodeBackupFileName(
    vscodeId: VSCodeId,
    type: 'extensions' | 'extensions_wsl' | 'settings' | 'keybindings'
): string {
    return `${vscodeId}/${type}.json`;
}

export function getConfigAppBackupFileName(configAppId: string, fileName: string): string {
    return `${configAppId}/${fileName}`;
}

export const IPC_CHANNELS = {
    CONFIG_GET: 'config:get',
    CONFIG_SET_BACKUP_DIR: 'config:setBackupDir',
    CONFIG_CHOOSE_BACKUP_DIR: 'config:chooseBackupDir',
    CONFIG_VALIDATE_BACKUP_DIR: 'config:validateBackupDir',
    DETECT_MANAGERS: 'detect:managers',
    CHECK_CONFIG_AVAILABILITY: 'check:configAvailability',
    LIST_PACKAGES: 'list:packages',
    LIST_VSCODE_EXTENSIONS: 'list:vscodeExtensions',
    LIST_VSCODE_EXTENSIONS_WSL: 'list:vscodeExtensionsWSL',
    BACKUP_RUN: 'backup:run',
    BACKUP_RUN_SELECTED: 'backup:runSelected',
    BACKUP_RUN_VSCODE: 'backup:runVSCode',
    BACKUP_RUN_CONFIG: 'backup:runConfig',
    BACKUP_GET_LAST_MODIFIED: 'backup:getLastModified',
    BACKUP_READ_LIST: 'backup:readList',
    BACKUP_READ_VSCODE_LIST: 'backup:readVSCodeList',
    RESTORE_RUN: 'restore:run',
    RESTORE_RUN_VSCODE: 'restore:runVSCode',
    RESTORE_RUN_VSCODE_WSL: 'restore:runVSCodeWSL',
    RESTORE_RUN_CONFIG: 'restore:runConfig',
    RESTORE_GET_SCRIPT_CONTENT: 'restore:getScriptContent',
    RESTORE_VSCODE_SETTINGS: 'restore:vscodeSettings',
    TASK_PROGRESS: 'task:progress',
    APP_GET_INFO: 'app:getInfo',
    APP_SET_THEME: 'app:setTheme',
    APP_SET_LANGUAGE: 'app:setLanguage',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE_OR_RESTORE: 'window:maximizeOrRestore',
    WINDOW_CLOSE: 'window:close',
    WINDOW_IS_MAXIMIZED: 'window:isMaximized',
    MAIN_CONSOLE: 'main:console',
} as const;

// Manager definitions for UI
export const MANAGER_DEFS: readonly ManagerDef[] = [
    { id: 'winget', label: 'Winget', os: ['win32'] },
    { id: 'msstore', label: 'Microsoft Store', os: ['win32'] },
    { id: 'scoop', label: 'Scoop', os: ['win32'] },
    { id: 'chocolatey', label: 'Chocolatey', os: ['win32'] },
    { id: 'homebrew', label: 'Homebrew', os: ['darwin', 'linux'] },
    { id: 'apt', label: 'APT', os: ['linux'] },
    { id: 'yum', label: 'YUM', os: ['linux'] },
    { id: 'dnf', label: 'DNF', os: ['linux'] },
    { id: 'pacman', label: 'Pacman', os: ['linux'] },
    { id: 'zypper', label: 'Zypper', os: ['linux'] },
    { id: 'snap', label: 'Snap', os: ['linux'] },
    { id: 'flatpak', label: 'Flatpak', os: ['linux'] },
];

export const VS_CODE_BACKUP_FILES: BackupFilesDef = {
    win32: ['User/settings.json', 'User/keybindings.json'],
    darwin: ['User/settings.json', 'User/keybindings.json'],
    linux: ['User/settings.json', 'User/keybindings.json'],
};

// VS Code-based IDE definitions (includes VS Code, Cursor, Void Editor)
export const VS_CODE_DEFS: readonly VSCodeDef[] = [
    {
        id: 'vscode',
        label: 'VS Code',
        os: ['win32', 'darwin', 'linux'],
        command: 'code',
        darwinAppName: 'Visual Studio Code.app',
        settingsPaths: {
            win32: '%APPDATA%\\Code',
            darwin: '~/Library/Application Support/Code',
            linux: '~/.config/Code',
        },
        files: {
            win32: ['%APPDATA%\\Code\\User\\mcp.json'],
            darwin: ['~/Library/Application Support/Code/User/mcp.json'],
            linux: ['~/.config/Code/User/mcp.json'],
        },
    },
    {
        id: 'cursor',
        label: 'Cursor',
        os: ['win32', 'darwin', 'linux'],
        command: 'cursor',
        darwinAppName: 'Cursor.app',
        settingsPaths: {
            win32: '%APPDATA%\\Cursor',
            darwin: '~/Library/Application Support/Cursor',
            linux: '~/.config/Cursor',
        },
        files: {
            win32: ['%USERPROFILE%\\.cursor\\mcp.json'],
            darwin: ['~/.cursor/mcp.json'],
            linux: ['~/.cursor/mcp.json'],
        },
    },
    {
        id: 'antigravity',
        label: 'Antigravity',
        os: ['win32', 'darwin', 'linux'],
        command: 'antigravity',
        darwinAppName: 'Antigravity.app',
        settingsPaths: {
            win32: '%APPDATA%\\Antigravity\\User',
            darwin: '~/Library/Application Support/Antigravity/User',
            linux: '~/.config/Antigravity/User',
        },
        files: {
            win32: ['%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json', '%USERPROFILE%\\.gemini\\GEMINI.md'],
            darwin: ['~/.gemini/antigravity/mcp_config.json', '~/.gemini/GEMINI.md'],
            linux: ['~/.gemini/antigravity/mcp_config.json', '~/.gemini/GEMINI.md'],
        },
    },
    {
        id: 'voideditor',
        label: 'Void Editor',
        os: ['win32', 'darwin', 'linux'],
        command: 'void',
        darwinAppName: 'Void.app',
        settingsPaths: {
            win32: '%APPDATA%\\Void',
            darwin: '~/Library/Application Support/Void',
            linux: '~/.config/Void',
        },
    },
];

// Config app definitions
export const CONFIG_APP_DEFS: ConfigAppDef[] = [
    {
        id: 'bash_rc',
        label: 'Bash',
        os: ['darwin', 'linux'],
        files: {
            darwin: ['~/.bashrc', '~/.bash_profile'],
            linux: ['~/.bashrc', '~/.bash_profile'],
        },
    },
    {
        id: 'zsh_rc',
        label: 'Zsh',
        os: ['darwin', 'linux'],
        files: {
            darwin: ['~/.zshrc', '~/.zshenv', '~/.zprofile'],
            linux: ['~/.zshrc', '~/.zshenv', '~/.zprofile'],
        },
    },
    {
        id: 'git_rc',
        label: 'Git',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.gitconfig'],
            darwin: ['~/.gitconfig'],
            linux: ['~/.gitconfig'],
        },
    },
    {
        id: 'npm_rc',
        label: 'NPM',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.npmrc'],
            darwin: ['~/.npmrc'],
            linux: ['~/.npmrc'],
        },
    },
    {
        id: 'pypi_rc',
        label: 'PyPI',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.pypirc'],
            darwin: ['~/.pypirc'],
            linux: ['~/.pypirc'],
        },
    },
    {
        id: 'wsl_rc',
        label: 'WSL',
        os: ['win32'],
        files: {
            win32: ['%USERPROFILE%\\.wslconfig'],
        },
    },
    {
        id: 'powershell_rc',
        label: 'PowerShell',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1'],
            darwin: ['~/.config/powershell/Microsoft.PowerShell_profile.ps1'],
            linux: ['~/.config/powershell/Microsoft.PowerShell_profile.ps1'],
        },
    },
    {
        id: 'claude_desktop',
        label: 'Claude Desktop',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: [
                '%APPDATA%\\Claude\\claude_desktop_config.json',
                '%APPDATA%\\Claude\\claude_desktop_config_disabled.json',
            ],
            darwin: [
                '~/Library/Application Support/Claude/claude_desktop_config.json',
                '~/Library/Application Support/Claude/claude_desktop_config_disabled.json',
            ],
            linux: [
                '~/.config/Claude/claude_desktop_config.json',
                '~/.config/Claude/claude_desktop_config_disabled.json',
            ],
        },
    },
    {
        id: 'claude_code',
        label: 'Claude Code',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.claude.json'],
            darwin: ['~/.claude.json'],
            linux: ['~/.claude.json'],
        },
    },
    {
        id: 'gemini_cli',
        label: 'Gemini CLI',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.gemini\\GEMINI.md'],
            darwin: ['~/.gemini/GEMINI.md'],
            linux: ['~/.gemini/GEMINI.md'],
        },
    },
    {
        id: 'tabby',
        label: 'Tabby Terminal',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%APPDATA%\\tabby\\config.yaml'],
            darwin: ['~/Library/Application Support/tabby/config.yaml'],
            linux: ['~/.config/tabby/config.yaml'],
        },
    },
    {
        id: 'filezilla',
        label: 'FileZilla',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%APPDATA%\\FileZilla\\filezilla.xml'],
            darwin: [
                '~/Library/Application Support/FileZilla/filezilla.xml',
                '~/Library/Containers/org.filezilla-project.filezilla.sandbox/Data/.config/filezilla/filezilla.xml',
            ],
            linux: ['~/.config/filezilla/filezilla.xml'],
        },
    },
    {
        id: 'dbgate',
        label: 'DbGate',
        os: ['win32', 'darwin', 'linux'],
        files: {
            win32: ['%USERPROFILE%\\.dbgate\\settings.json', '%USERPROFILE%\\.dbgate\\connections.jsonl'],
            darwin: ['~/.dbgate/settings.json', '~/.dbgate/connections.jsonl'],
            linux: ['~/.dbgate/settings.json', '~/.dbgate/connections.jsonl'],
        },
    },
];
