import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Button,
    Stack,
    Divider,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    ListItemIcon,
    CircularProgress,
    Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MANAGER_DEFS } from '@shared/constants';
import useAppStore from '../store/useAppStore';
import type { MergedPackageItem } from '@shared/types';

interface PackageManagerDetailsPageProps {
    onRefresh: () => void;
    onBackupSelected: () => void;
    onRestoreExecute: () => void;
    onGenerateScript: () => void;
    onBack: () => void;
}

export const PackageManagerDetailsPage: React.FC<PackageManagerDetailsPageProps> = ({
    onRefresh,
    onBackupSelected,
    onRestoreExecute,
    onGenerateScript,
    onBack,
}) => {
    const { t } = useTranslation();
    const { selectedManager, packageItems, selectedIds, loadingItems, progressMessage, setSelectedIds } = useAppStore();

    const managerDef = MANAGER_DEFS.find(m => m.id === selectedManager);
    const selectedInstalledCount = packageItems.filter(
        (it: MergedPackageItem) => selectedIds.includes(it.id) && it.isInstalled
    ).length;
    const selectedNotInstalledCount = packageItems.filter(
        (it: MergedPackageItem) => selectedIds.includes(it.id) && !it.isInstalled
    ).length;

    return (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
                {/* Header with Back button */}
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                        {managerDef?.label || selectedManager}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button variant='text' onClick={onBack}>
                        {t('back')}
                    </Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {/* Action buttons */}
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Button variant='outlined' onClick={onRefresh} disabled={loadingItems}>
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
                        onClick={onBackupSelected}
                    >
                        {t('backup')}
                        {selectedInstalledCount > 0 && ` (${selectedInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedNotInstalledCount === 0 || loadingItems}
                        onClick={onRestoreExecute}
                    >
                        {t('restore')}
                        {selectedNotInstalledCount > 0 && ` (${selectedNotInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedIds.length === 0 || loadingItems}
                        onClick={onGenerateScript}
                    >
                        {t('generateScript')}
                        {selectedIds.length > 0 && ` (${selectedIds.length})`}
                    </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />

                {/* Selection buttons */}
                <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(packageItems.map(it => it.id))}
                        disabled={loadingItems || packageItems.length === 0}
                    >
                        {t('selectAll')}
                    </Button>
                    <Button size='small' variant='outlined' onClick={() => setSelectedIds([])} disabled={loadingItems}>
                        {t('clearAll')}
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(packageItems.filter(it => it.isInstalled).map(it => it.id))}
                        disabled={loadingItems || packageItems.length === 0}
                    >
                        {t('selectInstalled')}
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={() => setSelectedIds(packageItems.filter(it => !it.isInstalled).map(it => it.id))}
                        disabled={loadingItems || packageItems.length === 0}
                    >
                        {t('selectNotInstalled')}
                    </Button>
                </Stack>

                {/* Package list */}
                {loadingItems ? (
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ py: 4 }}>
                        <CircularProgress size={20} />
                        <Typography variant='body2'>{progressMessage || t('loading')}</Typography>
                    </Stack>
                ) : (
                    <List dense>
                        {packageItems.map((it: MergedPackageItem) => {
                            const checked = selectedIds.includes(it.id);
                            const statusText = it.isInstalled ? t('statusInstalled') : t('statusNotInstalled');
                            const statusColor = it.isInstalled ? 'success.main' : 'warning.main';

                            return (
                                <ListItem key={it.id} disableGutters>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge='start'
                                            onChange={() =>
                                                setSelectedIds(
                                                    selectedIds.includes(it.id)
                                                        ? selectedIds.filter(x => x !== it.id)
                                                        : [...selectedIds, it.id]
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
};
