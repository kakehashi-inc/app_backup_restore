import fs from 'fs';
import { app, dialog } from 'electron';
import { getAppRootDir, getCacheDir, getConfigPath } from '../../shared/constants';
import type { AppConfig } from '../../shared/types';
import { ensureDirSync, readJsonFile, writeJsonFile } from '../utils/fsx';

const DEFAULT_CONFIG: AppConfig = {
    backupDirectory: '',
};

export function ensureAppDirectories() {
    ensureDirSync(getAppRootDir());
    ensureDirSync(getCacheDir());
}

export function loadConfig(): AppConfig {
    ensureAppDirectories();
    const cfg = readJsonFile<AppConfig>(getConfigPath(), DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG, ...cfg };
}

export function saveConfig(cfg: AppConfig): AppConfig {
    ensureAppDirectories();
    writeJsonFile(getConfigPath(), cfg);
    return cfg;
}

export async function chooseBackupDirectory(current?: string): Promise<string | undefined> {
    const res = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: current && fs.existsSync(current) ? current : app.getPath('home'),
    });
    if (res.canceled || res.filePaths.length === 0) return undefined;
    return res.filePaths[0];
}
