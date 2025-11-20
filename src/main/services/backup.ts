import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    MANAGER_DEFS,
    VS_CODE_DEFS,
    CONFIG_APP_DEFS,
    getManagerBackupFileName,
    getVSCodeBackupFileName,
    getVSCodeSettingsPath,
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

export function getBackupLastModified(backupDir: string, id: string): string | null {
    let latestTime = 0;
    let latestDate: string | null = null;

    // Check package manager backup files (winget, msstore, scoop, chocolatey)
    const managerDef = MANAGER_DEFS.find(m => m.id === id);
    if (managerDef) {
        const managerFile = path.join(backupDir, getManagerBackupFileName(managerDef.id));
        if (fs.existsSync(managerFile)) {
            try {
                const stats = fs.statSync(managerFile);
                const fileTime = stats.mtime.getTime();
                if (fileTime > latestTime) {
                    latestTime = fileTime;
                    latestDate = stats.mtime.toISOString();
                }
            } catch (error) {
                console.error(`Failed to get stats for ${managerFile}:`, error);
            }
        }
    }

    // Check VSCode and config backup files (both use directory structure)
    const vscodeDef = VS_CODE_DEFS.find(v => v.id === id);
    const configDef = CONFIG_APP_DEFS.find(c => c.id === id);

    if (vscodeDef || configDef) {
        const appDir = path.join(backupDir, id);
        if (fs.existsSync(appDir) && fs.statSync(appDir).isDirectory()) {
            try {
                const files = fs.readdirSync(appDir);
                for (const file of files) {
                    const filePath = path.join(appDir, file);
                    const stats = fs.statSync(filePath);
                    const fileTime = stats.mtime.getTime();
                    if (fileTime > latestTime) {
                        latestTime = fileTime;
                        latestDate = stats.mtime.toISOString();
                    }
                }
            } catch (error) {
                console.error(`Failed to get stats for directory ${appDir}:`, error);
            }
        }
    }

    return latestDate;
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

        // Backup settings and keybindings
        const platform = os.platform() as 'win32' | 'darwin' | 'linux';
        const settingsDir = path.join(resolveEnvPath(getVSCodeSettingsPath(vscodeId, platform)), 'User');

        if (fs.existsSync(settingsDir)) {
            const settingsFile = path.join(settingsDir, 'settings.json');
            const keybindingsFile = path.join(settingsDir, 'keybindings.json');

            if (fs.existsSync(settingsFile)) {
                const destSettings = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'settings'));
                await copyFile(settingsFile, destSettings);
                written.push(destSettings);
            }

            if (fs.existsSync(keybindingsFile)) {
                const destKeybindings = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'keybindings'));
                await copyFile(keybindingsFile, destKeybindings);
                written.push(destKeybindings);
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
