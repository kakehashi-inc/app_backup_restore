import os from 'os';
import path from 'path';

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

export function getCacheDir(): string {
    return path.join(getAppRootDir(), 'cache');
}

export const BACKUP_METADATA_FILENAME = 'backup_metadata.json';

export const BACKUP_FILE_NAMES = {
    winget: 'winget_packages.json',
    msstore: 'msstore_packages.json',
    scoop: 'scoop_apps.json',
    chocolatey: 'chocolatey_packages.json',
} as const;

export const IPC_CHANNELS = {
    CONFIG_GET: 'config:get',
    CONFIG_SET_BACKUP_DIR: 'config:setBackupDir',
    CONFIG_CHOOSE_BACKUP_DIR: 'config:chooseBackupDir',
    DETECT_MANAGERS: 'detect:managers',
    LIST_PACKAGES: 'list:packages',
    BACKUP_RUN: 'backup:run',
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
