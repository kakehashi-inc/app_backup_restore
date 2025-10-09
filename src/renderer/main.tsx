import React from 'react';
import { createRoot } from 'react-dom/client';
import {
    CssBaseline,
    Container,
    Box,
    Typography,
    Button,
    Stack,
    Divider,
    Paper,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TextField,
    CircularProgress,
    ListItemIcon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Collapse,
    Snackbar,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { AppConfig, ManagerId, VSCodeId, AppInfo, BackupMetadata, MergedPackageItem } from '@shared/types';
import { MANAGER_DEFS, VS_CODE_DEFS, CONFIG_APP_DEFS } from '@shared/constants';
import './i18n/config';
import { useTranslation } from 'react-i18next';
import TitleBar from './components/TitleBar';
import MessageDialog from './components/MessageDialog';
import { useMessageDialog } from './hooks/useMessageDialog';

// Use definitions from constants.ts
const managerDefs = MANAGER_DEFS;
const vscodeApps = VS_CODE_DEFS;
const configApps = CONFIG_APP_DEFS;

type View = 'settings' | 'home' | 'details';

function App() {
    const { t, i18n } = useTranslation();
    const { dialogState, showYesNo, handleClose, handleResult } = useMessageDialog();
    const [config, setConfig] = React.useState<AppConfig>({ backupDirectory: '' });
    const [info, setInfo] = React.useState<AppInfo>();
    const [metadata, setMetadata] = React.useState<BackupMetadata>({} as BackupMetadata);

    const formatDateTime = (isoString: string | undefined): string => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            const locale = i18n.language === 'ja' ? 'ja-JP' : 'en-US';
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(date);
        } catch (error) {
            console.error('Failed to format date:', error);
            return '-';
        }
    };

    const [selectedManager, setSelectedManager] = React.useState<ManagerId | VSCodeId>(MANAGER_DEFS[0].id);
    const [items, setItems] = React.useState<MergedPackageItem[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [view, setView] = React.useState<View>('home');
    const [loadingItems, setLoadingItems] = React.useState(false);
    const [scriptDialogOpen, setScriptDialogOpen] = React.useState(false);
    const [scriptContent, setScriptContent] = React.useState('');
    const [detectedApps, setDetectedApps] = React.useState<Record<string, boolean>>({});
    const [configAvailability, setConfigAvailability] = React.useState<Record<string, boolean>>({});
    const [showUnavailablePackages, setShowUnavailablePackages] = React.useState(false);
    const [showUnavailableConfigs, setShowUnavailableConfigs] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({ open: false, message: '', severity: 'info' });
    const [progressMessage, setProgressMessage] = React.useState<string>('');

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
        (async () => {
            try {
                const md = (await window.abr.getBackupMetadata?.()) || {};
                setMetadata(md as BackupMetadata);
            } catch (error) {
                // Ignore error if backup directory is not set (first time setup)
                console.log('Backup metadata not available yet:', error);
                setMetadata({});
            }
        })();
        (async () => {
            const detected = await window.abr.detectManagers();
            setDetectedApps(detected);
        })();
        (async () => {
            try {
                const availability = (await window.abr.checkConfigAvailability?.()) || {};
                setConfigAvailability(availability);
            } catch (error) {
                // Ignore error if backup directory is not set (first time setup)
                console.log('Config availability check not available yet:', error);
                setConfigAvailability({});
            }
        })();

        // Listen for progress messages
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
    }, [i18n]);

    const refreshMetadata = React.useCallback(async () => {
        const md = (await window.abr.getBackupMetadata?.()) || {};
        setMetadata(md as BackupMetadata);
    }, []);

    const openDetails = async (id: string) => {
        setItems([]);
        setSelectedIds([]);
        setProgressMessage(''); // Clear previous progress message

        if (MANAGER_DEFS.some(m => m.id === id)) {
            const mgr = id as ManagerId;
            setSelectedManager(mgr);
            setView('details');
            setLoadingItems(true);

            try {
                // Fetch both installed and backup lists in parallel
                const [installedData, backupData] = await Promise.all([
                    window.abr.listPackages(mgr),
                    window.abr.readBackupList?.(mgr) || Promise.resolve([]),
                ]);

                // Merge the lists
                const merged = mergePackageLists(installedData, backupData, mgr);
                setItems(merged);
            } catch (error) {
                console.error('Failed to load package lists:', error);
                setItems([]);
            } finally {
                setLoadingItems(false);
                setProgressMessage(''); // Clear progress message when done
            }
        } else if (VS_CODE_DEFS.some(e => e.id === id)) {
            // VSCode apps
            const vscodeId = id as VSCodeId;
            setSelectedManager(vscodeId);
            setView('details');
            setLoadingItems(true);

            try {
                // Fetch both installed and backup lists in parallel
                const [installedData, backupData] = await Promise.all([
                    window.abr.listVSCodeExtensions?.(vscodeId) || Promise.resolve([]),
                    window.abr.readVSCodeBackupList?.(vscodeId) || Promise.resolve([]),
                ]);

                // Merge the lists for VSCode apps
                const merged = mergeVSCodeExtensions(installedData, backupData);
                setItems(merged);
            } catch (error) {
                console.error('Failed to load VSCode extensions:', error);
                setItems([]);
            } finally {
                setLoadingItems(false);
                setProgressMessage(''); // Clear progress message when done
            }
        } else {
            // Config files: no list to show
            setItems([]);
            setView('details');
        }
    };

    const mergeVSCodeExtensions = (installed: any[], backup: any[]): MergedPackageItem[] => {
        const installedMap = new Map<string, any>();
        installed.forEach(item => {
            installedMap.set(item.id, item);
        });

        const backupMap = new Map<string, any>();
        backup.forEach(item => {
            backupMap.set(item.id, item);
        });

        // Collect all unique IDs
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

        // Sort: installed first, then by name
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

        // Collect all unique IDs
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

        // Sort: installed first, then by name
        merged.sort((a, b) => {
            if (a.isInstalled !== b.isInstalled) {
                return a.isInstalled ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return merged;
    };

    const confirm = async (message: string, title?: string) => {
        const result = await showYesNo(message, title);
        return result === 'yes';
    };

    const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    const runBackupAll = async (ids: string[]) => {
        if (!(await confirm(t('confirmBulkBackup')))) return;

        const successfulBackups: string[] = [];

        // Package managers - backup all installed packages
        const mgrs = ids.filter(x => MANAGER_DEFS.some(m => m.id === x)) as ManagerId[];
        for (const managerId of mgrs) {
            try {
                console.log(`Starting backup for ${managerId}...`);
                // For package managers, backup all installed packages (no identifiers filter)
                const result = await window.abr.runBackup([managerId]);
                console.log(`Backup completed for ${managerId}:`, result);
                const managerDef = managerDefs.find(m => m.id === managerId);
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

        // VSCode apps - backup all installed extensions and settings
        const vscodeApps = ids.filter(x => VS_CODE_DEFS.some(e => e.id === x)) as VSCodeId[];
        for (const vscodeId of vscodeApps) {
            try {
                console.log(`Starting backup for ${vscodeId}...`);
                // For VSCode apps, backup all installed extensions and settings (no identifiers filter)
                const result = await window.abr.runBackupVSCode?.(vscodeId);
                console.log(`Backup completed for ${vscodeId}:`, result);
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

        // Config files
        const configAppIds = ids.filter(x => CONFIG_APP_DEFS.some(c => c.id === x));
        for (const configAppId of configAppIds) {
            try {
                await window.abr.runBackupConfig?.(configAppId as any);
                const configDef = configApps.find(c => c.id === configAppId);
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

        // Only refresh metadata if at least one backup was successful
        if (successfulBackups.length > 0) {
            await refreshMetadata();
            showToast(t('backupSuccess', { items: successfulBackups.join(', ') }), 'success');
        } else {
            showToast(t('noBackupsCompleted'), 'warning');
        }
    };

    const runBackupSelected = async () => {
        // Only backup installed items
        const installedIds = items.filter(it => selectedIds.includes(it.id) && it.isInstalled).map(it => it.id);
        if (installedIds.length === 0) return;

        try {
            if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                await window.abr.runBackupSelected?.(selectedManager as ManagerId, installedIds);
            } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                await window.abr.runBackupVSCode?.(selectedManager as any, installedIds);
            }
            await refreshMetadata();
            // Get display name for the manager
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
        }
    };

    const runRestoreExecute = async () => {
        // Only restore not-installed items
        const notInstalledIds = items.filter(it => selectedIds.includes(it.id) && !it.isInstalled).map(it => it.id);
        if (notInstalledIds.length === 0) return;
        if (!(await confirm(t('confirmRestore')))) return;

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
    };

    const runGenerateScript = async () => {
        // Get all selected IDs regardless of install status
        const selectedItemIds = items.filter(it => selectedIds.includes(it.id)).map(it => it.id);
        if (selectedItemIds.length === 0) return;

        try {
            let result;
            if (MANAGER_DEFS.some(m => m.id === selectedManager)) {
                result = await window.abr.getScriptContent?.({
                    managerId: selectedManager as ManagerId,
                    identifiers: selectedItemIds,
                    mode: 'script',
                });
            } else if (VS_CODE_DEFS.some(e => e.id === selectedManager)) {
                result = await window.abr.getScriptContent?.({
                    vscodeId: selectedManager as any,
                    identifiers: selectedItemIds,
                    mode: 'script',
                } as any);
            }

            if (result?.content) {
                setScriptContent(result.content);
                setScriptDialogOpen(true);
            }
        } catch (error) {
            console.error('Failed to generate script:', error);
            showToast(t('scriptGenerationFailed'), 'error');
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
        try {
            await window.abr.runBackupVSCode?.(selectedManager as any);
            await refreshMetadata();
            showToast(t('settingsBackupSuccess'), 'success');
        } catch (error) {
            console.error('Failed to backup VSCode settings:', error);
            showToast(t('settingsBackupFailed'), 'error');
        }
    };

    const restoreVSCodeSettings = async () => {
        if (!VS_CODE_DEFS.some(e => e.id === selectedManager)) return;
        if (!(await confirm(t('confirmRestoreSettings')))) return;
        try {
            await window.abr.restoreVSCodeSettings?.(selectedManager as any);
            showToast(t('settingsRestoreSuccess'), 'success');
        } catch (error) {
            console.error('Failed to restore VSCode settings:', error);
            showToast(t('settingsRestoreFailed'), 'error');
        }
    };

    const muiTheme = React.useMemo(
        () => createTheme({ palette: { mode: (info?.theme ?? 'light') as 'light' | 'dark' } }),
        [info?.theme]
    );

    const os = info?.os || 'win32';

    const pmRows = managerDefs
        .filter(m => m.os.includes(os as any))
        .map(m => ({ id: m.id, name: m.label, last: metadata?.[m.id]?.last_backup }));

    const vscodeRows = vscodeApps.map(e => ({ id: e.id, name: e.label, last: metadata?.[e.id]?.last_backup }));
    const configRows = configApps.map(c => ({ id: c.id, name: c.label, last: metadata?.[c.id]?.last_backup }));

    // Split packages/extensions into available and unavailable
    const allPackageRows = [...pmRows, ...vscodeRows];
    const availablePackageRows = allPackageRows.filter(r => detectedApps[r.id]);
    const unavailablePackageRows = allPackageRows.filter(r => !detectedApps[r.id]);

    // Split config apps into available and unavailable
    const availableConfigRows = configRows.filter(r => configAvailability[r.id]);
    const unavailableConfigRows = configRows.filter(r => !configAvailability[r.id]);

    const isFirstTimeSetup = !config.backupDirectory;

    const SettingsView = (
        <Container maxWidth='sm' sx={{ py: 4 }}>
            <Typography variant='h5' gutterBottom>
                {isFirstTimeSetup ? t('firstTimeSetup') : t('settings')}
            </Typography>
            {isFirstTimeSetup && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                    {t('firstTimeSetupMessage')}
                </Typography>
            )}

            {/* Language Setting */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('language')}</InputLabel>
                <Select
                    value={info?.language || 'en'}
                    label={t('language')}
                    onChange={async e => {
                        const lang = e.target.value as 'ja' | 'en';
                        await window.abr.setLanguage(lang);
                        setInfo(prev => (prev ? { ...prev, language: lang } : prev));
                        i18n.changeLanguage(lang);
                    }}
                >
                    <MenuItem value='ja'>日本語</MenuItem>
                    <MenuItem value='en'>English</MenuItem>
                </Select>
            </FormControl>

            {/* Dark Mode Setting */}
            <FormControlLabel
                control={
                    <Switch
                        checked={info?.theme === 'dark'}
                        onChange={async () => {
                            const current = await window.abr.getAppInfo();
                            const next = current.theme === 'dark' ? 'light' : 'dark';
                            await window.abr.setTheme(next);
                            setInfo({ ...current, theme: next });
                        }}
                    />
                }
                label={t('darkMode')}
                sx={{ mb: 3 }}
            />

            <Divider sx={{ mb: 3 }} />

            {/* Backup Directory Setting */}
            <Typography variant='h6' gutterBottom>
                {t('backupDir')}
            </Typography>
            <TextField
                fullWidth
                size='small'
                value={config.backupDirectory}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
            />
            <Button
                variant='contained'
                onClick={async () => {
                    const cfg = await window.abr.chooseBackupDirectory();
                    setConfig(cfg);
                }}
                sx={{ mb: 4 }}
            >
                {t('chooseBackupDir')}
            </Button>

            {/* Action Buttons */}
            <Divider sx={{ mb: 3 }} />
            <Stack direction='row' spacing={2} justifyContent='flex-end'>
                <Button
                    variant='text'
                    onClick={() => {
                        if (isFirstTimeSetup) {
                            // First time setup - exit application
                            window.abr.close();
                        } else {
                            // Regular settings - go back to home
                            setView('home');
                        }
                    }}
                >
                    {t('cancel')}
                </Button>
                <Button
                    variant='outlined'
                    onClick={async () => {
                        const valid = await window.abr.validateBackupDirectory?.();
                        if (valid) setView('home');
                    }}
                    disabled={!config.backupDirectory}
                >
                    {t('save')}
                </Button>
            </Stack>
        </Container>
    );

    const HomeView = (
        <Container maxWidth={false} sx={{ py: 2 }}>
            {/* Packages & Extensions */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='h6'>{t('packagesTitle')}</Typography>
                    <Stack direction='row' spacing={1}>
                        <Button
                            variant='contained'
                            disabled={!config.backupDirectory || availablePackageRows.length === 0}
                            onClick={() => runBackupAll(availablePackageRows.map(r => r.id))}
                        >
                            {t('backupAll')}
                        </Button>
                    </Stack>
                </Stack>
                {availablePackageRows.length > 0 && (
                    <Table size='small' sx={{ mt: 1 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                                <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{t('lastBackup')}</TableCell>
                                <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {availablePackageRows.map(r => (
                                <TableRow
                                    key={r.id}
                                    hover
                                    onDoubleClick={() => openDetails(r.id)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                    <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                        {formatDateTime(r.last)}
                                    </TableCell>
                                    <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                        <Stack direction='row' spacing={1}>
                                            <Button
                                                size='small'
                                                variant='contained'
                                                disabled={!config.backupDirectory}
                                                onClick={async () => {
                                                    try {
                                                        if (VS_CODE_DEFS.some(e => e.id === r.id)) {
                                                            // For VSCode apps, backup all installed extensions and settings
                                                            await window.abr.runBackupVSCode?.(r.id as any);
                                                        } else if (MANAGER_DEFS.some(m => m.id === r.id)) {
                                                            // For package managers, backup all installed packages
                                                            await window.abr.runBackup?.([r.id as ManagerId]);
                                                        }
                                                        await refreshMetadata();
                                                        showToast(
                                                            t('backupConfigSuccess', { name: r.name }),
                                                            'success'
                                                        );
                                                    } catch (error) {
                                                        console.error(`Failed to backup ${r.id}:`, error);
                                                        showToast(t('backupConfigFailed', { name: r.name }), 'error');
                                                    }
                                                }}
                                            >
                                                {t('backup')}
                                            </Button>
                                            <Button size='small' variant='outlined' onClick={() => openDetails(r.id)}>
                                                {t('details')}
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {unavailablePackageRows.length > 0 && (
                    <>
                        <Button
                            size='small'
                            onClick={() => setShowUnavailablePackages(!showUnavailablePackages)}
                            startIcon={showUnavailablePackages ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ mt: 1 }}
                        >
                            {t('showUnavailableApps')} ({unavailablePackageRows.length})
                        </Button>
                        <Collapse in={showUnavailablePackages}>
                            <Table size='small' sx={{ mt: 1 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                                        <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                            {t('lastBackup')}
                                        </TableCell>
                                        <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                            {t('actions')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {unavailablePackageRows.map(r => (
                                        <TableRow key={r.id} sx={{ opacity: 0.5 }}>
                                            <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                            <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                                {formatDateTime(r.last)}
                                            </TableCell>
                                            <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                                <Typography variant='caption' color='text.secondary'>
                                                    {t('notAvailable')}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Collapse>
                    </>
                )}
            </Paper>

            {/* Backup Targets (config files) */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='h6'>{t('backupTargetsTitle')}</Typography>
                    <Button
                        variant='contained'
                        disabled={!config.backupDirectory || availableConfigRows.length === 0}
                        onClick={() => runBackupAll(availableConfigRows.map(r => r.id))}
                    >
                        {t('backupAll')}
                    </Button>
                </Stack>
                {availableConfigRows.length > 0 && (
                    <Table size='small' sx={{ mt: 1 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                                <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{t('lastBackup')}</TableCell>
                                <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {availableConfigRows.map(r => (
                                <TableRow key={r.id} hover>
                                    <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                    <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                        {formatDateTime(r.last)}
                                    </TableCell>
                                    <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                        <Stack direction='row' spacing={1}>
                                            <Button
                                                size='small'
                                                variant='contained'
                                                disabled={!config.backupDirectory}
                                                onClick={async () => {
                                                    try {
                                                        await window.abr.runBackupConfig?.(r.id as any);
                                                        await refreshMetadata();
                                                        showToast(
                                                            t('backupConfigSuccess', { name: r.name }),
                                                            'success'
                                                        );
                                                    } catch (error) {
                                                        console.error(`Failed to backup ${r.id}:`, error);
                                                        showToast(t('backupConfigFailed', { name: r.name }), 'error');
                                                    }
                                                }}
                                            >
                                                {t('backup')}
                                            </Button>
                                            <Button
                                                size='small'
                                                variant='outlined'
                                                onClick={async () => {
                                                    if (!(await confirm(t('confirmRestore')))) return;
                                                    try {
                                                        await window.abr.runRestoreConfig?.(r.id as any);
                                                    } catch (error) {
                                                        console.error(`Failed to restore ${r.id}:`, error);
                                                        showToast(t('settingsRestoreFailed'), 'error');
                                                    }
                                                }}
                                            >
                                                {t('restore')}
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {unavailableConfigRows.length > 0 && (
                    <>
                        <Button
                            size='small'
                            onClick={() => setShowUnavailableConfigs(!showUnavailableConfigs)}
                            startIcon={showUnavailableConfigs ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ mt: 1 }}
                        >
                            {t('showUnavailableApps')} ({unavailableConfigRows.length})
                        </Button>
                        <Collapse in={showUnavailableConfigs}>
                            <Table size='small' sx={{ mt: 1 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                                        <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                            {t('lastBackup')}
                                        </TableCell>
                                        <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                            {t('actions')}
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {unavailableConfigRows.map(r => (
                                        <TableRow key={r.id} sx={{ opacity: 0.5 }}>
                                            <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                            <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                                {formatDateTime(r.last)}
                                            </TableCell>
                                            <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                                <Typography variant='caption' color='text.secondary'>
                                                    {t('notAvailable')}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Collapse>
                    </>
                )}
            </Paper>
        </Container>
    );

    const selectedInstalledCount = items.filter(it => selectedIds.includes(it.id) && it.isInstalled).length;
    const selectedNotInstalledCount = items.filter(it => selectedIds.includes(it.id) && !it.isInstalled).length;

    const DetailsView = (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
                {VS_CODE_DEFS.some(e => e.id === selectedManager) && (
                    <>
                        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                            <Typography variant='subtitle1' sx={{ fontWeight: 'bold' }}>
                                {t('vscodeSettings')}
                            </Typography>
                            <Button
                                variant='contained'
                                color='primary'
                                onClick={backupVSCodeSettings}
                                disabled={loadingItems}
                            >
                                {t('backupSettings')}
                            </Button>
                            <Button
                                variant='outlined'
                                color='primary'
                                onClick={restoreVSCodeSettings}
                                disabled={loadingItems}
                            >
                                {t('restoreSettings')}
                            </Button>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                    </>
                )}
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Button variant='outlined' onClick={() => openDetails(selectedManager)} disabled={loadingItems}>
                        {loadingItems ? (
                            <>
                                <CircularProgress size={16} sx={{ mr: 1 }} />
                                {t('refresh')}
                            </>
                        ) : (
                            t('refresh')
                        )}
                    </Button>
                    <Button
                        variant='contained'
                        disabled={selectedInstalledCount === 0 || loadingItems}
                        onClick={runBackupSelected}
                    >
                        {t('backup')}
                        {selectedInstalledCount > 0 && ` (${selectedInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedNotInstalledCount === 0 || loadingItems}
                        onClick={runRestoreExecute}
                    >
                        {t('restore')}
                        {selectedNotInstalledCount > 0 && ` (${selectedNotInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedIds.length === 0 || loadingItems}
                        onClick={runGenerateScript}
                    >
                        {t('generateScript')}
                        {selectedIds.length > 0 && ` (${selectedIds.length})`}
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button variant='text' onClick={() => setView('home')}>
                        {t('back')}
                    </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(items.map(it => it.id))}
                        disabled={loadingItems || items.length === 0}
                    >
                        {t('selectAll')}
                    </Button>
                    <Button size='small' variant='outlined' onClick={() => setSelectedIds([])} disabled={loadingItems}>
                        {t('clearAll')}
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(items.filter(it => it.isInstalled).map(it => it.id))}
                        disabled={loadingItems || items.length === 0}
                    >
                        {t('selectInstalled')}
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(items.filter(it => !it.isInstalled).map(it => it.id))}
                        disabled={loadingItems || items.length === 0}
                    >
                        {t('selectNotInstalled')}
                    </Button>
                </Stack>
                {loadingItems ? (
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ py: 4 }}>
                        <CircularProgress size={20} />
                        <Typography variant='body2'>{progressMessage || t('loading')}</Typography>
                    </Stack>
                ) : (
                    <List dense>
                        {items.map(it => {
                            const checked = selectedIds.includes(it.id);
                            const statusText = it.isInstalled ? t('statusInstalled') : t('statusNotInstalled');
                            const statusColor = it.isInstalled ? 'success.main' : 'warning.main';

                            return (
                                <ListItem key={it.id} disableGutters>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge='start'
                                            onChange={() =>
                                                setSelectedIds(prev =>
                                                    prev.includes(it.id)
                                                        ? prev.filter(x => x !== it.id)
                                                        : [...prev, it.id]
                                                )
                                            }
                                            checked={checked}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Stack direction='row' spacing={1} alignItems='center'>
                                                <Typography>{it.name}</Typography>
                                                <Typography
                                                    variant='caption'
                                                    sx={{
                                                        px: 1,
                                                        py: 0.25,
                                                        borderRadius: 1,
                                                        bgcolor: statusColor,
                                                        color: 'white',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    {statusText}
                                                </Typography>
                                            </Stack>
                                        }
                                        secondary={[it.id, it.version ? `v${it.version}` : '']
                                            .filter(Boolean)
                                            .join(' / ')}
                                    />
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Paper>
        </Container>
    );

    return (
        <React.StrictMode>
            <ThemeProvider theme={muiTheme}>
                <CssBaseline />
                <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <TitleBar info={info} onOpenSettings={() => setView('settings')} />
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {view === 'settings' ? SettingsView : view === 'details' ? DetailsView : HomeView}
                    </Box>
                    <Dialog open={scriptDialogOpen} onClose={() => setScriptDialogOpen(false)} maxWidth='md' fullWidth>
                        <DialogTitle>
                            {t('scriptTitle')}
                            <IconButton
                                onClick={copyScriptToClipboard}
                                sx={{ position: 'absolute', right: 48, top: 8 }}
                                title={t('copyToClipboard')}
                            >
                                <ContentCopyIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            <TextField
                                multiline
                                fullWidth
                                value={scriptContent}
                                InputProps={{
                                    readOnly: true,
                                    sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                                }}
                                minRows={10}
                                maxRows={20}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setScriptDialogOpen(false)}>{t('close')}</Button>
                        </DialogActions>
                    </Dialog>

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
