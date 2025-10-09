import { loadConfig } from './config';
import {
    runBackup,
    runBackupSelected,
    runBackupVSCode,
    runBackupConfig,
    getBackupMetadata,
    readBackupList,
    readVSCodeBackupList,
    checkAllConfigAppsAvailability,
} from './backup';
import {
    listWinget,
    listMsStore,
    listScoop,
    listChocolatey,
    listVSCodeExtensions,
    listVSCodeExtensionsWSL,
    detectManagers,
} from './managers';
import type { ManagerId, VSCodeId } from '../../shared/types';

export class BackupManager {
    private getBackupDirectory(): string {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) {
            throw new Error('Backup directory is not set');
        }
        return cfg.backupDirectory;
    }

    // Package/Extension listing
    async listPackages(managerId: ManagerId) {
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
    }

    async listVSCodeExtensions(vscodeId: VSCodeId) {
        return listVSCodeExtensions(vscodeId);
    }

    async listVSCodeExtensionsWSL(vscodeId: VSCodeId) {
        return listVSCodeExtensionsWSL(vscodeId);
    }

    // Detection
    async detectManagers() {
        return detectManagers();
    }

    async checkConfigAvailability() {
        return checkAllConfigAppsAvailability();
    }

    // Backup operations
    async runBackup(managers?: ManagerId[]) {
        return runBackup(this.getBackupDirectory(), managers);
    }

    async runBackupSelected(manager: ManagerId, identifiers: string[]) {
        return runBackupSelected(this.getBackupDirectory(), manager, identifiers);
    }

    async runBackupVSCode(vscodeId: VSCodeId, identifiers?: string[]) {
        return runBackupVSCode(this.getBackupDirectory(), vscodeId, identifiers);
    }

    async runBackupConfig(configAppId: string) {
        return runBackupConfig(this.getBackupDirectory(), configAppId);
    }

    // Metadata and list reading
    async getBackupMetadata() {
        const backupDir = this.getBackupDirectory();
        return getBackupMetadata(backupDir);
    }

    async readBackupList(manager: ManagerId) {
        const backupDir = this.getBackupDirectory();
        return readBackupList(backupDir, manager);
    }

    async readVSCodeBackupList(vscodeId: VSCodeId) {
        const backupDir = this.getBackupDirectory();
        return readVSCodeBackupList(backupDir, vscodeId);
    }
}

// Singleton instance
export const backupManager = new BackupManager();
