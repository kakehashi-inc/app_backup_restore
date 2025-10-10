import os from 'os';
import path from 'path';

import type { ManagerId, VSCodeId, ManagerDef, VSCodeDef, ConfigAppDef } from './types';

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

export function getVSCodeSettingsPath(vscodeId: VSCodeId, platform: 'win32' | 'darwin' | 'linux'): string {
    const vscode = VS_CODE_DEFS.find(v => v.id === vscodeId);
    return vscode?.settingsPaths[platform] || '';
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
    RESTORE_GENERATE_SCRIPT: 'restore:generateScript',
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

// VS Code-based IDE definitions (includes VS Code, Cursor, Void Editor)
export const VS_CODE_DEFS: readonly VSCodeDef[] = [
    {
        id: 'vscode',
        label: 'VS Code',
        os: ['win32', 'darwin', 'linux'],
        command: 'code',
        settingsPaths: {
            win32: '%APPDATA%\\Code\\User',
            darwin: '~/Library/Application Support/Code/User',
            linux: '~/.config/Code/User',
        },
    },
    {
        id: 'cursor',
        label: 'Cursor',
        os: ['win32', 'darwin', 'linux'],
        command: 'cursor',
        settingsPaths: {
            win32: '%APPDATA%\\Cursor\\User',
            darwin: '~/Library/Application Support/Cursor/User',
            linux: '~/.config/Cursor/User',
        },
    },
    {
        id: 'voideditor',
        label: 'Void Editor',
        os: ['win32', 'darwin', 'linux'],
        command: 'void',
        settingsPaths: {
            win32: '%APPDATA%\\Void\\User',
            darwin: '~/Library/Application Support/Void/User',
            linux: '~/.config/Void/User',
        },
    },
];

// Config app definitions
export const CONFIG_APP_DEFS: ConfigAppDef[] = [
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
        os: ['win32'],
        files: {
            win32: ['%USERPROFILE%\\Microsoft.PowerShell_profile.ps1'],
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
            darwin: ['~/.config/filezilla/filezilla.xml'],
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
