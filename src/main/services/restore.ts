import fs from 'fs';
import path from 'path';
import os from 'os';
import { runCommand, runCommandInWSL } from '../utils/exec';
import { copyFile, resolveEnvPath } from '../utils/fsx';
import {
    CONFIG_APP_DEFS,
    VS_CODE_DEFS,
    getVSCodeSettingsPath,
    getVSCodeBackupFileName,
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
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === vscodeId);
    if (!vscodeDef) {
        throw new Error(`Unknown VSCode ID: ${vscodeId}`);
    }

    const command = vscodeDef.command;
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
                // TODO: Add confirmation dialog for overwrite
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
    const settingsDir = path.join(resolveEnvPath(getVSCodeSettingsPath(vscodeId, platform)), 'User');

    // Restore settings.json
    const settingsBackup = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'settings'));
    if (fs.existsSync(settingsBackup)) {
        const settingsTarget = path.join(settingsDir, 'settings.json');
        await copyFile(settingsBackup, settingsTarget);
    }

    // Restore keybindings.json
    const keybindingsBackup = path.join(backupDir, getVSCodeBackupFileName(vscodeId, 'keybindings'));
    if (fs.existsSync(keybindingsBackup)) {
        const keybindingsTarget = path.join(settingsDir, 'keybindings.json');
        await copyFile(keybindingsBackup, keybindingsTarget);
    }
}
