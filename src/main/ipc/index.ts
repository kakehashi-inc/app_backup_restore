import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { chooseBackupDirectory, loadConfig, saveConfig, validateBackupDirectory } from '../services/config';
import { backupManager } from '../services/backup-manager';
import { restoreManager } from '../services/restore-manager';
import type { ManagerId, RestoreRequest, VSCodeId, VSCodeRestoreRequest } from '../../shared/types';

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

    ipcMain.handle(IPC_CHANNELS.DETECT_MANAGERS, async () => backupManager.detectManagers());

    ipcMain.handle(IPC_CHANNELS.CHECK_CONFIG_AVAILABILITY, async () => backupManager.checkConfigAvailability());

    ipcMain.handle(IPC_CHANNELS.LIST_PACKAGES, async (_e, managerId: ManagerId) => {
        return backupManager.listPackages(managerId);
    });

    ipcMain.handle(IPC_CHANNELS.LIST_VSCODE_EXTENSIONS, async (_e, vscodeId: VSCodeId) => {
        return backupManager.listVSCodeExtensions(vscodeId);
    });

    ipcMain.handle(IPC_CHANNELS.LIST_VSCODE_EXTENSIONS_WSL, async (_e, vscodeId: VSCodeId) => {
        return backupManager.listVSCodeExtensionsWSL(vscodeId);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN, async (_e, managers?: ManagerId[]) => {
        return backupManager.runBackup(managers);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_GET_LAST_MODIFIED, async (_e, id: string) => {
        return backupManager.getBackupLastModified(id);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_READ_LIST, async (_e, manager: ManagerId) => {
        return backupManager.readBackupList(manager);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_READ_VSCODE_LIST, async (_e, vscodeId: VSCodeId) => {
        return backupManager.readVSCodeBackupList(vscodeId);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN_SELECTED, async (_e, manager: ManagerId, identifiers: string[]) => {
        return backupManager.runBackupSelected(manager, identifiers);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_RUN, async (_e, req: RestoreRequest) => {
        return restoreManager.runRestore(req);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN_VSCODE, async (_e, vscodeId: VSCodeId, identifiers?: string[]) => {
        return backupManager.runBackupVSCode(vscodeId, identifiers);
    });

    ipcMain.handle(IPC_CHANNELS.BACKUP_RUN_CONFIG, async (_e, configAppId: string) => {
        return backupManager.runBackupConfig(configAppId);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_RUN_VSCODE, async (_e, req: VSCodeRestoreRequest) => {
        return restoreManager.runRestoreVSCode(req);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_RUN_VSCODE_WSL, async (_e, req: VSCodeRestoreRequest) => {
        return restoreManager.runRestoreVSCodeWSL(req);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_RUN_CONFIG, async (_e, configAppId: string) => {
        return restoreManager.runRestoreConfig(configAppId);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_GET_SCRIPT_CONTENT, async (_e, req: RestoreRequest | VSCodeRestoreRequest) => {
        return restoreManager.getScriptContent(req);
    });

    ipcMain.handle(IPC_CHANNELS.RESTORE_VSCODE_SETTINGS, async (_e, vscodeId: VSCodeId) => {
        return restoreManager.restoreVSCodeSettings(vscodeId);
    });
}
