import { create } from 'zustand';
import type { AppConfig, ManagerId, VSCodeId, AppInfo, BackupMetadata, MergedPackageItem } from '@shared/types';

export type View = 'settings' | 'home' | 'details';

interface AppState {
    // Config and app info
    config: AppConfig;
    info: AppInfo | undefined;
    metadata: BackupMetadata;

    // View state
    view: View;
    selectedManager: ManagerId | VSCodeId;

    // Data state
    packageItems: MergedPackageItem[];
    extensionItems: MergedPackageItem[];
    extensionItemsInWSL: MergedPackageItem[];

    // Selection state
    selectedIds: string[];
    selectedIdsInWSL: string[];

    // UI state
    loadingItems: boolean;
    showWSLView: boolean;
    showUnavailablePackages: boolean;
    showUnavailableConfigs: boolean;

    // Dialog state
    scriptDialogOpen: boolean;
    scriptContent: string;

    // Detection state
    detectedApps: Record<string, boolean>;
    configAvailability: Record<string, boolean>;

    // Progress and notifications
    progressMessage: string;
    snackbar: {
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    };

    // Actions
    setConfig: (config: AppConfig) => void;
    setInfo: (info: AppInfo | undefined) => void;
    setMetadata: (metadata: BackupMetadata) => void;
    setView: (view: View) => void;
    setSelectedManager: (manager: ManagerId | VSCodeId) => void;
    setPackageItems: (items: MergedPackageItem[]) => void;
    setExtensionItems: (items: MergedPackageItem[]) => void;
    setExtensionItemsInWSL: (items: MergedPackageItem[]) => void;
    setSelectedIds: (ids: string[]) => void;
    setSelectedIdsInWSL: (ids: string[]) => void;
    setLoadingItems: (loading: boolean) => void;
    setShowWSLView: (show: boolean) => void;
    setShowUnavailablePackages: (show: boolean) => void;
    setShowUnavailableConfigs: (show: boolean) => void;
    setScriptDialogOpen: (open: boolean) => void;
    setScriptContent: (content: string) => void;
    setDetectedApps: (apps: Record<string, boolean>) => void;
    setConfigAvailability: (availability: Record<string, boolean>) => void;
    setProgressMessage: (message: string) => void;
    setSnackbar: (snackbar: {
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }) => void;
}

const useAppStore = create<AppState>(set => ({
    // Initial state
    config: { backupDirectory: '' },
    info: undefined,
    metadata: {} as BackupMetadata,
    view: 'home',
    selectedManager: 'winget',
    packageItems: [],
    extensionItems: [],
    extensionItemsInWSL: [],
    selectedIds: [],
    selectedIdsInWSL: [],
    loadingItems: false,
    showWSLView: false,
    showUnavailablePackages: false,
    showUnavailableConfigs: false,
    scriptDialogOpen: false,
    scriptContent: '',
    detectedApps: {},
    configAvailability: {},
    progressMessage: '',
    snackbar: { open: false, message: '', severity: 'info' },

    // Actions
    setConfig: config => set({ config }),
    setInfo: info => set({ info }),
    setMetadata: metadata => set({ metadata }),
    setView: view => set({ view }),
    setSelectedManager: selectedManager => set({ selectedManager }),
    setPackageItems: packageItems => set({ packageItems }),
    setExtensionItems: extensionItems => set({ extensionItems }),
    setExtensionItemsInWSL: extensionItemsInWSL => set({ extensionItemsInWSL }),
    setSelectedIds: selectedIds => set({ selectedIds }),
    setSelectedIdsInWSL: selectedIdsInWSL => set({ selectedIdsInWSL }),
    setLoadingItems: loadingItems => set({ loadingItems }),
    setShowWSLView: showWSLView => set({ showWSLView }),
    setShowUnavailablePackages: showUnavailablePackages => set({ showUnavailablePackages }),
    setShowUnavailableConfigs: showUnavailableConfigs => set({ showUnavailableConfigs }),
    setScriptDialogOpen: scriptDialogOpen => set({ scriptDialogOpen }),
    setScriptContent: scriptContent => set({ scriptContent }),
    setDetectedApps: detectedApps => set({ detectedApps }),
    setConfigAvailability: configAvailability => set({ configAvailability }),
    setProgressMessage: progressMessage => set({ progressMessage }),
    setSnackbar: snackbar => set({ snackbar }),
}));

export default useAppStore;
