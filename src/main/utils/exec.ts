import { spawn } from 'child_process';
import { platform } from 'os';

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

export async function isCommandAvailable(command: string): Promise<boolean> {
    // On Windows, rely on where.exe; on POSIX, which
    const isWin = platform() === 'win32';
    const finder = isWin ? 'where' : 'which';
    const res = await runCommand(finder, [command]);
    if (res.code !== 0 || !res.stdout.trim()) return false;

    // Special handling for scoop similar to Python script
    if (isWin && command === 'scoop') {
        const ps = await runCommand('powershell', ['-Command', 'scoop --version'], {});
        return ps.code === 0;
    }
    return true;
}
