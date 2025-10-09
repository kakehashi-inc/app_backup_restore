import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/ipc';

// Local copy to avoid runtime import from ../shared in preload
const IPC_CHANNELS = {
    CONFIG_GET: 'config:get',
    CONFIG_SET_BACKUP_DIR: 'config:setBackupDir',
    CONFIG_CHOOSE_BACKUP_DIR: 'config:chooseBackupDir',
    CONFIG_VALIDATE_BACKUP_DIR: 'config:validateBackupDir',
    DETECT_MANAGERS: 'detect:managers',
    LIST_PACKAGES: 'list:packages',
    BACKUP_RUN: 'backup:run',
    BACKUP_RUN_SELECTED: 'backup:runSelected',
    BACKUP_GET_METADATA: 'backup:getMetadata',
    RESTORE_RUN: 'restore:run',
    TASK_PROGRESS: 'task:progress',
    APP_GET_INFO: 'app:getInfo',
    APP_SET_THEME: 'app:setTheme',
    APP_SET_LANGUAGE: 'app:setLanguage',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE_OR_RESTORE: 'window:maximizeOrRestore',
    WINDOW_CLOSE: 'window:close',
    WINDOW_IS_MAXIMIZED: 'window:isMaximized',
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
    async listPackages(managerId) {
        return ipcRenderer.invoke(IPC_CHANNELS.LIST_PACKAGES, managerId);
    },
    async runBackup(managers) {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN, managers);
    },
    async runBackupSelected(managerId, identifiers) {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RUN_SELECTED, managerId, identifiers);
    },
    async getBackupMetadata() {
        return ipcRenderer.invoke(IPC_CHANNELS.BACKUP_GET_METADATA);
    },
    async runRestore(req) {
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN, req);
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
