import { spawn } from 'child_process';
import { platform } from 'os';
import fs from 'fs';
import path from 'path';
import { VS_CODE_DEFS } from '../../shared/constants';

export type ExecResult = {
    stdout: string;
    stderr: string;
    code: number | null;
};

export function runCommand(
    cmd: string,
    args: string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> {
    return new Promise(resolve => {
        const isWin = platform() === 'win32';
        const isMac = platform() === 'darwin';

        if (isWin) {
            // On Windows, always use PowerShell for consistent execution
            const psCommand = `& '${cmd}' ${args.map(arg => `'${arg}'`).join(' ')}`.trim();
            const child = spawn('powershell', ['-Command', psCommand], {
                cwd: opts.cwd,
                env: { ...process.env, ...opts.env },
                shell: false,
                windowsHide: true,
            });

            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', d => (stdout += d.toString()));
            child.stderr?.on('data', d => (stderr += d.toString()));
            child.on('close', code => resolve({ stdout, stderr, code }));
            child.on('error', err => resolve({ stdout, stderr: String(err), code: 1 }));
        } else if (isMac) {
            // On macOS, use zsh to execute commands
            // This ensures shell environment variables (PATH from .zshrc, etc.) are maintained
            // Escape arguments properly for shell execution
            const escapedArgs = args.map(arg => {
                // Escape single quotes by replacing ' with '\''
                const escaped = arg.replace(/'/g, "'\\''");
                return `'${escaped}'`;
            });
            const zshCommand = `'${cmd}' ${escapedArgs.join(' ')}`.trim();
            const child = spawn('/bin/zsh', ['-c', zshCommand], {
                cwd: opts.cwd,
                env: { ...process.env, ...opts.env },
                shell: false,
            });

            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', d => (stdout += d.toString()));
            child.stderr?.on('data', d => (stderr += d.toString()));
            child.on('close', code => resolve({ stdout, stderr, code }));
            child.on('error', err => resolve({ stdout, stderr: String(err), code: 1 }));
        } else {
            // On Unix-like systems, use direct execution
            const child = spawn(cmd, args, {
                cwd: opts.cwd,
                env: { ...process.env, ...opts.env },
                shell: false,
            });

            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', d => (stdout += d.toString()));
            child.stderr?.on('data', d => (stderr += d.toString()));
            child.on('close', code => resolve({ stdout, stderr, code }));
            child.on('error', err => resolve({ stdout, stderr: String(err), code: 1 }));
        }
    });
}

export async function runCommandInWSL(
    cmd: string,
    args: string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> {
    if (platform() !== 'win32') {
        throw new Error('WSL commands can only be run on Windows');
    }

    // Use 'wsl --' format to run commands in WSL's default shell
    return new Promise(resolve => {
        const child = spawn('wsl', ['--', cmd, ...args], {
            cwd: opts.cwd,
            env: { ...process.env, ...opts.env },
            shell: false,
            windowsHide: true,
        });

        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', d => (stdout += d.toString()));
        child.stderr?.on('data', d => (stderr += d.toString()));
        child.on('close', code => resolve({ stdout, stderr, code }));
        child.on('error', err => resolve({ stdout, stderr: String(err), code: 1 }));
    });
}

export async function findCommand(command: string): Promise<boolean> {
    const isWin = platform() === 'win32';
    if (isWin) {
        // On Windows, use PowerShell Get-Command for consistent detection
        const psRes = await runCommand('Get-Command', [command, '-ErrorAction', 'SilentlyContinue']);
        return psRes.code === 0 && psRes.stdout.trim() !== '';
    } else {
        // On Unix-like systems, use which
        const res = await runCommand('which', [command]);
        return res.code === 0 && res.stdout.trim() !== '';
    }
}

export async function isPackageManagerAvailable(id: string): Promise<boolean> {
    // Map IDs to commands
    switch (id) {
        case 'winget':
        case 'msstore': // msstore depends on winget
            return await findCommand('winget');
        case 'scoop':
            return await findCommand('scoop');
        case 'chocolatey':
            return await findCommand('choco');
        case 'homebrew':
            return await findCommand('brew');
        case 'apt':
            return await findCommand('apt');
        case 'yum':
            return await findCommand('yum');
        case 'dnf':
            return await findCommand('dnf');
        case 'pacman':
            return await findCommand('pacman');
        case 'zypper':
            return await findCommand('zypper');
        case 'snap':
            return await findCommand('snap');
        case 'flatpak':
            return await findCommand('flatpak');
        case 'wsl':
            return await findCommand('wsl');
    }

    // Check VS_CODE_DEFS
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === id);
    if (vscodeDef) {
        if (platform() === 'darwin' && vscodeDef.darwinAppName) {
            const commandPath = resolveVSCodeCommandPath(id);
            return commandPath ? fs.existsSync(commandPath) : false;
        } else {
            return await findCommand(vscodeDef.command);
        }
    }

    return false;
}

/**
 * Resolve the executable path for a VSCode-based application.
 * On macOS, returns the path inside the app bundle without existence checks.
 * On other platforms, returns the command name.
 */
export function resolveVSCodeCommandPath(vscodeId: string): string | null {
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === vscodeId);
    if (!vscodeDef) {
        return null;
    }

    const command = vscodeDef.command;

    // On macOS, always use the executable inside the app bundle
    if (platform() === 'darwin' && vscodeDef.darwinAppName) {
        return path.join('/Applications', vscodeDef.darwinAppName, 'Contents/Resources/app/bin', command);
    }

    // Fallback to command name (may fail if not in PATH)
    return command;
}

/**
 * macOSの場合、GUIアプリとして起動すると.zshrcなどで設定した環境変数（PATHなど）が
 * 引き継がれないため、明示的にzsh -l -c envを実行して環境変数を取得・適用する。
 */
export function fixPathOnMacOS(): Promise<void> {
    return new Promise(resolve => {
        if (platform() !== 'darwin') {
            resolve();
            return;
        }

        // 開発モードの場合はすでにターミナルから起動していることが多いのでスキップしても良いが、
        // 念のため実行しても問題はない。ただし、既存の環境変数を優先するかどうかは検討が必要。
        // ここでは、PATHなどが不足している前提で、取得した値を上書き（またはマージ）する。

        const child = spawn('/bin/zsh', ['-l', '-c', 'env'], {
            detached: false,
            stdio: ['ignore', 'pipe', 'ignore'],
            env: process.env, // 既存のenvも渡しておく
        });

        let output = '';
        child.stdout.on('data', d => {
            output += d.toString();
        });

        child.on('close', code => {
            if (code === 0) {
                const lines = output.split('\n');
                for (const line of lines) {
                    const idx = line.indexOf('=');
                    if (idx > 0) {
                        const key = line.substring(0, idx);
                        const value = line.substring(idx + 1);
                        // 既存の値を上書きする
                        process.env[key] = value;
                    }
                }
                console.log('[Main] Environment variables loaded from zsh -l');
            } else {
                console.error('[Main] Failed to load environment variables from zsh -l');
            }
            resolve();
        });

        child.on('error', err => {
            console.error('[Main] Error spawning zsh to load env:', err);
            resolve();
        });
    });
}
