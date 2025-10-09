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
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { AppConfig, ManagerId, AppInfo, BackupMetadata, MergedPackageItem } from '@shared/types';
import './i18n/config';
import { useTranslation } from 'react-i18next';
import TitleBar from './components/TitleBar';

const managerDefs: { id: ManagerId; label: string; os: ('win32' | 'darwin' | 'linux')[] }[] = [
    { id: 'winget', label: 'Winget', os: ['win32'] },
    { id: 'msstore', label: 'Microsoft Store', os: ['win32'] },
    { id: 'scoop', label: 'Scoop', os: ['win32'] },
    { id: 'chocolatey', label: 'Chocolatey', os: ['win32'] },
];

const editors = [
    { id: 'vscode', label: 'VS Code' },
    { id: 'cursor', label: 'Cursor' },
    { id: 'voideditor', label: 'Void Editor' },
];

const configApps = [
    { id: 'git_config', label: 'Git Config' },
    { id: 'npm_config', label: 'NPM Config' },
    { id: 'pypi_config', label: 'PyPI Config' },
    { id: 'wsl_config', label: 'WSL Config' },
    { id: 'powershell_profile', label: 'PowerShell Profile' },
    { id: 'claude_desktop', label: 'Claude Desktop' },
    { id: 'tabby', label: 'Tabby Terminal' },
    { id: 'filezilla', label: 'FileZilla' },
    { id: 'dbgate', label: 'DbGate' },
];

type View = 'settings' | 'home' | 'details';

function App() {
    const { t, i18n } = useTranslation();
    const [config, setConfig] = React.useState<AppConfig>({ backupDirectory: '' });
    const [info, setInfo] = React.useState<AppInfo>();
    const [metadata, setMetadata] = React.useState<BackupMetadata>({} as BackupMetadata);

    const [selectedManager, setSelectedManager] = React.useState<ManagerId>('winget');
    const [items, setItems] = React.useState<MergedPackageItem[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [view, setView] = React.useState<View>('home');
    const [loadingItems, setLoadingItems] = React.useState(false);

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
            const md = (await window.abr.getBackupMetadata?.()) || {};
            setMetadata(md as BackupMetadata);
        })();
    }, [i18n]);

    const refreshMetadata = React.useCallback(async () => {
        const md = (await window.abr.getBackupMetadata?.()) || {};
        setMetadata(md as BackupMetadata);
    }, []);

    const openDetails = async (id: string) => {
        setItems([]);
        setSelectedIds([]);

        if (['winget', 'msstore', 'scoop', 'chocolatey'].includes(id)) {
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
            }
        } else {
            // Editors/configs: no listPackages here
            setItems([]);
            setView('details');
        }
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

    const confirm = (message: string) => window.confirm(message);

    const runBackupAll = async (ids: string[]) => {
        if (!confirm(t('confirmBulkBackup'))) return;
        const mgrs = ids.filter(x => ['winget', 'msstore', 'scoop', 'chocolatey'].includes(x)) as ManagerId[];
        if (mgrs.length) await window.abr.runBackup(mgrs);
        await refreshMetadata();
    };

    const runBackupSelected = async () => {
        // Only backup installed items
        const installedIds = items.filter(it => selectedIds.includes(it.id) && it.isInstalled).map(it => it.id);
        if (installedIds.length === 0) return;
        await window.abr.runBackupSelected?.(selectedManager, installedIds);
        await refreshMetadata();
    };

    const runRestoreExecute = async () => {
        // Only restore not-installed items
        const notInstalledIds = items.filter(it => selectedIds.includes(it.id) && !it.isInstalled).map(it => it.id);
        if (notInstalledIds.length === 0) return;
        if (!confirm(t('confirmRestore'))) return;
        await window.abr.runRestore({ managerId: selectedManager, identifiers: notInstalledIds, mode: 'execute' });
    };

    const muiTheme = React.useMemo(
        () => createTheme({ palette: { mode: (info?.theme ?? 'light') as 'light' | 'dark' } }),
        [info?.theme]
    );

    const os = info?.os || 'win32';

    const pmRows = managerDefs
        .filter(m => m.os.includes(os as any))
        .map(m => ({ id: m.id, name: m.label, last: metadata?.[m.id]?.last_backup }));

    const editorRows = editors.map(e => ({ id: e.id, name: e.label, last: metadata?.[e.id]?.last_backup }));
    const configRows = configApps.map(c => ({ id: c.id, name: c.label, last: metadata?.[c.id]?.last_backup }));

    const SettingsView = (
        <Container maxWidth='sm' sx={{ py: 4 }}>
            <Typography variant='h5' gutterBottom>
                {t('backupDir')}
            </Typography>
            <TextField
                fullWidth
                size='small'
                value={config.backupDirectory}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
            />
            <Stack direction='row' spacing={2}>
                <Button
                    variant='contained'
                    onClick={async () => {
                        const cfg = await window.abr.chooseBackupDirectory();
                        setConfig(cfg);
                    }}
                >
                    {t('chooseBackupDir')}
                </Button>
                <Button
                    variant='outlined'
                    onClick={async () => {
                        const valid = await window.abr.validateBackupDirectory?.();
                        if (valid) setView('home');
                    }}
                    disabled={!config.backupDirectory}
                >
                    {t('ok')}
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
                            disabled={!config.backupDirectory}
                            onClick={() => runBackupAll(pmRows.map(r => r.id))}
                        >
                            {t('backupAll')}
                        </Button>
                    </Stack>
                </Stack>
                <Table size='small' sx={{ mt: 1 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                            <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{t('lastBackup')}</TableCell>
                            <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...pmRows, ...editorRows].map(r => (
                            <TableRow
                                key={r.id}
                                hover
                                onDoubleClick={() => openDetails(r.id)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{r.last || '-'}</TableCell>
                                <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                    <Stack direction='row' spacing={1}>
                                        <Button size='small' variant='outlined' onClick={() => openDetails(r.id)}>
                                            {t('details')}
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            {/* Backup Targets (config files) */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='h6'>{t('backupTargetsTitle')}</Typography>
                    <Button
                        variant='contained'
                        disabled={!config.backupDirectory}
                        onClick={() => runBackupAll(configRows.map(r => r.id))}
                    >
                        {t('backupAll')}
                    </Button>
                </Stack>
                <Table size='small' sx={{ mt: 1 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '100%' }}>{t('appColumn')}</TableCell>
                            <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{t('lastBackup')}</TableCell>
                            <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>{t('actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {configRows.map(r => (
                            <TableRow key={r.id} hover>
                                <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>{r.last || '-'}</TableCell>
                                <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                    <Stack direction='row' spacing={1}>
                                        <Button size='small' variant='contained' disabled={!config.backupDirectory}>
                                            {t('backup')}
                                        </Button>
                                        <Button size='small' variant='outlined'>
                                            {t('restore')}
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Container>
    );

    const selectedInstalledCount = items.filter(it => selectedIds.includes(it.id) && it.isInstalled).length;
    const selectedNotInstalledCount = items.filter(it => selectedIds.includes(it.id) && !it.isInstalled).length;

    const DetailsView = (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
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
                        <Typography variant='body2'>{t('loading')}</Typography>
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
                    <TitleBar
                        info={info}
                        onToggleTheme={async () => {
                            const current = await window.abr.getAppInfo();
                            const next = current.theme === 'dark' ? 'light' : 'dark';
                            await window.abr.setTheme(next);
                            setInfo({ ...current, theme: next });
                        }}
                        onChangeLanguage={async lang => {
                            await window.abr.setLanguage(lang);
                            setInfo(prev => (prev ? { ...prev, language: lang } : prev));
                            i18n.changeLanguage(lang);
                        }}
                        onOpenSettings={() => setView('settings')}
                    />
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {view === 'settings' ? SettingsView : view === 'details' ? DetailsView : HomeView}
                    </Box>
                </Box>
            </ThemeProvider>
        </React.StrictMode>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
