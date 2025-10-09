import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Button,
    Stack,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Collapse,
    Backdrop,
    CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import { MANAGER_DEFS, VS_CODE_DEFS, CONFIG_APP_DEFS } from '@shared/constants';
import useAppStore from '../store/useAppStore';

interface HomePageProps {
    onOpenDetails: (id: string) => void;
    onRunBackupAll: (ids: string[]) => void;
    onRunBackup: (id: string, name: string) => void;
    onRunRestore: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenDetails, onRunBackupAll, onRunBackup, onRunRestore }) => {
    const { t } = useTranslation();
    const {
        config,
        info,
        metadata,
        detectedApps,
        configAvailability,
        showUnavailablePackages,
        showUnavailableConfigs,
        isProcessing,
        processingMessage,
        setShowUnavailablePackages,
        setShowUnavailableConfigs,
    } = useAppStore();

    const formatDateTime = (isoString: string | undefined, locale: string): string => {
        if (!isoString) return '-';
        try {
            const date = new Date(isoString);
            const localeCode = locale === 'ja' ? 'ja-JP' : 'en-US';
            return new Intl.DateTimeFormat(localeCode, {
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

    const os = info?.os || 'win32';

    const pmRows = MANAGER_DEFS.filter(m => m.os.includes(os as any)).map(m => ({
        id: m.id,
        name: m.label,
        last: metadata?.[m.id]?.last_backup,
    }));

    const vscodeRows = VS_CODE_DEFS.map(e => ({ id: e.id, name: e.label, last: metadata?.[e.id]?.last_backup }));
    const configRows = CONFIG_APP_DEFS.map(c => ({ id: c.id, name: c.label, last: metadata?.[c.id]?.last_backup }));

    // Split packages/extensions into available and unavailable
    const allPackageRows = [...pmRows, ...vscodeRows];
    const availablePackageRows = allPackageRows.filter(r => detectedApps[r.id]);
    const unavailablePackageRows = allPackageRows.filter(r => !detectedApps[r.id]);

    // Split config apps into available and unavailable
    const availableConfigRows = configRows.filter(r => configAvailability[r.id]);
    const unavailableConfigRows = configRows.filter(r => !configAvailability[r.id]);

    return (
        <Container maxWidth={false} sx={{ py: 2 }}>
            {/* Packages & Extensions */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Typography variant='h6'>{t('packagesTitle')}</Typography>
                    <Stack direction='row' spacing={1}>
                        <Button
                            variant='contained'
                            disabled={!config.backupDirectory || availablePackageRows.length === 0}
                            onClick={() => onRunBackupAll(availablePackageRows.map(r => r.id))}
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
                                    onDoubleClick={() => onOpenDetails(r.id)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell sx={{ width: '100%' }}>{r.name}</TableCell>
                                    <TableCell sx={{ width: '200px', whiteSpace: 'nowrap' }}>
                                        {formatDateTime(r.last, info?.language || 'en')}
                                    </TableCell>
                                    <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                        <Stack direction='row' spacing={1}>
                                            <Button
                                                size='small'
                                                variant='contained'
                                                disabled={!config.backupDirectory}
                                                onClick={() => onRunBackup(r.id, r.name)}
                                            >
                                                {t('backup')}
                                            </Button>
                                            <Button size='small' variant='outlined' onClick={() => onOpenDetails(r.id)}>
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
                                                {formatDateTime(r.last, info?.language || 'en')}
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
                        onClick={() => onRunBackupAll(availableConfigRows.map(r => r.id))}
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
                                        {formatDateTime(r.last, info?.language || 'en')}
                                    </TableCell>
                                    <TableCell sx={{ width: '220px', whiteSpace: 'nowrap' }}>
                                        <Stack direction='row' spacing={1}>
                                            <Button
                                                size='small'
                                                variant='contained'
                                                disabled={!config.backupDirectory}
                                                onClick={() => onRunBackup(r.id, r.name)}
                                            >
                                                {t('backup')}
                                            </Button>
                                            <Button size='small' variant='outlined' onClick={() => onRunRestore(r.id)}>
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
                                                {formatDateTime(r.last, info?.language || 'en')}
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

            {/* Processing overlay */}
            <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={isProcessing}>
                <Stack direction='column' alignItems='center' spacing={2}>
                    <CircularProgress color='inherit' />
                    <Typography variant='h6'>{processingMessage || t('processing')}</Typography>
                </Stack>
            </Backdrop>
        </Container>
    );
};
