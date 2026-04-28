import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateState } from '../../shared/types';

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let currentState: UpdateState = { status: 'idle' };
let initialized = false;
let startupCheckScheduled = false;
let autoInstallOnDownloaded = false;

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
    if (initialized) return;
    initialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
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
        setState({ status: 'idle' });
    });
}

export async function checkForUpdates() {
    if (isDev) return;
    if (!initialized) return;
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        console.error('[updater] checkForUpdates failed:', err);
    }
}

export async function downloadUpdate() {
    if (isDev) return;
    if (!initialized) return;
    autoInstallOnDownloaded = true;
    try {
        await autoUpdater.downloadUpdate();
    } catch (err) {
        autoInstallOnDownloaded = false;
        console.error('[updater] downloadUpdate failed:', err);
    }
}

export function quitAndInstall() {
    if (isDev) return;
    if (!initialized) return;
    setImmediate(() => {
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) win.close();
        }
        autoUpdater.quitAndInstall(false, true);
    });
}

export function scheduleStartupCheck(window: BrowserWindow, delayMs = 3000) {
    if (isDev) return;
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
