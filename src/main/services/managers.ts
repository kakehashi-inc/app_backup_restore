import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { getCacheDir } from '../../shared/constants';
import type { ChocolateyItem, MsStoreItem, ScoopItem, WingetItem } from '../../shared/types';
import { isCommandAvailable, runCommand } from '../utils/exec';
import { readJsonFile, writeJsonFile } from '../utils/fsx';

// Cache for winget display names (PackageId -> display name)
type WingetCache = Record<string, { package_id: string; cached_at: string; display_name: string } | undefined>;

function getWingetCachePath(): string {
    return path.join(getCacheDir(), 'winget_cache.json');
}

function loadWingetCache(): WingetCache {
    return readJsonFile<WingetCache>(getWingetCachePath(), {});
}

function saveWingetCache(cache: WingetCache) {
    writeJsonFile(getWingetCachePath(), cache);
}

async function getWingetDisplayName(packageId: string): Promise<string> {
    const cache = loadWingetCache();
    const existing = cache[packageId];
    if (existing?.display_name) return existing.display_name;

    let displayName = '';
    try {
        const { stdout, code } = await runCommand('winget', ['show', packageId, '--disable-interactivity']);
        if (code === 0 && stdout) {
            for (const raw of stdout.split(/\r?\n/)) {
                const line = raw.trim();
                if (line.includes(`[${packageId}]`)) {
                    const before = line.split(`[${packageId}]`)[0].trim();
                    if (before.startsWith('見つかりました '))
                        displayName = before.slice('見つかりました '.length).trim();
                    else if (before.startsWith('Found ')) displayName = before.slice('Found '.length).trim();
                    else displayName = before;
                    break;
                }
            }
        }
    } catch {}
    if (!displayName) displayName = packageId.includes('.') ? packageId.split('.').pop() || packageId : packageId;

    // update cache
    cache[packageId] = { package_id: packageId, cached_at: new Date().toISOString(), display_name: displayName };
    saveWingetCache(cache);
    return displayName;
}

export async function detectManagers() {
    const [winget, scoop, choco] = await Promise.all([
        isCommandAvailable('winget'),
        isCommandAvailable('scoop'),
        isCommandAvailable('choco'),
    ]);
    return {
        winget,
        msstore: winget, // msstore listing depends on winget source
        scoop,
        chocolatey: choco,
        wslDetected: os.platform() === 'win32', // simple hint
    };
}

async function getWingetSourceApps(source: string): Promise<WingetItem[]> {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'abr-'));
    const file = path.join(tmp, 'export.json');
    try {
        const { code } = await runCommand('winget', [
            'export',
            '-s',
            source,
            '-o',
            file,
            '--disable-interactivity',
            '--include-versions',
        ]);
        if (code !== 0 || !fs.existsSync(file)) return [];
        const raw = await fs.promises.readFile(file, 'utf-8');
        const json = JSON.parse(raw) as any;
        let packages: any[] = [];
        if (Array.isArray(json?.Sources)) {
            for (const src of json.Sources) {
                if (Array.isArray(src?.Packages)) {
                    packages = src.Packages;
                    break;
                }
            }
        }

        const items: WingetItem[] = [];
        // Determine which need fetching for cache progress (not shown in UI yet)
        const cache = loadWingetCache();
        const missing = new Set<string>();
        for (const p of packages) {
            const pkgId = p?.PackageIdentifier as string | undefined;
            if (pkgId && !cache[pkgId]) missing.add(pkgId);
        }

        for (const p of packages) {
            const pkgId = p?.PackageIdentifier as string | undefined;
            const version = (p?.Version as string | undefined) || 'latest';
            if (!pkgId) continue;
            const name = await getWingetDisplayName(pkgId);
            items.push({ PackageId: pkgId, Name: name, Version: version });
        }
        return items;
    } catch {
        return [];
    } finally {
        try {
            await fs.promises.rm(tmp, { recursive: true, force: true });
        } catch {}
    }
}

export async function listWinget(): Promise<WingetItem[]> {
    return getWingetSourceApps('winget');
}

export async function listMsStore(): Promise<MsStoreItem[]> {
    return getWingetSourceApps('msstore');
}

export async function listScoop(): Promise<ScoopItem[]> {
    // powershell -Command "scoop export"
    const { stdout, code } = await runCommand('powershell', ['-Command', 'scoop export'], {});
    if (code !== 0 || !stdout) return [];
    try {
        const json = JSON.parse(stdout);
        const apps = Array.isArray(json?.apps) ? (json.apps as any[]) : [];
        return apps
            .map(a => ({ Name: a?.Name ?? '', Version: a?.Version ?? 'latest', Source: a?.Source ?? undefined }))
            .filter(a => a.Name);
    } catch {
        return [];
    }
}

export async function listChocolatey(): Promise<ChocolateyItem[]> {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'abr-choco-'));
    const file = path.join(tmp, 'export.config');
    try {
        const { code } = await runCommand('choco', ['export', file, '--include-version-numbers'], {});
        if (code !== 0 || !fs.existsSync(file)) return [];
        const xml = await fs.promises.readFile(file, 'utf-8');
        const parsed = await parseStringPromise(xml, { explicitArray: true, explicitRoot: false });
        // The XML may be <packages><package id=".." version=".." /></packages>
        const packages = ([] as any[]).concat(parsed?.package || parsed?.packages?.[0]?.package || []);
        const items: ChocolateyItem[] = [];
        for (const p of packages) {
            const attrs = p.$ || p['$'] || {};
            const id = attrs.id as string | undefined;
            const version = (attrs.version as string | undefined) || 'latest';
            if (id && !id.startsWith('chocolatey')) items.push({ PackageId: id, Title: id, Version: version });
        }
        return items;
    } catch {
        return [];
    } finally {
        try {
            await fs.promises.rm(tmp, { recursive: true, force: true });
        } catch {}
    }
}
