import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    MANAGER_DEFS,
    VS_CODE_DEFS,
    CONFIG_APP_DEFS,
    VS_CODE_BACKUP_FILES,
    getManagerBackupFileName,
    getVSCodeBackupFileName,
    getConfigAppBackupFileName,
} from '../../shared/constants';
import type { ManagerId, VSCodeId, VSCodeExtensionItem } from '../../shared/types';
import { writeJsonFile, readJsonFile, copyFile } from '../utils/fsx';
import {
    listWinget,
    listMsStore,
    listScoop,
    listChocolatey,
    listHomebrew,
    listApt,
    listYum,
    listDnf,
    listPacman,
    listZypper,
    listSnap,
    listFlatpak,
    listVSCodeExtensions,
    listVSCodeExtensionsWSL,
} from './managers';

// Helper function to backup a single manager
async function backupManager(
    backupDir: string,
    manager: ManagerId,
    identifiers?: string[]
): Promise<{ written: string[] }> {
    const written: string[] = [];

    try {
        let items: any[] = [];
        let file: string;

        // Get items based on manager type
        switch (manager) {
            case 'winget':
                items = await listWinget();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                break;
            case 'msstore':
                items = await listMsStore();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                break;
            case 'scoop':
                items = await listScoop();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'chocolatey':
                items = await listChocolatey();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.PackageId));
                }
                break;
            case 'homebrew':
                items = await listHomebrew();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'apt':
                items = await listApt();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Package));
                }
                break;
            case 'yum':
                items = await listYum();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'dnf':
                items = await listDnf();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'pacman':
                items = await listPacman();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'zypper':
                items = await listZypper();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'snap':
                items = await listSnap();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            case 'flatpak':
                items = await listFlatpak();
                file = path.join(backupDir, getManagerBackupFileName(manager));
                // Filter by identifiers if provided
                if (identifiers && identifiers.length > 0) {
                    items = items.filter(i => identifiers.includes(i.Name));
                }
                break;
            default:
                throw new Error(`Unknown manager: ${manager}`);
        }

        // Write items to file
        writeJsonFile(file, items);
        written.push(file);
    } catch (error) {
        console.error(`Failed to backup ${manager}:`, error);
    }

    return { written };
}

export async function runBackup(backupDir: string, managers?: ManagerId[]): Promise<{ written: string[] }> {
    const currentOS = os.platform() as 'win32' | 'darwin' | 'linux';
    let defaultManagers: ManagerId[] = [];

    if (currentOS === 'win32') {
        defaultManagers = ['winget', 'msstore', 'scoop', 'chocolatey'];
    } else if (currentOS === 'darwin') {
        defaultManagers = ['homebrew'];
    } else if (currentOS === 'linux') {
        defaultManagers = ['apt', 'yum', 'dnf', 'pacman', 'zypper', 'snap', 'flatpak'];
    }

    const targetManagers: ManagerId[] = managers && managers.length ? managers : defaultManagers;

    const written: string[] = [];
    const successfulManagers: ManagerId[] = [];

    for (const manager of targetManagers) {
        const result = await backupManager(backupDir, manager);
        written.push(...result.written);
        if (result.written.length > 0) {
            successfulManagers.push(manager);
        }
    }

    return { written };
}

/**
 * Get the last modified date of a backup by ID.
 *
 * Specification:
 * - MANAGER_DEFS: Single file in backup root (e.g., homebrew_apps.json)
 *   Returns the file's last modified date
 *
 * - VS_CODE_DEFS & CONFIG_APP_DEFS: Multiple files in a subdirectory (e.g., vscode/)
 *   Returns the most recent last modified date among all files in the directory
 *
 * @param backupDir - Absolute path to the backup directory
 * @param id - ID of the backup (manager, VSCode, or config app)
 * @returns ISO 8601 date string of the last modified time, or null if not found
 */
export function getBackupLastModified(backupDir: string, id: string): string | null {
    // Check if ID is a package manager (single file backup)
    const managerDef = MANAGER_DEFS.find(m => m.id === id);
    if (managerDef) {
        const backupFile = path.join(backupDir, getManagerBackupFileName(managerDef.id));

        if (!fs.existsSync(backupFile)) {
            return null;
        }

        try {
            const stats = fs.statSync(backupFile);
            return stats.mtime.toISOString();
        } catch (error) {
            console.error(`Failed to get stats for ${backupFile}:`, error);
            return null;
        }
    }

    // Check if ID is VSCode or Config App (directory-based backup with multiple files)
    const isVSCode = VS_CODE_DEFS.some(v => v.id === id);
    const isConfigApp = CONFIG_APP_DEFS.some(c => c.id === id);

    if (isVSCode || isConfigApp) {
        const backupSubDir = path.join(backupDir, id);

        if (!fs.existsSync(backupSubDir) || !fs.statSync(backupSubDir).isDirectory()) {
            return null;
        }

        try {
            const files = fs.readdirSync(backupSubDir);
            let mostRecentTime = 0;
            let mostRecentDate: string | null = null;

            for (const file of files) {
                const filePath = path.join(backupSubDir, file);
                const stats = fs.statSync(filePath);

                if (stats.mtime.getTime() > mostRecentTime) {
                    mostRecentTime = stats.mtime.getTime();
                    mostRecentDate = stats.mtime.toISOString();
                }
            }

            return mostRecentDate;
        } catch (error) {
            console.error(`Failed to get stats for directory ${backupSubDir}:`, error);
            return null;
        }
    }

    // ID not found in any definition
    return null;
}

export async function runBackupSelected(
    backupDir: string,
    manager: ManagerId,
    identifiers: string[]
): Promise<{ written: string[] }> {
    const result = await backupManager(backupDir, manager, identifiers);

    return { written: result.written };
}

export function readBackupList<T = any>(backupDir: string, manager: ManagerId): T[] {
    const file = path.join(backupDir, getManagerBackupFileName(manager));
    return readJsonFile<T[]>(file, []);
}

export function readVSCodeBackupList(backupDir: string, vscodeId: VSCodeId): VSCodeExtensionItem[] {
    const file = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'extensions'));
    return readJsonFile<VSCodeExtensionItem[]>(file, []);
}

// Helper function to resolve environment paths
function resolveEnvPath(pathStr: string): string {
    const platform = os.platform();
    let resolved = pathStr;

    if (platform === 'win32') {
        resolved = resolved.replace(/%([^%]+)%/g, (_, varName) => {
            return process.env[varName] || `%${varName}%`;
        });
    } else {
        resolved = resolved.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, varName) => {
            return process.env[varName] || `$${varName}`;
        });
        if (resolved.startsWith('~/')) {
            resolved = path.join(os.homedir(), resolved.slice(2));
        } else if (resolved === '~') {
            resolved = os.homedir();
        }
    }

    return path.normalize(resolved);
}

// Backup VSCode extensions and settings
// Backup VSCode extensions and settings
export async function runBackupVSCode(
    backupDir: string,
    vscodeId: VSCodeId,
    identifiers?: string[]
): Promise<{ written: string[] }> {
    const written: string[] = [];

    try {
        // Create app directory
        const appDir = path.join(backupDir, vscodeId);
        if (!fs.existsSync(appDir)) {
            fs.mkdirSync(appDir, { recursive: true });
        }

        // Backup extensions
        const extensions = await listVSCodeExtensions(vscodeId);
        const filteredExtensions = identifiers ? extensions.filter(ext => identifiers.includes(ext.id)) : extensions;

        const extFile = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'extensions'));
        writeJsonFile(extFile, filteredExtensions);
        written.push(extFile);

        // Backup WSL extensions (Windows only)
        if (os.platform() === 'win32') {
            const wslExtensions = await listVSCodeExtensionsWSL(vscodeId);
            if (wslExtensions.length > 0) {
                const wslFile = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'extensions_wsl'));
                writeJsonFile(wslFile, wslExtensions);
                written.push(wslFile);
            }
        }

        // Backup settings and other files
        const platform = os.platform() as 'win32' | 'darwin' | 'linux';
        const vscodeDef = VS_CODE_DEFS.find(v => v.id === vscodeId);

        if (!vscodeDef) {
            console.error(`VSCode definition not found for ${vscodeId}`);
            return { written };
        }

        // Resolve settings root path (e.g., .../Code)
        // Note: settingsPaths points to the root config dir (e.g. .../Code), not User dir
        const settingsRootPath = resolveEnvPath(vscodeDef.settingsPaths[platform] || '');
        if (!settingsRootPath) {
            console.error(`Settings path not defined for ${vscodeId} on ${platform}`);
            return { written };
        }

        // 1. Backup standard VSCode files (settings.json, keybindings.json)
        const standardFiles = VS_CODE_BACKUP_FILES[platform] || [];
        for (const relativePath of standardFiles) {
            const sourcePath = path.join(settingsRootPath, relativePath);

            if (fs.existsSync(sourcePath)) {
                // Use only basename for backup destination
                const destPath = path.join(appDir, path.basename(relativePath));
                const destDir = path.dirname(destPath);

                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }

                await copyFile(sourcePath, destPath);
                written.push(destPath);
            }
        }

        // 2. Backup app-specific files defined in VSCodeDef
        const appSpecificFiles = vscodeDef.files?.[platform] || [];
        for (const filePattern of appSpecificFiles) {
            const sourcePath = resolveEnvPath(filePattern);

            if (fs.existsSync(sourcePath)) {
                // Always use basename as requested (flatten structure)
                const relativePath = path.basename(sourcePath);

                const destPath = path.join(appDir, relativePath);
                const destDir = path.dirname(destPath);

                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }

                await copyFile(sourcePath, destPath);
                written.push(destPath);
            }
        }
    } catch (error) {
        console.error(`Failed to backup ${vscodeId}:`, error);
    }

    return { written };
}

// Backup config files
export async function runBackupConfig(backupDir: string, configAppId: string): Promise<{ written: string[] }> {
    const written: string[] = [];

    try {
        const appDef = CONFIG_APP_DEFS.find(def => def.id === configAppId);
        if (!appDef) {
            throw new Error(`Unknown config app: ${configAppId}`);
        }

        // Create app directory
        const appDir = path.join(backupDir, configAppId);
        if (!fs.existsSync(appDir)) {
            fs.mkdirSync(appDir, { recursive: true });
        }

        const platform = os.platform() as 'win32' | 'darwin' | 'linux';
        const filePaths = appDef.files[platform];

        if (!filePaths || filePaths.length === 0) {
            throw new Error(`No config files defined for ${configAppId} on ${platform}`);
        }

        for (const filePath of filePaths) {
            const resolved = resolveEnvPath(filePath);
            if (fs.existsSync(resolved)) {
                const basename = path.basename(resolved);
                const dest = path.join(backupDir, getConfigAppBackupFileName(configAppId, basename));
                await copyFile(resolved, dest);
                written.push(dest);
            }
        }
    } catch (error) {
        console.error(`Failed to backup ${configAppId}:`, error);
    }

    return { written };
}

// Check if config app has any existing files
export function checkConfigAppAvailability(configAppId: string): boolean {
    const appDef = CONFIG_APP_DEFS.find(def => def.id === configAppId);
    if (!appDef) return false;

    const platform = os.platform() as 'win32' | 'darwin' | 'linux';
    const filePaths = appDef.files[platform];

    if (!filePaths || filePaths.length === 0) return false;

    // Check if at least one file exists
    for (const filePath of filePaths) {
        const resolved = resolveEnvPath(filePath);
        if (fs.existsSync(resolved)) {
            return true;
        }
    }

    return false;
}

// Check availability for all config apps
export function checkAllConfigAppsAvailability(): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    for (const appDef of CONFIG_APP_DEFS) {
        result[appDef.id] = checkConfigAppAvailability(appDef.id);
    }

    return result;
}
