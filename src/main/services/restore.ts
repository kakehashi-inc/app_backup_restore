import fs from 'fs';
import path from 'path';
import os from 'os';
import { runCommand, resolveVSCodeCommandPath } from '../utils/exec';
import { copyFile, isDirectoryPath, resolveEnvPath } from '../utils/fsx';
import {
    CONFIG_APP_DEFS,
    VS_CODE_DEFS,
    VS_CODE_BACKUP_FILES,
    getConfigAppBackupFileName,
} from '../../shared/constants';
import type {
    ManagerId,
    RestoreRequest,
    VSCodeId,
    VSCodeRestoreRequest,
    RestoreConflictItem,
} from '../../shared/types';

function buildInstallCommand(
    manager: ManagerId,
    identifier: string,
    version?: string
): { cmd: string; args: string[] } {
    switch (manager) {
        case 'winget':
        case 'msstore':
            return { cmd: 'winget', args: ['install', identifier] };
        case 'scoop':
            return { cmd: 'scoop', args: ['install', identifier] };
        case 'chocolatey':
            return {
                cmd: 'choco',
                args: version ? ['install', identifier, '--version', version] : ['install', identifier],
            };
        case 'homebrew':
            return { cmd: 'brew', args: ['install', identifier] };
        case 'apt':
            return { cmd: 'sudo', args: ['apt', 'install', '-y', identifier] };
        case 'yum':
            return { cmd: 'sudo', args: ['yum', 'install', '-y', identifier] };
        case 'dnf':
            return { cmd: 'sudo', args: ['dnf', 'install', '-y', identifier] };
        case 'pacman':
            return { cmd: 'sudo', args: ['pacman', '-S', '--noconfirm', identifier] };
        case 'zypper':
            return { cmd: 'sudo', args: ['zypper', 'install', '-y', identifier] };
        case 'snap':
            return { cmd: 'sudo', args: ['snap', 'install', identifier] };
        case 'flatpak':
            return { cmd: 'flatpak', args: ['install', '-y', 'flathub', identifier] };
    }
}

export async function runSequentialInstall(req: RestoreRequest): Promise<void> {
    for (const id of req.identifiers) {
        const version = req.versions?.[id];
        const { cmd, args } = buildInstallCommand(req.managerId, id, version);
        await runCommand(cmd, args);
    }
}

export function buildVSCodeInstallCommand(vscodeId: VSCodeId, extensionId: string): { cmd: string; args: string[] } {
    const command = resolveVSCodeCommandPath(vscodeId);
    if (!command) {
        throw new Error(`Could not resolve command path for VSCode ID: ${vscodeId}`);
    }
    return { cmd: command, args: ['--install-extension', extensionId] };
}

/**
 * Collect files from a directory recursively.
 * Returns relative paths from the base directory.
 */
function collectFiles(dir: string, base: string = dir): string[] {
    const result: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...collectFiles(fullPath, base));
        } else {
            result.push(path.relative(base, fullPath));
        }
    }
    return result;
}

/**
 * Get file info (size and mtime) for conflict display.
 */
function getFileInfo(filePath: string): { size: number; mtime: string } {
    const stats = fs.statSync(filePath);
    return { size: stats.size, mtime: stats.mtime.toISOString() };
}

/**
 * Detect files that would conflict (already exist at target) during restore.
 */
export function getRestoreConfigConflicts(backupDir: string, configAppId: string): RestoreConflictItem[] {
    const appDef = CONFIG_APP_DEFS.find(def => def.id === configAppId);
    if (!appDef) return [];

    const platform = os.platform() as 'win32' | 'darwin' | 'linux';
    const filePaths = appDef.files[platform];
    if (!filePaths || filePaths.length === 0) return [];

    const conflicts: RestoreConflictItem[] = [];

    for (const filePath of filePaths) {
        const resolved = resolveEnvPath(filePath);
        const basename = path.basename(resolved);
        const backupSource = path.join(backupDir, getConfigAppBackupFileName(configAppId, basename));

        if (!fs.existsSync(backupSource)) continue;

        if (isDirectoryPath(filePath)) {
            // For directories, compare individual files inside
            const files = collectFiles(backupSource);
            for (const relFile of files) {
                const targetFile = path.join(resolved, relFile);
                if (fs.existsSync(targetFile)) {
                    const backupInfo = getFileInfo(path.join(backupSource, relFile));
                    const targetInfo = getFileInfo(targetFile);
                    conflicts.push({
                        filePath: path.join(basename, relFile).replace(/\\/g, '/'),
                        backupSize: backupInfo.size,
                        backupMtime: backupInfo.mtime,
                        targetSize: targetInfo.size,
                        targetMtime: targetInfo.mtime,
                    });
                }
            }
        } else {
            if (fs.existsSync(resolved)) {
                const backupInfo = getFileInfo(backupSource);
                const targetInfo = getFileInfo(resolved);
                conflicts.push({
                    filePath: basename,
                    backupSize: backupInfo.size,
                    backupMtime: backupInfo.mtime,
                    targetSize: targetInfo.size,
                    targetMtime: targetInfo.mtime,
                });
            }
        }
    }

    return conflicts;
}

/**
 * Restore config files from backup.
 * @param skipPaths - file paths (relative, as returned by getRestoreConfigConflicts) to skip
 */
export async function runRestoreConfig(
    backupDir: string,
    configAppId: string,
    skipPaths: string[] = []
): Promise<void> {
    const appDef = CONFIG_APP_DEFS.find(def => def.id === configAppId);
    if (!appDef) {
        throw new Error(`Unknown config app: ${configAppId}`);
    }

    const platform = os.platform() as 'win32' | 'darwin' | 'linux';
    const filePaths = appDef.files[platform];

    if (!filePaths || filePaths.length === 0) {
        throw new Error(`No config files defined for ${configAppId} on ${platform}`);
    }

    const skipSet = new Set(skipPaths);

    for (const filePath of filePaths) {
        const resolved = resolveEnvPath(filePath);
        const basename = path.basename(resolved);
        const backupSource = path.join(backupDir, getConfigAppBackupFileName(configAppId, basename));

        if (fs.existsSync(backupSource)) {
            if (isDirectoryPath(filePath)) {
                // For directories, copy files individually to respect skip list
                const files = collectFiles(backupSource);
                for (const relFile of files) {
                    const displayPath = path.join(basename, relFile).replace(/\\/g, '/');
                    if (skipSet.has(displayPath)) continue;

                    const src = path.join(backupSource, relFile);
                    const dest = path.join(resolved, relFile);
                    await copyFile(src, dest);
                }
            } else {
                if (skipSet.has(basename)) continue;
                await copyFile(backupSource, resolved);
            }
        }
    }
}

export function generateScriptContent(req: RestoreRequest | VSCodeRestoreRequest): string {
    const lines: string[] = [];

    if ('managerId' in req) {
        // Package manager script
        for (const id of req.identifiers) {
            const version = req.versions?.[id];
            const { cmd, args } = buildInstallCommand(req.managerId, id, version);
            let cmdStr = cmd;
            if (cmdStr.indexOf(' ') !== -1) {
                cmdStr = `'${cmdStr}'`;
            }
            const line = [cmdStr, ...args].join(' ');
            lines.push(line);
        }
    } else {
        // VSCode extension script
        for (const id of req.identifiers) {
            const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
            let cmdStr = cmd;
            if (cmdStr.indexOf(' ') !== -1) {
                cmdStr = `'${cmdStr}'`;
            }
            const line = [cmdStr, ...args].join(' ');
            lines.push(line);
        }
    }

    return lines.join('\n');
}

export async function restoreVSCodeSettings(backupDir: string, vscodeId: VSCodeId): Promise<void> {
    const platform = os.platform() as 'win32' | 'darwin' | 'linux';
    const vscodeDef = VS_CODE_DEFS.find(v => v.id === vscodeId);

    if (!vscodeDef) {
        console.error(`VSCode definition not found for ${vscodeId}`);
        return;
    }

    // Resolve settings root path (e.g., .../Code)
    const settingsRootPath = resolveEnvPath(vscodeDef.settingsPaths[platform] || '');
    if (!settingsRootPath) {
        console.error(`Settings path not defined for ${vscodeId} on ${platform}`);
        return;
    }

    const appBackupDir = path.join(backupDir, vscodeId);
    if (!fs.existsSync(appBackupDir)) {
        console.log(`No backup found for ${vscodeId} at ${appBackupDir}`);
        return;
    }

    // 1. Restore standard VSCode files (settings.json, keybindings.json)
    const standardFiles = VS_CODE_BACKUP_FILES[platform] || [];
    for (const relativePath of standardFiles) {
        // Backup files are stored with basename only
        const backupFile = path.join(appBackupDir, path.basename(relativePath));

        if (fs.existsSync(backupFile)) {
            const targetPath = path.join(settingsRootPath, relativePath);
            const targetDir = path.dirname(targetPath);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            if (fs.existsSync(targetPath)) {
                console.log(`Overwriting ${targetPath}`);
            }

            await copyFile(backupFile, targetPath);
        }
    }

    // 2. Restore app-specific files defined in VSCodeDef
    const appSpecificFiles = vscodeDef.files?.[platform] || [];
    for (const filePattern of appSpecificFiles) {
        const targetPath = resolveEnvPath(filePattern);

        // Always use basename as requested (flatten structure)
        const relativePath = path.basename(targetPath);

        const backupFile = path.join(appBackupDir, relativePath);

        if (fs.existsSync(backupFile)) {
            const targetDir = path.dirname(targetPath);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            if (fs.existsSync(targetPath)) {
                console.log(`Overwriting ${targetPath}`);
            }

            await copyFile(backupFile, targetPath);
        }
    }
}
