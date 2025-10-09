import fs from 'fs';
import os from 'os';
import path from 'path';

export function ensureDirSync(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export async function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function writeJsonFile(filePath: string, data: unknown) {
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function copyFile(src: string, dest: string) {
    await ensureDir(path.dirname(dest));
    await fs.promises.copyFile(src, dest);
}

export function resolveEnvPath(pathStr: string): string {
    const platform = os.platform();
    let resolved = pathStr;

    if (platform === 'win32') {
        // Windows environment variables
        resolved = resolved.replace(/%([^%]+)%/g, (_, varName) => {
            return process.env[varName] || `%${varName}%`;
        });
    } else {
        // Unix-like environment variables
        resolved = resolved.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, varName) => {
            return process.env[varName] || `$${varName}`;
        });
        // Handle tilde expansion
        if (resolved.startsWith('~/')) {
            resolved = path.join(os.homedir(), resolved.slice(2));
        } else if (resolved === '~') {
            resolved = os.homedir();
        }
    }

    return path.normalize(resolved);
}
