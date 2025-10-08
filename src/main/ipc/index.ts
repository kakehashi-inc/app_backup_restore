import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { chooseBackupDirectory, loadConfig, saveConfig } from '../services/config';
import { detectManagers, listChocolatey, listMsStore, listScoop, listWinget } from '../services/managers';
import { runBackup } from '../services/backup';
import { runSequentialInstall, writeInstallScript } from '../services/restore';
import type { ManagerId, RestoreRequest } from '../../shared/types';

export function registerIpcHandlers() {
    ipcMain.handle(IPC_CHANNELS.CONFIG_GET, async () => {
        return loadConfig();
    });

    ipcMain.handle(IPC_CHANNELS.CONFIG_SET_BACKUP_DIR, async (_e, absPath: string) => {
        const cfg = loadConfig();
        cfg.backupDirectory = absPath;
        return saveConfig(cfg);
    });

    ipcMain.handle(IPC_CHANNELS.CONFIG_CHOOSE_BACKUP_DIR, async () => {
        const cfg = loadConfig();
        const chosen = await chooseBackupDirectory(cfg.backupDirectory);
        if (!chosen) return cfg;
        cfg.backupDirectory = chosen;
        return saveConfig(cfg);
    });

    ipcMain.handle(IPC_CHANNELS.DETECT_MANAGERS, async () => detectManagers());

    ipcMain.handle(IPC_CHANNELS.LIST_PACKAGES, async (_e, managerId: ManagerId) => {
        switch (managerId) {
            case 'winget':
                return listWinget();
            case 'msstore':
                return listMsStore();
            case 'scoop':
                return listScoop();
            case 'chocolatey':
                return listChocolatey();
        }
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN, async (_e, managers?: ManagerId[]) => {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) throw new Error('Backup directory is not set');
        return runBackup(cfg.backupDirectory, managers);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_RUN, async (_e, req: RestoreRequest) => {
        if (req.mode === 'execute') {
            await runSequentialInstall(req);
            return { mode: 'execute' as const };
        }
        const scriptPath = await writeInstallScript(req, req.scriptPath);
        return { mode: 'script' as const, scriptPath };
    });
}
