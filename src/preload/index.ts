import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/ipc';

// Local copy to avoid runtime import from ../shared in preload
const IPC_CHANNELS = {
    CONFIG_GET: 'config:get',
    CONFIG_SET_BACKUP_DIR: 'config:setBackupDir',
    CONFIG_CHOOSE_BACKUP_DIR: 'config:chooseBackupDir',
    DETECT_MANAGERS: 'detect:managers',
    LIST_PACKAGES: 'list:packages',
    BACKUP_RUN: 'backup:run',
    RESTORE_RUN: 'restore:run',
    TASK_PROGRESS: 'task:progress',
} as const;

const api: IpcApi = {
    async getAppInfo() {
        return ipcRenderer.invoke('app:getInfo');
    },
    async setTheme(theme) {
        return ipcRenderer.invoke('app:setTheme', theme);
    },
    async setLanguage(language) {
        return ipcRenderer.invoke('app:setLanguage', language);
    },
    async minimize() {
        return ipcRenderer.invoke('window:minimize');
    },
    async maximizeOrRestore() {
        return ipcRenderer.invoke('window:maximizeOrRestore');
    },
    async isMaximized() {
        return ipcRenderer.invoke('window:isMaximized');
    },
    async close() {
        return ipcRenderer.invoke('window:close');
    },
    async getConfig() {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET);
    },
    async setBackupDirectory(absPath: string) {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET_BACKUP_DIR, absPath);
    },
    async chooseBackupDirectory() {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_CHOOSE_BACKUP_DIR);
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
    async runRestore(req) {
        return ipcRenderer.invoke(IPC_CHANNELS.RESTORE_RUN, req);
    },
    onTaskProgress(handler) {
        const listener = (_e: unknown, message: string) => handler(message);
        ipcRenderer.on(IPC_CHANNELS.TASK_PROGRESS, listener);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TASK_PROGRESS, listener);
    },
};

contextBridge.exposeInMainWorld('abr', api);
