export type ManagerId = 'winget' | 'msstore' | 'scoop' | 'chocolatey';

export type WingetItem = {
    PackageId: string;
    Name: string;
    Version: string;
};

export type MsStoreItem = WingetItem;

export type ScoopItem = {
    Name: string;
    Version: string;
    Source?: string;
};

export type ChocolateyItem = {
    PackageId: string;
    Title: string;
    Version: string;
};

export type PackageList = {
    winget?: WingetItem[];
    msstore?: MsStoreItem[];
    scoop?: ScoopItem[];
    chocolatey?: ChocolateyItem[];
};

export type AppConfig = {
    backupDirectory: string; // absolute path to backup root selected by user
};

export type BackupMetadata = Record<string, { last_backup: string } | undefined>;

export type DetectResult = Record<ManagerId, boolean> & { wslDetected?: boolean };

export type RestoreMode = 'execute' | 'script';

export type RestoreRequest = {
    managerId: ManagerId;
    identifiers: string[]; // list of PackageId or Name depending on manager
    versions?: Record<string, string | undefined>; // optional versions keyed by identifier
    mode: RestoreMode;
    scriptPath?: string; // when mode === 'script', optional path to write script to
};

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'ja' | 'en';

export type AppInfo = {
    name: string;
    version: string;
    language: AppLanguage;
    theme: AppTheme;
    os: 'win32' | 'darwin' | 'linux';
};

export type ManagerRow = {
    id: ManagerId;
    name: string;
    detected: boolean;
    lastBackup?: string;
};
