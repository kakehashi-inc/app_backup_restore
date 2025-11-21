import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/ipc';
import type { VSCodeId } from '../shared/types';

// Local copy to avoid runtime import from ../shared in preload
const IPC_CHANNELS = {
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
    DIALOG_CONFIRM: 'dialog:confirm',
    MAIN_CONSOLE: 'main:console',
} as const;

const api: IpcApi = {
    async getConfig() {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET);
    },
    async setBackupDirectory(absPath: string) {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET_BACKUP_DIR, absPath);
    },
    async chooseBackupDirectory() {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_CHOOSE_BACKUP_DIR);
    },
    async validateBackupDirectory() {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_VALIDATE_BACKUP_DIR);
    },
    async detectManagers() {
        return ipcRenderer.invoke(IPC_CHANNELS.DETECT_MANAGERS);
    },
    async checkConfigAvailability() {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.CHECK_CONFIG_AVAILABILITY);
    },
    async listPackages(managerId) {
        return ipcRenderer.invoke(IPC_CHANNELS.LIST_PACKAGES, managerId);
    },
    async listVSCodeExtensions(vscodeId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.LIST_VSCODE_EXTENSIONS, vscodeId);
    },
    async listVSCodeExtensionsWSL(vscodeId: VSCodeId) {
        return ipcRenderer.invoke(IPC_CHANNELS.LIST_VSCODE_EXTENSIONS_WSL, vscodeId);
    },
    async readBackupList(managerId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_READ_LIST, managerId);
    },
    async readVSCodeBackupList(vscodeId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_READ_VSCODE_LIST, vscodeId);
    },
    async runBackup(managers) {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN, managers);
    },
    async runBackupSelected(managerId, identifiers) {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN_SELECTED, managerId, identifiers);
    },
    async getBackupLastModified(id: string) {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_GET_LAST_MODIFIED, id);
    },
    async runRestore(req) {
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN, req);
    },
    async runBackupVSCode(vscodeId, identifiers) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN_VSCODE, vscodeId, identifiers);
    },
    async runBackupConfig(configAppId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN_CONFIG, configAppId);
    },
    async runRestoreVSCode(req) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN_VSCODE, req);
    },
    async runRestoreVSCodeWSL(req) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN_VSCODE_WSL, req);
    },
    async runRestoreConfig(configAppId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN_CONFIG, configAppId);
    },
    async getScriptContent(req) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_GET_SCRIPT_CONTENT, req);
    },
    async restoreVSCodeSettings(vscodeId) {
        // @ts-ignore widen api
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_VSCODE_SETTINGS, vscodeId);
    },
    onTaskProgress(handler) {
        const listener = (_e: unknown, message: string) => handler(message);
        ipcRenderer.on(IPC_CHANNELS.TASK_PROGRESS, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TASK_PROGRESS, listener);
    },
    async getAppInfo() {
        return ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO);
    },
    async setTheme(theme) {
        return ipcRenderer.invoke(IPC_CHANNELS.APP_SET_THEME, theme);
    },
    async setLanguage(language) {
        return ipcRenderer.invoke(IPC_CHANNELS.APP_SET_LANGUAGE, language);
    },
    async minimize() {
        return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE);
    },
    async maximizeOrRestore() {
        return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE_OR_RESTORE);
    },
    async isMaximized() {
        return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
    },
    async close() {
        return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE);
    },
};

contextBridge.exposeInMainWorld('abr', api);

// Listen for main process console messages and forward to DevTools
ipcRenderer.on(
    IPC_CHANNELS.MAIN_CONSOLE,
    (
        _event,
        data: {
            level: string;
            args: Array<{ type: string; value?: string; message?: string; stack?: string; name?: string }>;
        }
    ) => {
        const { level, args } = data;
        // Deserialize arguments for DevTools output
        const deserializedArgs = args.map(arg => {
            if (arg.type === 'error') {
                const error = new Error(arg.message || 'Unknown error');
                if (arg.stack) error.stack = arg.stack;
                if (arg.name) error.name = arg.name;
                return error;
            } else if (arg.type === 'object') {
                try {
                    return JSON.parse(arg.value || '{}');
                } catch {
                    return arg.value;
                }
            } else {
                return arg.value;
            }
        });

        // Forward to renderer console (which appears in DevTools)
        switch (level) {
            case 'log':
                console.log('[Main]', ...deserializedArgs);
                break;
            case 'error':
                console.error('[Main]', ...deserializedArgs);
                break;
            case 'warn':
                console.warn('[Main]', ...deserializedArgs);
                break;
            case 'info':
                console.info('[Main]', ...deserializedArgs);
                break;
            case 'debug':
                console.debug('[Main]', ...deserializedArgs);
                break;
            default:
                console.log('[Main]', ...deserializedArgs);
        }
    }
);
