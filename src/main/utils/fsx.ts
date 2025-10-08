import fs from 'fs';
import path from 'path';

export function ensureDirSync(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
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
