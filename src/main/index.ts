import path from 'path';
import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron';
import { registerIpcHandlers } from './ipc/index';
import { ensureAppDirectories, loadConfig } from './services/config';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
        },
        show: false,
    });

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
        mainWindow.loadURL('http://localhost:3001');
        // Ensure DevTools are visible in development
        try {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        } catch {}
        // Keyboard shortcuts to toggle DevTools without menu
        mainWindow.webContents.on('before-input-event', (event, input) => {
            const isToggleCombo =
                (input.key?.toLowerCase?.() === 'i' && (input.control || input.meta) && input.shift) ||
                input.key === 'F12';
            if (isToggleCombo) {
                event.preventDefault();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.toggleDevTools();
                }
            }
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(async () => {
    ensureAppDirectories();
    loadConfig(); // ensure exists
    registerIpcHandlers();
    // App info & window control IPCs
    ipcMain.handle('app:getInfo', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('../../package.json');
        return {
            name: app.getName() || pkg.name || 'App Backup Restore',
            version: pkg.version || app.getVersion(),
            language: (app.getLocale().startsWith('ja') ? 'ja' : 'en') as 'ja' | 'en',
            theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
            os: process.platform as 'win32' | 'darwin' | 'linux',
        };
    });

    ipcMain.handle('app:setTheme', (_e, theme: 'light' | 'dark' | 'system') => {
        nativeTheme.themeSource = theme;
        return { theme };
    });

    ipcMain.handle('app:setLanguage', (_e, lang: 'ja' | 'en') => {
        // Persist later into config if needed
        return { language: lang };
    });

    ipcMain.handle('window:minimize', () => {
        mainWindow?.minimize();
    });
    ipcMain.handle('window:maximizeOrRestore', () => {
        if (!mainWindow) return false;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
            return false;
        }
        mainWindow.maximize();
        return true;
    });
    ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
    ipcMain.handle('window:close', () => {
        mainWindow?.close();
    });
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
