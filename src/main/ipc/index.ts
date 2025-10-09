import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { chooseBackupDirectory, loadConfig, saveConfig, validateBackupDirectory } from '../services/config';
import { detectManagers, listChocolatey, listMsStore, listScoop, listWinget } from '../services/managers';
import { runBackup, getBackupMetadata, runBackupSelected, readBackupList } from '../services/backup';
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

    ipcMain.handle(IPC_CHANNELS.CONFIG_VALIDATE_BACKUP_DIR, async () => validateBackupDirectory());

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

    ipcMain.handle(IPC_CHANNELS.BACKUP_GET_METADATA, async () => {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) return {};
        return getBackupMetadata(cfg.backupDirectory);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_READ_LIST, async (_e, manager: ManagerId) => {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) return [];
        return readBackupList(cfg.backupDirectory, manager);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN_SELECTED, async (_e, manager: ManagerId, identifiers: string[]) => {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) throw new Error('Backup directory is not set');
        return runBackupSelected(cfg.backupDirectory, manager, identifiers);
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
