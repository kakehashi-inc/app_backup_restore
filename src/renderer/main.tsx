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
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { AppConfig, ManagerId, AppInfo, BackupMetadata } from '@shared/types';
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
    const [items, setItems] = React.useState<any[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [view, setView] = React.useState<View>('home');

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

    const openDetails = async (id: ManagerId | 'vscode' | 'cursor' | 'voideditor') => {
        setSelectedManager(id as ManagerId);
        const data = await window.abr.listPackages(id as ManagerId);
        setItems(data);
        setSelectedIds([]);
        setView('details');
    };

    const confirm = (message: string) => window.confirm(message);

    const runBackupAll = async (ids: string[]) => {
        if (!confirm(t('confirmBulkBackup'))) return;
        const mgrs = ids.filter(x => ['winget', 'msstore', 'scoop', 'chocolatey'].includes(x)) as ManagerId[];
        if (mgrs.length) await window.abr.runBackup(mgrs);
        await refreshMetadata();
    };

    const runBackupSelected = async () => {
        if (selectedIds.length === 0) return;
        await window.abr.runBackupSelected?.(selectedManager, selectedIds);
        await refreshMetadata();
    };

    const runRestoreExecute = async () => {
        if (!confirm(t('confirmRestore'))) return;
        await window.abr.runRestore({ managerId: selectedManager, identifiers: selectedIds, mode: 'execute' });
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
                            <TableCell>{t('appColumn')}</TableCell>
                            <TableCell>{t('lastBackup')}</TableCell>
                            <TableCell>{t('actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...pmRows, ...editorRows].map(r => (
                            <TableRow
                                key={r.id}
                                hover
                                onDoubleClick={() => openDetails(r.id as any)}
                                sx={{ cursor: 'pointer' }}
                            >
                                <TableCell>{r.name}</TableCell>
                                <TableCell>{r.last || '-'}</TableCell>
                                <TableCell>
                                    <Stack direction='row' spacing={1}>
                                        <Button
                                            size='small'
                                            variant='outlined'
                                            onClick={() => openDetails(r.id as any)}
                                        >
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
                            <TableCell>{t('appColumn')}</TableCell>
                            <TableCell>{t('lastBackup')}</TableCell>
                            <TableCell>{t('actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {configRows.map(r => (
                            <TableRow key={r.id} hover>
                                <TableCell>{r.name}</TableCell>
                                <TableCell>{r.last || '-'}</TableCell>
                                <TableCell>
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

    const DetailsView = (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Button variant='outlined' onClick={() => openDetails(selectedManager)}>
                        {t('refresh')}
                    </Button>
                    <Button variant='contained' disabled={selectedIds.length === 0} onClick={runBackupSelected}>
                        {t('backup')}
                    </Button>
                    <Button variant='outlined' disabled={selectedIds.length === 0} onClick={runRestoreExecute}>
                        {t('restore')}
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
                        onClick={() => setSelectedIds(items.map((it: any) => it.PackageId || it.Name))}
                    >
                        {t('selectAll')}
                    </Button>
                    <Button size='small' variant='outlined' onClick={() => setSelectedIds([])}>
                        {t('clearAll')}
                    </Button>
                </Stack>
                <List dense>
                    {items.map((it: any) => {
                        const id = it.PackageId || it.Name;
                        const title = it.Name || it.Title || id;
                        const subtitle = it.Version ? `v${it.Version}` : '';
                        const checked = selectedIds.includes(id);
                        return (
                            <ListItem
                                key={id}
                                disableGutters
                                secondaryAction={
                                    <Checkbox
                                        edge='end'
                                        onChange={() =>
                                            setSelectedIds(prev =>
                                                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                            )
                                        }
                                        checked={checked}
                                    />
                                }
                            >
                                <ListItemText primary={title} secondary={subtitle} />
                            </ListItem>
                        );
                    })}
                </List>
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
