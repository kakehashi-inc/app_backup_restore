import type {
    AppConfig,
    ManagerId,
    RestoreRequest,
    WingetItem,
    MsStoreItem,
    ScoopItem,
    ChocolateyItem,
    VSCodeExtensionItem,
    VSCodeId,
    DetectResult,
    AppInfo,
    AppLanguage,
    AppTheme,
    BackupMetadata,
    VSCodeRestoreRequest,
} from './types';

export type IpcApi = {
    getConfig(): Promise<AppConfig>;
    setBackupDirectory(absPath: string): Promise<AppConfig>;
    chooseBackupDirectory(): Promise<AppConfig>;
    validateBackupDirectory?(): Promise<boolean>;
    detectManagers(): Promise<DetectResult>;
    checkConfigAvailability?(): Promise<Record<string, boolean>>;
    listPackages(managerId: ManagerId): Promise<WingetItem[] | MsStoreItem[] | ScoopItem[] | ChocolateyItem[]>;
    listVSCodeExtensions?(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]>;
    readBackupList?(managerId: ManagerId): Promise<any[]>;
    readVSCodeBackupList?(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]>;
    runBackup(managers?: ManagerId[]): Promise<{ written: string[]; metadataUpdated: boolean }>;
    runBackupSelected?(
        managerId: ManagerId,
        identifiers: string[]
    ): Promise<{ written: string[]; metadataUpdated: boolean }>;
    runBackupVSCode?(
        vscodeId: VSCodeId,
        identifiers?: string[]
    ): Promise<{ written: string[]; metadataUpdated: boolean }>;
    runBackupConfig?(configAppId: string): Promise<{ written: string[]; metadataUpdated: boolean }>;
    getBackupMetadata?(): Promise<BackupMetadata>;
    runRestore(req: RestoreRequest): Promise<{ mode: 'execute' | 'script'; scriptPath?: string }>;
    runRestoreVSCode?(req: VSCodeRestoreRequest): Promise<{ mode: 'execute' | 'script'; scriptPath?: string }>;
    runRestoreConfig?(configAppId: string): Promise<{ success: boolean }>;
    generateScript?(req: RestoreRequest | VSCodeRestoreRequest, outputPath?: string): Promise<{ scriptPath: string }>;
    getScriptContent?(req: RestoreRequest | VSCodeRestoreRequest): Promise<{ content: string }>;
    restoreVSCodeSettings?(vscodeId: VSCodeId): Promise<{ success: boolean }>;
    onTaskProgress(handler: (message: string | { key: string; params: Record<string, any> }) => void): () => void; // returns unsubscribe
    // App info / settings
    getAppInfo(): Promise<AppInfo>;
    setTheme(theme: AppTheme): Promise<{ theme: AppTheme }>;
    setLanguage(language: AppLanguage): Promise<{ language: AppLanguage }>;
    // Window controls
    minimize(): Promise<void>;
    maximizeOrRestore(): Promise<boolean>;
    isMaximized(): Promise<boolean>;
    close(): Promise<void>;
};

declare global {
    interface Window {
        abr: IpcApi;
    }
}
