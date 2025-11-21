import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { BrowserWindow } from 'electron';
import { resolveVSCodeCommandPath } from '../utils/exec';
import type {
    ChocolateyItem,
    MsStoreItem,
    ScoopItem,
    WingetItem,
    HomebrewItem,
    AptItem,
    YumItem,
    PacmanItem,
    SnapItem,
    FlatpakItem,
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
    const { stdout, code } = await runCommand('scoop', ['export'], {});
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
    try {
        const command = resolveVSCodeCommandPath(vscodeId);
        if (!command) {
            console.error(`Unknown VSCode ID: ${vscodeId}`);
            return [];
        }

        const { stdout, stderr, code } = await runCommand(command, ['--list-extensions', '--show-versions']);

        if (code !== 0) {
            console.error(`Command ${command} failed with code ${code}:`, stderr);
            return [];
        }

        if (!stdout || stdout.trim() === '') {
            return [];
        }

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
    try {
        const command = resolveVSCodeCommandPath(vscodeId);
        if (!command) {
            console.error(`Unknown VSCode ID: ${vscodeId}`);
            return [];
        }

        const { stdout, stderr, code } = await runCommandInWSL(command, ['--list-extensions', '--show-versions']);

        if (code !== 0) {
            console.error(`WSL command ${command} failed with code ${code}:`, stderr);
            return [];
        }

        if (!stdout || stdout.trim() === '') {
            return [];
        }

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

// Homebrew functions
export async function listHomebrew(): Promise<HomebrewItem[]> {
    try {
        const { stdout, code } = await runCommand('brew', ['list', '--formula', '--versions']);
        if (code !== 0 || !stdout) return [];

        const items: HomebrewItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            const parts = line.trim().split(' ');
            if (parts.length >= 2) {
                const name = parts[0];
                const version = parts[1];
                items.push({ Name: name, Version: version });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// APT functions
export async function listApt(): Promise<AptItem[]> {
    try {
        const { stdout, code } = await runCommand('dpkg', ['-l']);
        if (code !== 0 || !stdout) return [];

        const items: AptItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header lines
            if (line.startsWith('Desired') || line.startsWith('||/') || line.startsWith('+++')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3 && parts[0] === 'ii') {
                const packageName = parts[1];
                const version = parts[2];
                const architecture = parts[3];
                items.push({ Package: packageName, Version: version, Architecture: architecture });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// YUM functions
export async function listYum(): Promise<YumItem[]> {
    try {
        const { stdout, code } = await runCommand('yum', ['list', 'installed']);
        if (code !== 0 || !stdout) return [];

        const items: YumItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header lines
            if (line.includes('Installed Packages') || line.includes('Loaded plugins')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const name = parts[0];
                const version = parts[1];
                const release = parts[2];
                const architecture = parts[3] || 'noarch';
                items.push({ Name: name, Version: version, Release: release, Architecture: architecture });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// DNF functions (same as YUM)
export async function listDnf(): Promise<YumItem[]> {
    try {
        const { stdout, code } = await runCommand('dnf', ['list', 'installed']);
        if (code !== 0 || !stdout) return [];

        const items: YumItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header lines
            if (line.includes('Installed Packages') || line.includes('Last metadata')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const name = parts[0];
                const version = parts[1];
                const release = parts[2];
                const architecture = parts[3] || 'noarch';
                items.push({ Name: name, Version: version, Release: release, Architecture: architecture });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// Pacman functions
export async function listPacman(): Promise<PacmanItem[]> {
    try {
        const { stdout, code } = await runCommand('pacman', ['-Q']);
        if (code !== 0 || !stdout) return [];

        const items: PacmanItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            const parts = line.trim().split(' ');
            if (parts.length >= 2) {
                const name = parts[0];
                const version = parts[1];
                items.push({ Name: name, Version: version });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// Zypper functions
export async function listZypper(): Promise<YumItem[]> {
    try {
        const { stdout, code } = await runCommand('zypper', ['se', '-i']);
        if (code !== 0 || !stdout) return [];

        const items: YumItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header lines
            if (line.includes('S | Name') || line.includes('--+--')) continue;

            const parts = line.trim().split('|');
            if (parts.length >= 4) {
                const name = parts[1].trim();
                const version = parts[2].trim();
                const architecture = parts[3].trim();
                items.push({ Name: name, Version: version, Architecture: architecture });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// Snap functions
export async function listSnap(): Promise<SnapItem[]> {
    try {
        const { stdout, code } = await runCommand('snap', ['list']);
        if (code !== 0 || !stdout) return [];

        const items: SnapItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header line
            if (line.includes('Name') && line.includes('Version')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const name = parts[0];
                const version = parts[1];
                const revision = parts[2];
                const tracking = parts[3];
                items.push({ Name: name, Version: version, Revision: revision, Tracking: tracking });
            }
        }

        return items;
    } catch {
        return [];
    }
}

// Flatpak functions
export async function listFlatpak(): Promise<FlatpakItem[]> {
    try {
        const { stdout, code } = await runCommand('flatpak', ['list', '--app']);
        if (code !== 0 || !stdout) return [];

        const items: FlatpakItem[] = [];
        const lines = stdout.trim().split('\n');

        for (const line of lines) {
            // Skip header line
            if (line.includes('Name') && line.includes('Application')) continue;

            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const name = parts[0];
                const application = parts[1];
                const version = parts[2];
                const branch = parts[3];
                const origin = parts[4];
                items.push({ Name: name, Application: application, Version: version, Branch: branch, Origin: origin });
            }
        }

        return items;
    } catch {
        return [];
    }
}
