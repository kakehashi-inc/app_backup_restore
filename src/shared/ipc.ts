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
    VSCodeRestoreRequest,
    RestoreConflictItem,
    UpdateState,
} from './types';

export type UpdaterApi = {
    getState(): Promise<UpdateState>;
    check(): Promise<void>;
    download(): Promise<void>;
    quitAndInstall(): Promise<void>;
    onStateChanged(handler: (state: UpdateState) => void): () => void;
};

export type IpcApi = {
    getConfig(): Promise<AppConfig>;
    setBackupDirectory(absPath: string): Promise<AppConfig>;
    chooseBackupDirectory(): Promise<AppConfig>;
    validateBackupDirectory?(): Promise<boolean>;
    detectManagers(): Promise<DetectResult>;
    checkConfigAvailability?(): Promise<Record<string, boolean>>;
    listPackages(managerId: ManagerId): Promise<WingetItem[] | MsStoreItem[] | ScoopItem[] | ChocolateyItem[]>;
    listVSCodeExtensions?(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]>;
    listVSCodeExtensionsWSL?(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]>;
    readBackupList?(managerId: ManagerId): Promise<any[]>;
    readVSCodeBackupList?(vscodeId: VSCodeId): Promise<VSCodeExtensionItem[]>;
    runBackup(managers?: ManagerId[]): Promise<{ written: string[] }>;
    runBackupSelected?(managerId: ManagerId, identifiers: string[]): Promise<{ written: string[] }>;
    runBackupVSCode?(vscodeId: VSCodeId, identifiers?: string[]): Promise<{ written: string[] }>;
    runBackupConfig?(configAppId: string): Promise<{ written: string[] }>;
    getBackupLastModified?(id: string): Promise<string | null>;
    runRestore(req: RestoreRequest): Promise<void>;
    runRestoreVSCode?(req: VSCodeRestoreRequest): Promise<void>;
    runRestoreVSCodeWSL?(req: VSCodeRestoreRequest): Promise<void>;
    getRestoreConfigConflicts?(configAppId: string): Promise<RestoreConflictItem[]>;
    runRestoreConfig?(configAppId: string, skipPaths?: string[]): Promise<{ success: boolean }>;
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
    // Auto-updater
    updater: UpdaterApi;
};

declare global {
    interface Window {
        abr: IpcApi;
    }
}
