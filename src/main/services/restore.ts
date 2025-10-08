import fs from 'fs';
import path from 'path';
import os from 'os';
import { runCommand } from '../utils/exec';
import type { ManagerId, RestoreRequest } from '../../shared/types';

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
