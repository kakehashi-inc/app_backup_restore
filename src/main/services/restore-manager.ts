import { loadConfig } from './config';
import {
    runSequentialInstall,
    runRestoreConfig,
    generateScriptContent,
    restoreVSCodeSettings,
    buildVSCodeInstallCommand,
} from './restore';
import type { RestoreRequest, VSCodeId, VSCodeRestoreRequest } from '../../shared/types';

export class RestoreManager {
    private getBackupDirectory(): string {
        const cfg = loadConfig();
        if (!cfg.backupDirectory) {
            throw new Error('Backup directory is not set');
        }
        return cfg.backupDirectory;
    }

    // Restore operations
    async runRestore(req: RestoreRequest) {
        await runSequentialInstall(req);
    }

    async runRestoreVSCode(req: VSCodeRestoreRequest) {
        // Execute each command individually using runCommand
        const { runCommand } = await import('../utils/exec');
        for (const id of req.identifiers) {
            const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
            await runCommand(cmd, args);
        }
    }

    async runRestoreVSCodeWSL(req: VSCodeRestoreRequest) {
        // Execute each command individually using runCommandInWSL
        const { runCommandInWSL } = await import('../utils/exec');
        for (const id of req.identifiers) {
            const { cmd, args } = buildVSCodeInstallCommand(req.vscodeId, id);
            await runCommandInWSL(cmd, args);
        }
    }

    async runRestoreConfig(configAppId: string) {
        await runRestoreConfig(this.getBackupDirectory(), configAppId);
        return { success: true };
    }

    // Script generation (content only, no file creation)
    getScriptContent(req: RestoreRequest | VSCodeRestoreRequest) {
        const content = generateScriptContent(req);
        return { content };
    }

    // VSCode settings restore
    async restoreVSCodeSettings(vscodeId: VSCodeId) {
        return restoreVSCodeSettings(this.getBackupDirectory(), vscodeId);
    }
}

// Singleton instance
export const restoreManager = new RestoreManager();
