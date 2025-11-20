import fs from 'fs';
import path from 'path';
import os from 'os';
import { runCommand, runCommandInWSL, resolveVSCodeCommandPath } from '../utils/exec';
import { copyFile, resolveEnvPath } from '../utils/fsx';
import {
    CONFIG_APP_DEFS,
    VS_CODE_DEFS,
    VS_CODE_BACKUP_FILES,
    getConfigAppBackupFileName,
} from '../../shared/constants';
import type { ManagerId, RestoreRequest, VSCodeId, VSCodeRestoreRequest } from '../../shared/types';

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

export async function writeInstallScript(req: RestoreRequest, outputPath?: string): Promise<string> {
    const isWin = os.platform() === 'win32';
    const ext = isWin ? '.ps1' : '.sh';
    const file =
        outputPath && outputPath.trim() ? outputPath : path.join(os.tmpdir(), `abr_install_${Date.now()}${ext}`);
    const lines: string[] = [];
    if (!isWin) lines.push('#!/usr/bin/env bash');
    for (const id of req.identifiers) {
        const version = req.versions?.[id];
        const { cmd, args } = buildInstallCommand(req.managerId, id, version);
        const line = [cmd, ...args].join(' ');
        lines.push(line);
    }
    await fs.promises.writeFile(file, lines.join(os.EOL), 'utf-8');
    if (!isWin) await fs.promises.chmod(file, 0o755);
    return file;
}

function buildVSCodeInstallCommand(vscodeId: VSCodeId, extensionId: string): { cmd: string; args: string[] } {
    const command = resolveVSCodeCommandPath(vscodeId);
    if (!command) {
        throw new Error(`Could not resolve command path for VSCode ID: ${vscodeId}`);
    }
    return { cmd: command, args: ['--install-extension', extensionId] };
}

export async function runSequentialVSCodeInstall(req: VSCodeRestoreRequest): Promise<void> {
    for (const id of req.identifiers) {
        const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
        await runCommand(cmd, args);
    }
}

export async function runSequentialVSCodeInstallWSL(req: VSCodeRestoreRequest): Promise<void> {
    for (const id of req.identifiers) {
        const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
        // Run through WSL
        await runCommandInWSL(cmd, args);
    }
}

export async function writeVSCodeInstallScript(req: VSCodeRestoreRequest, outputPath?: string): Promise<string> {
    const isWin = os.platform() === 'win32';
    const ext = isWin ? '.ps1' : '.sh';
    const file =
        outputPath && outputPath.trim() ? outputPath : path.join(os.tmpdir(), `abr_vscode_install_${Date.now()}${ext}`);
    const lines: string[] = [];
    if (!isWin) lines.push('#!/usr/bin/env bash');
    for (const id of req.identifiers) {
        const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
        const line = [cmd, ...args].join(' ');
        lines.push(line);
    }
    await fs.promises.writeFile(file, lines.join(os.EOL), 'utf-8');
    if (!isWin) await fs.promises.chmod(file, 0o755);
    return file;
}

export async function runRestoreConfig(backupDir: string, configAppId: string): Promise<void> {
    const appDef = CONFIG_APP_DEFS.find(def => def.id === configAppId);
    if (!appDef) {
        throw new Error(`Unknown config app: ${configAppId}`);
    }

    const platform = os.platform() as 'win32' | 'darwin' | 'linux';
    const filePaths = appDef.files[platform];

    if (!filePaths || filePaths.length === 0) {
        throw new Error(`No config files defined for ${configAppId} on ${platform}`);
    }

    for (const filePath of filePaths) {
        const resolved = resolveEnvPath(filePath);
        const basename = path.basename(resolved);
        const backupFile = path.join(backupDir, getConfigAppBackupFileName(configAppId, basename));

        if (fs.existsSync(backupFile)) {
            // Check if target file already exists
            if (fs.existsSync(resolved)) {
                console.log(`Overwriting ${resolved}`);
            }
            await copyFile(backupFile, resolved);
        }
    }
}

export async function generateScript(req: RestoreRequest | VSCodeRestoreRequest, outputPath?: string): Promise<string> {
    if ('managerId' in req) {
        return writeInstallScript(req, outputPath);
    } else {
        return writeVSCodeInstallScript(req, outputPath);
    }
}

export function generateScriptContent(req: RestoreRequest | VSCodeRestoreRequest): string {
    const lines: string[] = [];

    if ('managerId' in req) {
        // Package manager script
        for (const id of req.identifiers) {
            const version = req.versions?.[id];
            const { cmd, args } = buildInstallCommand(req.managerId, id, version);
            const line = [cmd, ...args].join(' ');
            lines.push(line);
        }
    } else {
        // VSCode extension script
        for (const id of req.identifiers) {
            const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
            const line = [cmd, ...args].join(' ');
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
