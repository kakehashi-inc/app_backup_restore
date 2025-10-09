import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    BACKUP_METADATA_FILENAME,
    CONFIG_APP_DEFS,
    getManagerBackupFileName,
    getVSCodeBackupFileName,
    getVSCodeSettingsPath,
    getConfigAppBackupFileName,
} from '../../shared/constants';
import type { BackupMetadata, ManagerId, VSCodeId, VSCodeExtensionItem } from '../../shared/types';
import { writeJsonFile, readJsonFile, copyFile } from '../utils/fsx';
import {
    listWinget,
    listMsStore,
    listScoop,
    listChocolatey,
    listVSCodeExtensions,
    listVSCodeExtensionsWSL,
} from './managers';

// Helper function to backup a single manager
async function backupManager(
    backupDir: string,
    manager: ManagerId,
    identifiers?: string[]
): Promise<{ written: string[]; success: boolean }> {
    const written: string[] = [];
    let success = false;

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
            default:
                throw new Error(`Unknown manager: ${manager}`);
        }

        // Write items to file
        writeJsonFile(file, items);
        written.push(file);
        success = true;
    } catch (error) {
        console.error(`Failed to backup ${manager}:`, error);
    }

    return { written, success };
}

// Helper function to update metadata
function updateBackupMetadata(backupDir: string, managers: ManagerId[]): void {
    if (managers.length === 0) return;

    const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
    const metadata = readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
    const now = new Date().toISOString();

    for (const manager of managers) {
        (metadata as any)[manager] = { last_backup: now };
    }

    writeJsonFile(metadataPath, metadata);
}

export async function runBackup(
    backupDir: string,
    managers?: ManagerId[]
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const targetManagers: ManagerId[] =
        managers && managers.length ? managers : ['winget', 'msstore', 'scoop', 'chocolatey'];

    const written: string[] = [];
    const successfulManagers: ManagerId[] = [];

    for (const manager of targetManagers) {
        const result = await backupManager(backupDir, manager);
        written.push(...result.written);
        if (result.success) {
            successfulManagers.push(manager);
        }
    }

    // Update metadata only for successful backups
    updateBackupMetadata(backupDir, successfulManagers);

    return { written, metadataUpdated: successfulManagers.length > 0 };
}

export function getBackupMetadata(backupDir: string): BackupMetadata {
    const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
    return readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
}

export async function runBackupSelected(
    backupDir: string,
    manager: ManagerId,
    identifiers: string[]
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const result = await backupManager(backupDir, manager, identifiers);

    // Update metadata only if backup was successful
    if (result.success) {
        updateBackupMetadata(backupDir, [manager]);
    }

    return { written: result.written, metadataUpdated: result.success };
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
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const written: string[] = [];
    let success = false;

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
        const settingsDir = resolveEnvPath(getVSCodeSettingsPath(vscodeId, platform));

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

        success = true;
    } catch (error) {
        console.error(`Failed to backup ${vscodeId}:`, error);
    }

    // Update metadata only if backup was successful
    if (success) {
        const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
        const metadata = readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
        (metadata as any)[vscodeId] = { last_backup: new Date().toISOString() };
        writeJsonFile(metadataPath, metadata);
    }

    return { written, metadataUpdated: success };
}

// Backup config files
export async function runBackupConfig(
    backupDir: string,
    configAppId: string
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const written: string[] = [];
    let success = false;

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

        success = true;
    } catch (error) {
        console.error(`Failed to backup ${configAppId}:`, error);
    }

    // Update metadata only if backup was successful
    if (success) {
        const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
        const metadata = readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
        (metadata as any)[configAppId] = { last_backup: new Date().toISOString() };
        writeJsonFile(metadataPath, metadata);
    }

    return { written, metadataUpdated: success };
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
