import React from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, Box, Snackbar, Alert } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import './i18n/config';
import TitleBar from './components/TitleBar';
import MessageDialog from './components/MessageDialog';
import { useMessageDialog } from './hooks/useMessageDialog';
import useAppStore from './store/useAppStore';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { PackageManagerDetailsPage } from './pages/PackageManagerDetailsPage';
import { VSCodeDetailsPage } from './pages/VSCodeDetailsPage';
import { ConfigDetailsPage } from './pages/ConfigDetailsPage';
import { MANAGER_DEFS, VS_CODE_DEFS, CONFIG_APP_DEFS } from '@shared/constants';
import { ScriptDialog } from './components/ScriptDialog';
import type { ManagerId, VSCodeId, MergedPackageItem, AppTheme, AppInfo } from '@shared/types';

function App() {
    const { t, i18n } = useTranslation();
    const { dialogState, showYesNo, handleClose, handleResult } = useMessageDialog();

    // Get state and setters from Zustand store
    const {
        config,
        info,
        view,
        selectedManager,
        packageItems,
        extensionItems,
        extensionItemsInWSL,
        selectedIds,
        selectedIdsInWSL,
        showWSLView,
        detectedApps,
        scriptDialogOpen,
        scriptContent,
        snackbar,
        setConfig,
        setView,
        setInfo,
        setDetectedApps,
        setConfigAvailability,
        setProgressMessage,
        setPackageItems,
        setExtensionItems,
        setExtensionItemsInWSL,
        setSelectedIds,
        setSelectedIdsInWSL,
        setShowWSLView,
        setLoadingItems,
        setSelectedManager,
        setSnackbar,
        setScriptContent,
        setScriptDialogOpen,
        setIsProcessing,
        setProcessingMessage,
    } = useAppStore();

    // Initialize app data
    React.useEffect(() => {
        window.abr.getConfig().then(async cfg => {
            setConfig(cfg);
            const valid = await window.abr.validateBackupDirectory?.();
            setView(valid ? 'home' : 'settings');
        });
        window.abr.getAppInfo().then(appInfo => {
            setInfo(appInfo);
            i18n.changeLanguage(appInfo.language);
        });
    }, [setConfig, setView, setInfo, i18n]);

    // Detect managers
    React.useEffect(() => {
        (async () => {
            const detected = await window.abr.detectManagers();
            setDetectedApps(detected);
        })();
    }, [setDetectedApps]);

    // Load backup dates function
    const loadBackupDates = React.useCallback(async (): Promise<Record<string, string | null>> => {
        const dates: Record<string, string | null> = {};
        const os = info?.os || 'win32';

        // Load dates for package managers
        for (const manager of MANAGER_DEFS.filter(m => m.os.includes(os as any))) {
            try {
                const date = await window.abr.getBackupLastModified?.(manager.id);
                dates[manager.id] = date || null;
            } catch (error) {
                dates[manager.id] = null;
            }
        }

        // Load dates for VSCode
        for (const vscode of VS_CODE_DEFS) {
            try {
                const date = await window.abr.getBackupLastModified?.(vscode.id);
                dates[vscode.id] = date || null;
            } catch (error) {
                dates[vscode.id] = null;
            }
        }

        // Load dates for config apps
        for (const config of CONFIG_APP_DEFS) {
            try {
                const date = await window.abr.getBackupLastModified?.(config.id);
                dates[config.id] = date || null;
            } catch (error) {
                dates[config.id] = null;
            }
        }

        return dates;
    }, [info?.os]);

    // Check config availability
    React.useEffect(() => {
        (async () => {
            try {
                const availability = (await window.abr.checkConfigAvailability?.()) || {};
                setConfigAvailability(availability);
            } catch (error) {
                console.log('Config availability check not available yet:', error);
                setConfigAvailability({});
            }
        })();
    }, [setConfigAvailability]);

    // Listen for progress messages
    React.useEffect(() => {
        const removeProgressListener = window.abr.onTaskProgress?.(
            (message: string | { key: string; params: Record<string, any> }) => {
                if (typeof message === 'object' && message.key) {
                    const translatedMessage = t(message.key, message.params) as string;
                    setProgressMessage(translatedMessage);
                } else {
                    setProgressMessage(message as string);
                }
            }
        );

        return () => {
            removeProgressListener?.();
        };
    }, [t, setProgressMessage]);

    const mergeVSCodeExtensions = (installed: any[], backup: any[]): MergedPackageItem[] => {
        const installedMap = new Map<string, any>();
        installed.forEach(item => {
            installedMap.set(item.id, item);
        });

        const backupMap = new Map<string, any>();
        backup.forEach(item => {
            backupMap.set(item.id, item);
        });

        const allIds = new Set([...installedMap.keys(), ...backupMap.keys()]);

        const merged: MergedPackageItem[] = [];
        allIds.forEach(id => {
            const installedItem = installedMap.get(id);
            const backupItem = backupMap.get(id);

            if (installedItem && backupItem) {
                merged.push({
                    id,
                    name: id,
                    version: installedItem.version,
                    isInstalled: true,
                    source: 'both',
                });
            } else if (installedItem) {
                merged.push({
                    id,
                    name: id,
                    version: installedItem.version,
                    isInstalled: true,
                    source: 'installed',
                });
            } else if (backupItem) {
                merged.push({
                    id,
                    name: id,
                    version: backupItem.version,
                    isInstalled: false,
                    source: 'backup',
                });
            }
        });

        merged.sort((a, b) => {
            if (a.isInstalled !== b.isInstalled) {
                return a.isInstalled ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return merged;
    };

    const mergePackageLists = (installed: any[], backup: any[], _managerId: ManagerId): MergedPackageItem[] => {
        const getItemId = (item: any) => item.PackageId || item.Name;
        const getItemName = (item: any) => item.Name || item.Title || getItemId(item);
        const getItemVersion = (item: any) => item.Version;

        const installedMap = new Map<string, any>();
        installed.forEach(item => {
            const id = getItemId(item);
            installedMap.set(id, item);
        });

        const backupMap = new Map<string, any>();
        backup.forEach(item => {
            const id = getItemId(item);
            backupMap.set(id, item);
        });

        const allIds = new Set([...installedMap.keys(), ...backupMap.keys()]);

        const merged: MergedPackageItem[] = [];
        allIds.forEach(id => {
            const installedItem = installedMap.get(id);
            const backupItem = backupMap.get(id);

            if (installedItem && backupItem) {
                merged.push({
                    id,
                    name: getItemName(installedItem),
                    version: getItemVersion(installedItem),
                    isInstalled: true,
                    source: 'both',
                });
            } else if (installedItem) {
                merged.push({
                    id,
                    name: getItemName(installedItem),
                    version: getItemVersion(installedItem),
                    isInstalled: true,
                    source: 'installed',
                });
            } else if (backupItem) {
                merged.push({
                    id,
                    name: getItemName(backupItem),
                    version: getItemVersion(backupItem),
                    isInstalled: false,
                    source: 'backup',
                });
            }
        });

        merged.sort((a, b) => {
            if (a.isInstalled !== b.isInstalled) {
                return a.isInstalled ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return merged;
    };

    const openDetails = async (id: string) => {
        setPackageItems([]);
        setExtensionItems([]);
        setExtensionItemsInWSL([]);
        setSelectedIds([]);
        setSelectedIdsInWSL([]);
        setShowWSLView(false);
        setProgressMessage('');

        if (MANAGER_DEFS.some(m => m.id === id)) {
            const mgr = id as ManagerId;
            setSelectedManager(mgr);
            setView('details');
            setLoadingItems(true);

            try {
                const [installedData, backupData] = await Promise.all([
                    window.abr.listPackages(mgr),
                    window.abr.readBackupList?.(mgr) || Promise.resolve([]),
                ]);

                const merged = mergePackageLists(installedData, backupData, mgr);
                setPackageItems(merged);
            } catch (error) {
                console.error('Failed to load package lists:', error);
                setPackageItems([]);
            } finally {
                setLoadingItems(false);
                setProgressMessage('');
            }
        } else if (VS_CODE_DEFS.some(e => e.id === id)) {
            const vscodeId = id as VSCodeId;
            setSelectedManager(vscodeId);
            setView('details');
            setLoadingItems(true);

            try {
                const [installedData, backupData] = await Promise.all([
                    window.abr.listVSCodeExtensions?.(vscodeId) || Promise.resolve([]),
                    window.abr.readVSCodeBackupList?.(vscodeId) || Promise.resolve([]),
                ]);

                const merged = mergeVSCodeExtensions(installedData, backupData);
                setExtensionItems(merged);

                if (detectedApps.wsl) {
                    try {
                        const wslExtensionsData = (await window.abr.listVSCodeExtensionsWSL?.(vscodeId)) || [];
                        const wslExtensionsMerged = mergeVSCodeExtensions(wslExtensionsData, []);
                        setExtensionItemsInWSL(wslExtensionsMerged);
                    } catch (error) {
                        console.error('Failed to load extensions in WSL:', error);
                        setExtensionItemsInWSL([]);
                    }
                }
            } catch (error) {
                console.error('Failed to load VSCode extensions:', error);
                setExtensionItems([]);
            } finally {
                setLoadingItems(false);
                setProgressMessage('');
            }
        } else {
            setView('details');
        }
    };

    const refreshActiveTab = async () => {
        if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
            const mgr = selectedManager as ManagerId;
            setLoadingItems(true);

            try {
                const [installedData, backupData] = await Promise.all([
                    window.abr.listPackages(mgr),
                    window.abr.readBackupList?.(mgr) || Promise.resolve([]),
                ]);

                const merged = mergePackageLists(installedData, backupData, mgr);
                setPackageItems(merged);
            } catch (error) {
                console.error('Failed to load package lists:', error);
                setPackageItems([]);
            } finally {
                setLoadingItems(false);
                setProgressMessage('');
            }
        } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
            const vscodeId = selectedManager as VSCodeId;
            setLoadingItems(true);

            try {
                if (showWSLView) {
                    // Refresh WSL extensions only
                    const wslExtensionsData = (await window.abr.listVSCodeExtensionsWSL?.(vscodeId)) || [];
                    const wslExtensionsMerged = mergeVSCodeExtensions(wslExtensionsData, []);
                    setExtensionItemsInWSL(wslExtensionsMerged);
                } else {
                    // Refresh regular extensions only
                    const [installedData, backupData] = await Promise.all([
                        window.abr.listVSCodeExtensions?.(vscodeId) || Promise.resolve([]),
                        window.abr.readVSCodeBackupList?.(vscodeId) || Promise.resolve([]),
                    ]);

                    const merged = mergeVSCodeExtensions(installedData, backupData);
                    setExtensionItems(merged);
                }
            } catch (error) {
                console.error('Failed to load VSCode extensions:', error);
                if (showWSLView) {
                    setExtensionItemsInWSL([]);
                } else {
                    setExtensionItems([]);
                }
            } finally {
                setLoadingItems(false);
                setProgressMessage('');
            }
        }
    };

    const confirm = async (message: string, title?: string) => {
        const result = await showYesNo(message, title);
        return result === 'yes';
    };

    const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const runBackupAll = async (ids: string[]) => {
        if (!(await confirm(t('confirmBulkBackup')))) return;

        setIsProcessing(true);
        setProcessingMessage(t('backingUpAll', { current: 0, total: ids.length }));

        const successfulBackups: string[] = [];
        let currentStep = 0;

        const mgrs = ids.filter(x => MANAGER_DEFS.some(m => m.id === x)) as ManagerId[];
        for (const managerId of mgrs) {
            currentStep++;
            setProcessingMessage(t('backingUpAll', { current: currentStep, total: ids.length }));

            try {
                await window.abr.runBackup([managerId]);
                const managerDef = MANAGER_DEFS.find(m => m.id === managerId);
                successfulBackups.push(managerDef?.label || managerId);
            } catch (error) {
                console.error(`Failed to backup ${managerId}:`, error);
                showToast(
                    t('backupFailed', {
                        item: managerId,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                    'error'
                );
            }
        }

        const vscodeApps = ids.filter(x => VS_CODE_DEFS.some(e => e.id === x)) as VSCodeId[];
        for (const vscodeId of vscodeApps) {
            currentStep++;
            setProcessingMessage(t('backingUpAll', { current: currentStep, total: ids.length }));

            try {
                await window.abr.runBackupVSCode?.(vscodeId);
                const vscodeDef = VS_CODE_DEFS.find(e => e.id === vscodeId);
                successfulBackups.push(vscodeDef?.label || vscodeId);
            } catch (error) {
                console.error(`Failed to backup ${vscodeId}:`, error);
                showToast(
                    t('backupFailed', {
                        item: vscodeId,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                    'error'
                );
            }
        }

        const configAppIds = ids.filter(x => CONFIG_APP_DEFS.some(c => c.id === x));
        for (const configAppId of configAppIds) {
            currentStep++;
            setProcessingMessage(t('backingUpAll', { current: currentStep, total: ids.length }));

            try {
                await window.abr.runBackupConfig?.(configAppId as any);
                const configDef = CONFIG_APP_DEFS.find(c => c.id === configAppId);
                successfulBackups.push(configDef?.label || configAppId);
            } catch (error) {
                console.error(`Failed to backup ${configAppId}:`, error);
                showToast(
                    t('backupFailed', {
                        item: configAppId,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                    'error'
                );
            }
        }

        if (successfulBackups.length > 0) {
            showToast(t('backupSuccess', { items: successfulBackups.join(', ') }), 'success');
        } else {
            showToast(t('noBackupsCompleted'), 'warning');
        }

        setIsProcessing(false);
        setProcessingMessage('');
    };

    const runBackup = async (id: string, name: string) => {
        setIsProcessing(true);
        setProcessingMessage(t('backingUpSingle', { name }));

        try {
            if (VS_CODE_DEFS.some(e => e.id === id)) {
                await window.abr.runBackupVSCode?.(id as any);
            } else if (MANAGER_DEFS.some(m => m.id === id)) {
                await window.abr.runBackup?.([id as ManagerId]);
            } else {
                await window.abr.runBackupConfig?.(id as any);
            }
            showToast(t('backupConfigSuccess', { name }), 'success');
        } catch (error) {
            console.error(`Failed to backup ${id}:`, error);
            showToast(t('backupConfigFailed', { name }), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const runRestore = async (id: string) => {
        if (!(await confirm(t('confirmRestore')))) return;

        setIsProcessing(true);
        setProcessingMessage(t('restoringSingle', { name: id }));

        try {
            await window.abr.runRestoreConfig?.(id as any);
            showToast(t('restoreSuccess'), 'success');
        } catch (error) {
            console.error(`Failed to restore ${id}:`, error);
            showToast(t('settingsRestoreFailed'), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const runBackupSelected = async () => {
        let currentItems: MergedPackageItem[];
        let selectedIdsList: string[];

        if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
            if (showWSLView) {
                currentItems = extensionItemsInWSL;
                selectedIdsList = selectedIdsInWSL;
            } else {
                currentItems = extensionItems;
                selectedIdsList = selectedIds;
            }
        } else {
            currentItems = packageItems;
            selectedIdsList = selectedIds;
        }

        const installedIds = currentItems
            .filter(it => selectedIdsList.includes(it.id) && it.isInstalled)
            .map(it => it.id);
        if (installedIds.length === 0) return;

        setIsProcessing(true);
        setProcessingMessage(t('backingUpSelected'));

        try {
            if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                await window.abr.runBackupSelected?.(selectedManager as ManagerId, installedIds);
            } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                await window.abr.runBackupVSCode?.(selectedManager as any, installedIds);
            }
            const managerDef = MANAGER_DEFS.find(m => m.id === selectedManager);
            const vscodeDef = VS_CODE_DEFS.find(e => e.id === selectedManager);
            const displayName = managerDef?.label || vscodeDef?.label || selectedManager;
            showToast(t('backupSelectedSuccess', { manager: displayName }), 'success');
        } catch (error) {
            console.error('Failed to backup selected items:', error);
            showToast(
                t('backupSelectedFailed', { error: error instanceof Error ? error.message : String(error) }),
                'error'
            );
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const runRestoreExecute = async () => {
        let currentItems: MergedPackageItem[];
        let selectedIdsList: string[];

        if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
            if (showWSLView) {
                currentItems = extensionItemsInWSL;
                selectedIdsList = selectedIdsInWSL;
            } else {
                currentItems = extensionItems;
                selectedIdsList = selectedIds;
            }
        } else {
            currentItems = packageItems;
            selectedIdsList = selectedIds;
        }

        const notInstalledIds = currentItems
            .filter(it => selectedIdsList.includes(it.id) && !it.isInstalled)
            .map(it => it.id);
        if (notInstalledIds.length === 0) return;
        if (!(await confirm(t('confirmRestore')))) return;

        setIsProcessing(true);
        setProcessingMessage(t('restoringSelected'));

        try {
            if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                await window.abr.runRestore({
                    managerId: selectedManager as ManagerId,
                    identifiers: notInstalledIds,
                    mode: 'execute',
                });
            } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                await window.abr.runRestoreVSCode?.({
                    vscodeId: selectedManager as any,
                    identifiers: notInstalledIds,
                    mode: 'execute',
                });
            }
            showToast(t('restoreSelectedSuccess'), 'success');
        } catch (error) {
            console.error('Failed to restore selected items:', error);
            showToast(t('restoreSelectedFailed'), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const runGenerateScript = async () => {
        let currentItems: MergedPackageItem[];
        let selectedIdsList: string[];

        if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
            if (showWSLView) {
                currentItems = extensionItemsInWSL;
                selectedIdsList = selectedIdsInWSL;
            } else {
                currentItems = extensionItems;
                selectedIdsList = selectedIds;
            }
        } else {
            currentItems = packageItems;
            selectedIdsList = selectedIds;
        }

        const selectedItemIds = currentItems.filter(it => selectedIdsList.includes(it.id)).map(it => it.id);
        if (selectedItemIds.length === 0) return;

        setIsProcessing(true);
        setProcessingMessage(t('generatingScript'));

        try {
            let result;
            if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                result = await window.abr.getScriptContent?.({
                    managerId: selectedManager as ManagerId,
                    identifiers: selectedItemIds,
                    mode: 'script',
                });
            } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                if (showWSLView) {
                    result = await window.abr.getScriptContent?.({
                        vscodeId: selectedManager as any,
                        identifiers: selectedItemIds,
                        mode: 'script',
                        wsl: true,
                    } as any);
                } else {
                    result = await window.abr.getScriptContent?.({
                        vscodeId: selectedManager as any,
                        identifiers: selectedItemIds,
                        mode: 'script',
                    } as any);
                }
            }

            if (result?.content) {
                setScriptContent(result.content);
                setScriptDialogOpen(true);
            }
        } catch (error) {
            console.error('Failed to generate script:', error);
            showToast(t('scriptGenerationFailed'), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const copyScriptToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(scriptContent);
            showToast(t('copiedToClipboard'), 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showToast(t('copyFailed'), 'error');
        }
    };

    const backupVSCodeSettings = async () => {
        if (!VS_CODE_DEFS.some(e => e.id === selectedManager)) return;

        setIsProcessing(true);
        setProcessingMessage(t('backingUpSettings'));

        try {
            await window.abr.runBackupVSCode?.(selectedManager as any);
            showToast(t('settingsBackupSuccess'), 'success');
        } catch (error) {
            console.error('Failed to backup VSCode settings:', error);
            showToast(t('settingsBackupFailed'), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const restoreVSCodeSettings = async () => {
        if (!VS_CODE_DEFS.some(e => e.id === selectedManager)) return;
        if (!(await confirm(t('confirmRestoreSettings')))) return;

        setIsProcessing(true);
        setProcessingMessage(t('restoringSettings'));

        try {
            await window.abr.restoreVSCodeSettings?.(selectedManager as any);
            showToast(t('settingsRestoreSuccess'), 'success');
        } catch (error) {
            console.error('Failed to restore VSCode settings:', error);
            showToast(t('settingsRestoreFailed'), 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
        }
    };

    const handleSaveSettings = React.useCallback(
        async ({ language, theme }: { language: 'ja' | 'en'; theme: 'light' | 'dark' }) => {
            const valid = (await window.abr.validateBackupDirectory?.()) ?? false;
            if (!valid) return false;

            const [languageResult, themeResult] = await Promise.all([
                window.abr.setLanguage(language),
                window.abr.setTheme(theme),
            ]);

            const nextLanguage = languageResult?.language ?? language;
            const nextTheme = (themeResult?.theme ?? theme) as AppTheme;

            i18n.changeLanguage(nextLanguage);
            const baseInfo: AppInfo =
                info ??
                ({
                    name: 'App Backup Restore',
                    version: '',
                    language: nextLanguage,
                    theme: nextTheme,
                    os: process.platform as AppInfo['os'],
                } as AppInfo);

            setInfo({ ...baseInfo, language: nextLanguage, theme: nextTheme });

            return true;
        },
        [info, i18n, setInfo]
    );

    const muiTheme = React.useMemo(
        () => createTheme({ palette: { mode: (info?.theme ?? 'light') as 'light' | 'dark' } }),
        [info?.theme]
    );

    const renderCurrentView = () => {
        switch (view) {
            case 'settings':
                return (
                    <SettingsPage
                        onChooseBackupDirectory={async () => {
                            const cfg = await window.abr.chooseBackupDirectory();
                            setConfig(cfg);
                        }}
                        onSaveSettings={handleSaveSettings}
                        onClose={() => {
                            if (!config.backupDirectory) {
                                window.abr.close();
                            } else {
                                setView('home');
                            }
                        }}
                    />
                );
            case 'details':
                if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                    return (
                        <PackageManagerDetailsPage
                            onRefresh={refreshActiveTab}
                            onBackupSelected={runBackupSelected}
                            onRestoreExecute={runRestoreExecute}
                            onGenerateScript={runGenerateScript}
                            onBack={() => setView('home')}
                        />
                    );
                } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                    return (
                        <VSCodeDetailsPage
                            onRefresh={refreshActiveTab}
                            onBackupSelected={runBackupSelected}
                            onRestoreExecute={runRestoreExecute}
                            onGenerateScript={runGenerateScript}
                            onBackupSettings={backupVSCodeSettings}
                            onRestoreSettings={restoreVSCodeSettings}
                            onBack={() => setView('home')}
                        />
                    );
                } else {
                    return (
                        <ConfigDetailsPage
                            onBackup={() => runBackup(selectedManager, '')}
                            onRestore={() => runRestore(selectedManager)}
                            onBack={() => setView('home')}
                        />
                    );
                }
            default:
                return (
                    <HomePage
                        onOpenDetails={openDetails}
                        onRunBackupAll={runBackupAll}
                        onRunBackup={runBackup}
                        onRunRestore={runRestore}
                        onRefreshBackupDates={loadBackupDates}
                    />
                );
        }
    };

    return (
        <React.StrictMode>
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <TitleBar info={info} onOpenSettings={() => setView('settings')} />
                    <Box sx={{ flex: 1, overflow: 'auto' }}>{renderCurrentView()}</Box>
                    <ScriptDialog
                        open={scriptDialogOpen}
                        content={scriptContent}
                        onClose={() => setScriptDialogOpen(false)}
                        onCopy={copyScriptToClipboard}
                    />

                    {/* Toast notifications */}
                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={6000}
                        onClose={handleSnackbarClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                            {snackbar.message}
                        </Alert>
                    </Snackbar>

                    {/* Custom Dialog */}
                    {dialogState.options && (
                        <MessageDialog
                            open={dialogState.open}
                            onClose={handleClose}
                            onResult={handleResult}
                            title={dialogState.options.title}
                            message={dialogState.options.message}
                            type={dialogState.options.type}
                            okText={dialogState.options.okText}
                            yesText={dialogState.options.yesText}
                            noText={dialogState.options.noText}
                            cancelText={dialogState.options.cancelText}
                        />
                    )}
                </Box>
            </ThemeProvider>
        </React.StrictMode>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
