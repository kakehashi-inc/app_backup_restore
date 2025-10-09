import { spawn } from 'child_process';
import { platform } from 'os';
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
        const child = spawn(cmd, args, {
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

export async function runCommandInWSL(
    cmd: string,
    args: string[],
    opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<ExecResult> {
    if (platform() !== 'win32') {
        throw new Error('WSL commands can only be run on Windows');
    }

    return runCommand('wsl', ['-e', cmd, ...args], opts);
}

export async function findCommand(command: string): Promise<boolean> {
    const isWin = platform() === 'win32';
    const finder = isWin ? 'where' : 'which';
    const res = await runCommand(finder, [command]);
    return res.code === 0 && res.stdout.trim() !== '';
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
        case 'wsl':
            return await findCommand('wsl');
    }

    // Check VS_CODE_DEFS
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === id);
    if (vscodeDef) {
        return await findCommand(vscodeDef.command);
    }

    return false;
}
