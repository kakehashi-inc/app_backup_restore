export type ManagerId =
    | 'winget'
    | 'msstore'
    | 'scoop'
    | 'chocolatey'
    | 'homebrew'
    | 'apt'
    | 'yum'
    | 'dnf'
    | 'pacman'
    | 'zypper'
    | 'snap'
    | 'flatpak';

export type VSCodeId = 'vscode' | 'cursor' | 'antigravity' | 'voideditor';

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

export type HomebrewItem = {
    Name: string;
    Version: string;
    InstalledOnRequest?: boolean;
};

export type AptItem = {
    Package: string;
    Version: string;
    Architecture?: string;
};

export type YumItem = {
    Name: string;
    Version: string;
    Release?: string;
    Architecture?: string;
};

export type PacmanItem = {
    Name: string;
    Version: string;
    Repository?: string;
};

export type SnapItem = {
    Name: string;
    Version: string;
    Revision?: string;
    Tracking?: string;
};

export type FlatpakItem = {
    Name: string;
    Application: string;
    Version: string;
    Branch?: string;
    Origin?: string;
};

export type VSCodeExtensionItem = {
    id: string; // Extension identifier (e.g., ms-python.python)
    version?: string;
};

export type PackageList = {
    winget?: WingetItem[];
    msstore?: MsStoreItem[];
    scoop?: ScoopItem[];
    chocolatey?: ChocolateyItem[];
    homebrew?: HomebrewItem[];
    apt?: AptItem[];
    yum?: YumItem[];
    dnf?: YumItem[];
    pacman?: PacmanItem[];
    zypper?: YumItem[];
    snap?: SnapItem[];
    flatpak?: FlatpakItem[];
};

export type AppConfig = {
    backupDirectory: string; // absolute path to backup root selected by user
    language?: string; // app language (e.g., 'ja', 'en')
    darkMode?: boolean; // dark mode enabled/disabled
};

export type DetectResult = Record<ManagerId, boolean> & { wslDetected?: boolean };

export type RestoreMode = 'execute' | 'script';

export type RestoreRequest = {
    managerId: ManagerId;
    identifiers: string[]; // list of PackageId or Name depending on manager
    versions?: Record<string, string | undefined>; // optional versions keyed by identifier
    mode: RestoreMode;
    scriptPath?: string; // when mode === 'script', optional path to write script to
};

export type VSCodeRestoreRequest = {
    vscodeId: VSCodeId;
    identifiers: string[]; // list of extension IDs
    mode: RestoreMode;
    scriptPath?: string;
};

export type ConfigRestoreRequest = {
    configAppId: string;
};

export type ManagerDef = {
    id: ManagerId;
    label: string;
    os: ('win32' | 'darwin' | 'linux')[];
};

export type VSCodeDef = {
    id: VSCodeId;
    label: string;
    command: string;
    os: ('win32' | 'darwin' | 'linux')[];
    settingsPaths: {
        win32: string;
        darwin: string;
        linux: string;
    };
};

export type ConfigAppDef = {
    id: string;
    label: string;
    os: ('win32' | 'darwin' | 'linux')[];
    files: {
        win32?: string[];
        darwin?: string[];
        linux?: string[];
    };
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

export type MergedPackageItem = {
    id: string; // PackageId or Name
    name: string; // Display name
    version?: string;
    isInstalled: boolean; // true if currently installed, false if backup-only
    source?: 'installed' | 'backup' | 'both';
};
