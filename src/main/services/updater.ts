import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateState } from '../../shared/types';

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
// When running as a Windows portable build, electron-builder sets PORTABLE_EXECUTABLE_FILE.
// Skip auto-updater entirely in that mode to avoid downloading the NSIS installer
// and silently installing the regular build to an unintended location.
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;

let currentState: UpdateState = { status: 'idle' };
let initialized = false;
let startupCheckScheduled = false;
let autoInstallOnDownloaded = false;
// True only between a user-initiated downloadUpdate() start and its completion/failure.
// autoUpdater.on('error') is global: startup/background check failures (offline, etc.)
// and download failures all land in the same handler. This flag lets the error handler
// surface an error to the UI only when the user actually requested a download, and stay
// silent for background check failures.
let downloadRequested = false;
// True from quitAndInstall() until the process exits. While installing, the updater owns the
// quit/relaunch sequence, so the window-all-closed handler must not call app.quit() and race it.
let installing = false;

function broadcast(state: UpdateState) {
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, state);
        }
    }
}

function setState(next: UpdateState, options: { broadcast: boolean } = { broadcast: true }) {
    currentState = next;
    if (options.broadcast) broadcast(next);
}

export function getUpdateState(): UpdateState {
    return currentState;
}

export function initializeUpdater() {
    if (isDev) return;
    if (isPortable) return;
    if (initialized) return;
    initialized = true;

    autoUpdater.autoDownload = false;
    // Must stay true on macOS: it makes MacUpdater stage the downloaded update into the
    // native Squirrel updater right after the download finishes (synchronous handoff). With
    // false, staging is deferred until quitAndInstall and runs asynchronously, racing the
    // app's own quit sequence so the process can exit before the update is applied.
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => {
        // Internal-only: do not broadcast.
        setState({ status: 'checking' }, { broadcast: false });
    });

    autoUpdater.on('update-available', info => {
        setState({ status: 'available', version: info?.version });
    });

    autoUpdater.on('update-not-available', () => {
        // Silent: keep UI quiet when no update is available.
        setState({ status: 'not-available' }, { broadcast: false });
    });

    autoUpdater.on('download-progress', progress => {
        setState({
            status: 'downloading',
            version: currentState.version,
            progress: typeof progress?.percent === 'number' ? progress.percent : 0,
        });
    });

    autoUpdater.on('update-downloaded', info => {
        downloadRequested = false;
        setState({ status: 'downloaded', version: info?.version ?? currentState.version });
        if (autoInstallOnDownloaded) {
            setTimeout(() => {
                quitAndInstall();
            }, 1500);
        }
    });

    autoUpdater.on('error', err => {
        console.error('[updater] error:', err);
        autoInstallOnDownloaded = false;
        if (downloadRequested) {
            // Failure during a user-initiated download: surface it so the UI can offer retry/close.
            downloadRequested = false;
            setState({
                status: 'error',
                version: currentState.version,
                error: err?.message ?? String(err),
            });
        } else {
            // Background/startup check failure (offline, etc.): stay quiet and return to idle.
            setState({ status: 'idle' });
        }
    });
}

export async function checkForUpdates() {
    if (isDev) return;
    if (isPortable) return;
    if (!initialized) return;
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        console.error('[updater] checkForUpdates failed:', err);
    }
}

export async function downloadUpdate() {
    if (isDev) return;
    if (isPortable) return;
    if (!initialized) return;
    autoInstallOnDownloaded = true;
    downloadRequested = true;
    // Reflect the download start immediately so the UI shows a progress bar even before
    // the first 'download-progress' event arrives.
    setState({ status: 'downloading', version: currentState.version, progress: 0 });
    try {
        await autoUpdater.downloadUpdate();
    } catch (err) {
        // downloadUpdate() may reject directly, or the global 'error' handler may have
        // already surfaced the failure. Only emit an error state here if it has not.
        autoInstallOnDownloaded = false;
        console.error('[updater] downloadUpdate failed:', err);
        if (downloadRequested) {
            downloadRequested = false;
            setState({
                status: 'error',
                version: currentState.version,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}

export function isUpdateInstalling(): boolean {
    return installing;
}

export function quitAndInstall() {
    if (isDev) return;
    if (isPortable) return;
    if (!initialized) return;
    installing = true;
    // Do NOT close windows here. On macOS, closing windows fires window-all-closed -> app.quit(),
    // which can terminate the process before Squirrel finishes installing. Let the updater drive
    // the quit and relaunch itself; window-all-closed is suppressed via isUpdateInstalling().
    autoUpdater.quitAndInstall(false, true);
}

export function scheduleStartupCheck(window: BrowserWindow, delayMs = 3000) {
    if (isDev) return;
    if (isPortable) return;
    if (startupCheckScheduled) return;
    startupCheckScheduled = true;

    const run = () => {
        setTimeout(() => {
            checkForUpdates();
        }, delayMs);
    };

    if (window.webContents.isLoading()) {
        window.webContents.once('did-finish-load', run);
    } else {
        run();
    }
}
