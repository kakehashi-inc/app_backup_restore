import fs from 'fs';
import { app, dialog, nativeTheme } from 'electron';
import { getAppRootDir, getConfigPath } from '../../shared/constants';
import type { AppConfig } from '../../shared/types';
import { ensureDirSync, readJsonFile, writeJsonFile } from '../utils/fsx';

const DEFAULT_CONFIG: AppConfig = {
    backupDirectory: '',
    language: 'en', // fallback to English
    darkMode: false, // fallback to light mode
};

export function ensureAppDirectories() {
    ensureDirSync(getAppRootDir());
}

/**
 * Detect OS language from system locale
 */
function detectOSLanguage(): string {
    try {
        const locale = app.getLocale();
        // Convert locale to language code (e.g., 'ja-JP' -> 'ja', 'en-US' -> 'en')
        const language = locale.split('-')[0].toLowerCase();

        // Support Japanese and English
        if (language === 'ja') {
            return 'ja';
        }
        return 'en'; // fallback to English
    } catch (error) {
        console.warn('Failed to detect OS language:', error);
        return 'en'; // fallback to English
    }
}

/**
 * Detect OS dark mode preference
 */
function detectOSDarkMode(): boolean {
    try {
        return nativeTheme.shouldUseDarkColors;
    } catch (error) {
        console.warn('Failed to detect OS dark mode:', error);
        return false; // fallback to light mode
    }
}

export function loadConfig(): AppConfig {
    ensureAppDirectories();
    const cfg = readJsonFile<AppConfig>(getConfigPath(), DEFAULT_CONFIG);
    const mergedConfig = { ...DEFAULT_CONFIG, ...cfg };

    // Check if this is the first time or if language/darkMode are not set
    const isFirstTime = !cfg.language || cfg.darkMode === undefined;

    if (isFirstTime) {
        // Detect OS settings for first-time setup
        const detectedLanguage = detectOSLanguage();
        const detectedDarkMode = detectOSDarkMode();

        // Update config with detected values
        mergedConfig.language = detectedLanguage;
        mergedConfig.darkMode = detectedDarkMode;

        // Save the updated config
        writeJsonFile(getConfigPath(), mergedConfig);

        console.log(`First-time setup: detected language=${detectedLanguage}, darkMode=${detectedDarkMode}`);
    }

    return mergedConfig;
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

export function validateBackupDirectory(): boolean {
    const cfg = loadConfig();
    if (!cfg.backupDirectory) return false;
    try {
        const stat = fs.statSync(cfg.backupDirectory);
        return stat.isDirectory();
    } catch {
        return false;
    }
}
