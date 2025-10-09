import type {
    AppConfig,
    ManagerId,
    RestoreRequest,
    WingetItem,
    MsStoreItem,
    ScoopItem,
    ChocolateyItem,
    DetectResult,
    AppInfo,
    AppLanguage,
    AppTheme,
    BackupMetadata,
} from './types';

export type IpcApi = {
    getConfig(): Promise<AppConfig>;
    setBackupDirectory(absPath: string): Promise<AppConfig>;
    chooseBackupDirectory(): Promise<AppConfig>;
    validateBackupDirectory?(): Promise<boolean>;
    detectManagers(): Promise<DetectResult>;
    listPackages(managerId: ManagerId): Promise<WingetItem[] | MsStoreItem[] | ScoopItem[] | ChocolateyItem[]>;
    runBackup(managers?: ManagerId[]): Promise<{ written: string[]; metadataUpdated: boolean }>;
    runBackupSelected?(
        managerId: ManagerId,
        identifiers: string[]
    ): Promise<{ written: string[]; metadataUpdated: boolean }>;
    getBackupMetadata?(): Promise<BackupMetadata>;
    runRestore(req: RestoreRequest): Promise<{ mode: 'execute' | 'script'; scriptPath?: string }>;
    onTaskProgress(handler: (message: string) => void): () => void; // returns unsubscribe
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
