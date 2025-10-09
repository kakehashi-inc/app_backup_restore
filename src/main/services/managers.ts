import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { BrowserWindow } from 'electron';
import type {
    ChocolateyItem,
    MsStoreItem,
    ScoopItem,
    WingetItem,
    VSCodeExtensionItem,
    VSCodeId,
} from '../../shared/types';
import { MANAGER_DEFS, VS_CODE_DEFS } from '../../shared/constants';
import { isPackageManagerAvailable, runCommand, runCommandInWSL } from '../utils/exec';
import { readJsonFile, writeJsonFile } from '../utils/fsx';
import { loadConfig } from './config';

// Cache for winget display names (PackageId -> display name)
type WingetCache = Record<string, { package_id: string; cached_at: string; display_name: string } | undefined>;

function resolveCacheDir(): string {
    const cfg = loadConfig();
    const base = cfg.backupDirectory;
    const dir = path.join(base, '.cache');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getWingetCachePath(): string {
    return path.join(resolveCacheDir(), 'winget_cache.json');
}

function loadWingetCache(): WingetCache {
    return readJsonFile<WingetCache>(getWingetCachePath(), {});
}

function saveWingetCache(cache: WingetCache) {
    writeJsonFile(getWingetCachePath(), cache);
}

function normalizeWingetOutput(s: string): string {
    const noAnsi = s.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
    const replaced = noAnsi.replace(/\r/g, '\n');
    return replaced.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
}

function sanitizeCandidateName(text: string, packageId: string): string {
    let s = text.replace(/[\r\n]+/g, ' ');
    s = s
        .replace(/^[-—\\/|*·•\s]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    s = s.replace(/^(見つかりました|Found)\s+/i, '').trim();
    // remove trailing bracketed id if any accidently included
    s = s.replace(new RegExp(`\s*\[${packageId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\]$`), '').trim();
    return s;
}

async function getWingetDisplayName(packageId: string): Promise<string> {
    const cache = loadWingetCache();
    const existing = cache[packageId];
    if (existing?.display_name) return existing.display_name;

    let displayName = '';
    try {
        // Follow Python implementation closely: winget show <id> --disable-interactivity
        const showRes = await runCommand('winget', ['show', packageId, '--disable-interactivity']);
        if (showRes.code === 0 && showRes.stdout) {
            const stdout = normalizeWingetOutput(showRes.stdout);
            for (const raw of stdout.split(/\n/)) {
                const line = raw.trim();
                if (line.includes(`[${packageId}]`)) {
                    const before = line.split(`[${packageId}]`)[0].trim();
                    displayName = sanitizeCandidateName(before, packageId);
                    if (displayName) break;
                }
                const m1 = line.match(/^(?:Name|名前)\s*:\s*(.+)$/i);
                if (m1 && !displayName) {
                    displayName = sanitizeCandidateName(m1[1], packageId);
                }
            }
        }
        if (!displayName) {
            const searchRes = await runCommand('winget', [
                'search',
                '-e',
                '--id',
                packageId,
                '--disable-interactivity',
            ]);
            if (searchRes.code === 0 && searchRes.stdout) {
                const stdout = normalizeWingetOutput(searchRes.stdout);
                const lines = stdout
                    .split(/\n/)
                    .map(l => l.trim())
                    .filter(l => l);
                const headerRe = /^(?:Name|名前)\s+(?:Id|ID)\s+/i;
                const sepRe = /^[-=—]{2,}/;
                const dataLine = lines.find(l => l.includes(packageId) && !headerRe.test(l) && !sepRe.test(l));
                if (dataLine) {
                    const cols = dataLine.split(/\s{2,}/);
                    if (cols.length > 0) displayName = sanitizeCandidateName(cols[0], packageId);
                }
            }
        }
        if (!displayName) {
            const listRes = await runCommand('winget', ['list', '-e', '--id', packageId, '--disable-interactivity']);
            if (listRes.code === 0 && listRes.stdout) {
                const stdout = normalizeWingetOutput(listRes.stdout);
                const lines = stdout
                    .split(/\n/)
                    .map(l => l.trim())
                    .filter(l => l);
                const headerRe = /^(?:Name|名前)\s+(?:Id|ID)\s+/i;
                const sepRe = /^[-=—]{2,}/;
                const dataLine = lines.find(l => l.includes(packageId) && !headerRe.test(l) && !sepRe.test(l));
                if (dataLine) {
                    const cols = dataLine.split(/\s{2,}/);
                    if (cols.length > 0) displayName = sanitizeCandidateName(cols[0], packageId);
                }
            }
        }
    } catch {}
    if (!displayName) displayName = packageId.includes('.') ? packageId.split('.').pop() || packageId : packageId;

    cache[packageId] = { package_id: packageId, cached_at: new Date().toISOString(), display_name: displayName };
    saveWingetCache(cache);
    return displayName;
}

export async function detectManagers() {
    const currentOS = os.platform() as 'win32' | 'darwin' | 'linux';
    const results: Record<string, boolean> = {};

    // Get IDs that are available on current OS
    const availableManagerIds = MANAGER_DEFS.filter(def => def.os.includes(currentOS)).map(def => def.id);

    const availableVscodeIds = VS_CODE_DEFS.filter(def => def.os.includes(currentOS)).map(def => def.id);

    // WSL is only available on Windows
    const allIds = [...availableManagerIds, ...availableVscodeIds, ...(currentOS === 'win32' ? ['wsl'] : [])];

    // Check availability for OS-compatible IDs only
    const availabilityResults = await Promise.all(allIds.map(id => isPackageManagerAvailable(id)));

    // Map results back to IDs
    allIds.forEach((id, index) => {
        results[id] = availabilityResults[index];
    });

    return results;
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
        const total = packages.length;
        for (let i = 0; i < packages.length; i++) {
            const p = packages[i];
            const pkgId = p?.PackageIdentifier as string | undefined;
            const version = (p?.Version as string | undefined) || 'latest';
            if (!pkgId) continue;

            // Send progress update
            const progressMessage = {
                key: 'gettingDisplayNames',
                params: {
                    source,
                    current: i + 1,
                    total,
                },
            };
            const mainWindow = BrowserWindow.getFocusedWindow();
            if (mainWindow) {
                mainWindow.webContents.send('task:progress', progressMessage);
            }

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

export async function listVSCodeExtensions(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]> {
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === vscodeId);
    if (!vscodeDef) return [];

    const command = vscodeDef.command;
    if (!command) return [];

    try {
        const { stdout } = await runCommand(command, ['--list-extensions', '--show-versions']);
        const lines = stdout
            .trim()
            .split('\n')
            .filter(line => line.trim());

        const items: VSCodeExtensionItem[] = lines.map(line => {
            const match = line.match(/^(.+?)@(.+)$/);
            if (match) {
                return {
                    id: match[1],
                    version: match[2],
                };
            }
            return {
                id: line,
                version: undefined,
            };
        });

        return items;
    } catch (error) {
        console.error(`Failed to list extensions for ${vscodeId}:`, error);
        return [];
    }
}

export async function listVSCodeExtensionsWSL(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]> {
    console.log('listVSCodeExtensionsWSL called with vscodeId:', vscodeId);
    const vscodeDef = VS_CODE_DEFS.find(def => def.id === vscodeId);
    if (!vscodeDef) {
        console.log('No vscodeDef found for vscodeId:', vscodeId);
        return [];
    }

    const command = vscodeDef.command;
    if (!command) {
        console.log('No command found for vscodeId:', vscodeId);
        return [];
    }

    try {
        const { stdout, code } = await runCommandInWSL(command, ['--list-extensions', '--show-versions']);
        if (code !== 0) return [];

        const lines = stdout
            .trim()
            .split('\n')
            .filter(line => line.trim());

        const items: VSCodeExtensionItem[] = lines.map(line => {
            const match = line.match(/^(.+?)@(.+)$/);
            if (match) {
                return {
                    id: match[1],
                    version: match[2],
                };
            }
            return {
                id: line,
                version: undefined,
            };
        });

        return items;
    } catch (error) {
        console.error(`Failed to list WSL extensions for ${vscodeId}:`, error);
        return [];
    }
}
