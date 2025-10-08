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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    List,
    ListItem,
    ListItemText,
    Checkbox,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { AppConfig, ManagerId, AppInfo, AppLanguage } from '@shared/types';
import './i18n';
import { useTranslation } from 'react-i18next';
import TitleBar from './components/TitleBar';

// removed unused hook

const managers: { id: ManagerId; label: string }[] = [
    { id: 'winget', label: 'Winget' },
    { id: 'msstore', label: 'Microsoft Store' },
    { id: 'scoop', label: 'Scoop' },
    { id: 'chocolatey', label: 'Chocolatey' },
];

function App() {
    const { t, i18n } = useTranslation();
    const [config, setConfig] = React.useState<AppConfig>({ backupDirectory: '' });
    const [info, setInfo] = React.useState<AppInfo>();
    const [selectedManager, setSelectedManager] = React.useState<ManagerId>('winget');
    const [items, setItems] = React.useState<any[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

    React.useEffect(() => {
        window.abr.getConfig().then(setConfig);
        window.abr.getAppInfo().then(appInfo => {
            setInfo(appInfo);
            i18n.changeLanguage(appInfo.language);
        });
    }, [i18n]);

    const detectAndList = React.useCallback(async () => {
        await window.abr.detectManagers();
        const data = await window.abr.listPackages(selectedManager);
        setItems(data);
        setSelectedIds([]);
    }, [selectedManager]);

    React.useEffect(() => {
        detectAndList();
    }, [detectAndList]);

    const toggleId = (id: string) =>
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const runBackup = async () => {
        await window.abr.runBackup();
    };

    const runRestoreExecute = async () => {
        await window.abr.runRestore({ managerId: selectedManager, identifiers: selectedIds, mode: 'execute' });
    };

    const runRestoreScript = async () => {
        await window.abr.runRestore({ managerId: selectedManager, identifiers: selectedIds, mode: 'script' });
    };

    const muiTheme = React.useMemo(
        () => createTheme({ palette: { mode: (info?.theme ?? 'light') as 'light' | 'dark' } }),
        [info?.theme]
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
                    />
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <Container maxWidth='lg' sx={{ py: 2 }}>
                            <Typography variant='h4' gutterBottom>
                                App Backup Restore
                            </Typography>
                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Stack direction='row' spacing={2} alignItems='center'>
                                    <Typography variant='body1'>
                                        {t('backupDir')}: {config.backupDirectory || '(not set)'}
                                    </Typography>
                                    <Button
                                        variant='outlined'
                                        onClick={async () => {
                                            const cfg = await window.abr.chooseBackupDirectory();
                                            setConfig(cfg);
                                        }}
                                    >
                                        {t('chooseBackupDir')}
                                    </Button>
                                    <Button variant='contained' onClick={runBackup} disabled={!config.backupDirectory}>
                                        {t('runBackupAll')}
                                    </Button>
                                </Stack>
                            </Paper>

                            <Paper sx={{ p: 2, mb: 2 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    alignItems={{ sm: 'center' }}
                                >
                                    <FormControl size='small' sx={{ minWidth: 200 }}>
                                        <InputLabel id='mgr'>{t('manager')}</InputLabel>
                                        <Select
                                            labelId='mgr'
                                            label={t('manager')}
                                            value={selectedManager}
                                            onChange={e => setSelectedManager(e.target.value as ManagerId)}
                                        >
                                            {managers.map(m => (
                                                <MenuItem key={m.id} value={m.id}>
                                                    {m.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Button variant='outlined' onClick={detectAndList}>
                                        {t('detectAndList')}
                                    </Button>
                                    <Button
                                        variant='contained'
                                        disabled={selectedIds.length === 0}
                                        onClick={runRestoreExecute}
                                    >
                                        {t('restoreExecute')}
                                    </Button>
                                    <Button
                                        variant='contained'
                                        disabled={selectedIds.length === 0}
                                        onClick={runRestoreScript}
                                    >
                                        {t('exportScript')}
                                    </Button>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
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
                                                        onChange={() => toggleId(id)}
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
                    </Box>
                </Box>
            </ThemeProvider>
        </React.StrictMode>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
