import { loadConfig } from './config';
import {
    runSequentialInstall,
    runSequentialVSCodeInstall,
    runSequentialVSCodeInstallWSL,
    runRestoreConfig,
    writeInstallScript,
    writeVSCodeInstallScript,
    generateScript,
    generateScriptContent,
    restoreVSCodeSettings,
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
        if (req.mode === 'execute') {
            await runSequentialInstall(req);
            return { mode: 'execute' as const };
        }
        const scriptPath = await writeInstallScript(req, req.scriptPath);
        return { mode: 'script' as const, scriptPath };
    }

    async runRestoreVSCode(req: VSCodeRestoreRequest) {
        if (req.mode === 'execute') {
            await runSequentialVSCodeInstall(req);
            return { mode: 'execute' as const };
        }
        const scriptPath = await writeVSCodeInstallScript(req, req.scriptPath);
        return { mode: 'script' as const, scriptPath };
    }

    async runRestoreVSCodeWSL(req: VSCodeRestoreRequest) {
        if (req.mode === 'execute') {
            await runSequentialVSCodeInstallWSL(req);
            return { mode: 'execute' as const };
        }
        const scriptPath = await writeVSCodeInstallScript(req, req.scriptPath);
        return { mode: 'script' as const, scriptPath };
    }

    async runRestoreConfig(configAppId: string) {
        await runRestoreConfig(this.getBackupDirectory(), configAppId);
        return { success: true };
    }

    // Script generation
    async generateScript(req: RestoreRequest | VSCodeRestoreRequest, outputPath?: string) {
        const scriptPath = await generateScript(req, outputPath);
        return { scriptPath };
    }

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
