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
    Backdrop,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { VS_CODE_DEFS } from '@shared/constants';
import useAppStore from '../store/useAppStore';
import type { MergedPackageItem } from '@shared/types';

interface VSCodeDetailsPageProps {
    onRefresh: () => void;
    onBackupSelected: () => void;
    onRestoreExecute: () => void;
    onGenerateScript: () => void;
    onBackupSettings: () => void;
    onRestoreSettings: () => void;
    onRestoreExecuteExtensionsInWSL: () => void;
    onBack: () => void;
}

export const VSCodeDetailsPage: React.FC<VSCodeDetailsPageProps> = ({
    onRefresh,
    onBackupSelected,
    onRestoreExecute,
    onGenerateScript,
    onBackupSettings,
    onRestoreSettings,
    onRestoreExecuteExtensionsInWSL,
    onBack,
}) => {
    const { t } = useTranslation();
    const {
        selectedManager,
        extensionItems,
        extensionItemsInWSL,
        selectedIds,
        selectedIdsInWSL,
        loadingItems,
        progressMessage,
        showWSLView,
        detectedApps,
        isProcessing,
        processingMessage,
        setSelectedIds,
        setSelectedIdsInWSL,
        setShowWSLView,
    } = useAppStore();

    const selectedInstalledCount = extensionItems.filter(
        (it: MergedPackageItem) => selectedIds.includes(it.id) && it.isInstalled
    ).length;
    const selectedNotInstalledCount = extensionItems.filter(
        (it: MergedPackageItem) => selectedIds.includes(it.id) && !it.isInstalled
    ).length;
    const selectedIdsInWSLNotInstalledCount = extensionItemsInWSL.filter(
        (it: MergedPackageItem) => selectedIdsInWSL.includes(it.id) && !it.isInstalled
    ).length;

    const vscodeDef = VS_CODE_DEFS.find(e => e.id === selectedManager);
    const appLabel = vscodeDef?.label || selectedManager;

    return (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
                {/* Header with app name and Back button */}
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                        {appLabel}
                    </Typography>
                    <Button
                        variant='contained'
                        color='primary'
                        onClick={onBackupSettings}
                        disabled={loadingItems || isProcessing}
                    >
                        {t('backupSettings')}
                    </Button>
                    <Button
                        variant='outlined'
                        color='primary'
                        onClick={onRestoreSettings}
                        disabled={loadingItems || isProcessing}
                    >
                        {t('restoreSettings')}
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button variant='text' onClick={onBack}>
                        {t('back')}
                    </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />

                {/* Extension List Tabs */}
                {detectedApps.wsl && extensionItemsInWSL.length > 0 && (
                    <Stack direction='row' spacing={1} sx={{ mb: 2 }}>
                        <Button
                            variant={!showWSLView ? 'contained' : 'outlined'}
                            onClick={() => setShowWSLView(false)}
                            size='small'
                        >
                            Extensions ({extensionItems.length})
                        </Button>
                        <Button
                            variant={showWSLView ? 'contained' : 'outlined'}
                            onClick={() => setShowWSLView(true)}
                            size='small'
                        >
                            Extensions in WSL ({extensionItemsInWSL.length})
                        </Button>
                    </Stack>
                )}

                {/* Action buttons */}
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Button variant='outlined' onClick={onRefresh} disabled={loadingItems || isProcessing}>
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
                        disabled={selectedInstalledCount === 0 || loadingItems || isProcessing}
                        onClick={onBackupSelected}
                    >
                        {t('backup')}
                        {selectedInstalledCount > 0 && ` (${selectedInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedNotInstalledCount === 0 || loadingItems || isProcessing}
                        onClick={onRestoreExecute}
                    >
                        {t('restore')}
                        {selectedNotInstalledCount > 0 && ` (${selectedNotInstalledCount})`}
                    </Button>
                    <Button
                        variant='outlined'
                        disabled={selectedIds.length === 0 || loadingItems || isProcessing}
                        onClick={onGenerateScript}
                    >
                        {t('generateScript')}
                        {selectedIds.length > 0 && ` (${selectedIds.length})`}
                    </Button>
                </Stack>
                <Divider sx={{ my: 2 }} />

                {/* Selection buttons */}
                <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
                    {!showWSLView ? (
                        <>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() => setSelectedIds(extensionItems.map((it: MergedPackageItem) => it.id))}
                                disabled={loadingItems || extensionItems.length === 0 || isProcessing}
                            >
                                {t('selectAll')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() => setSelectedIds([])}
                                disabled={loadingItems || isProcessing}
                            >
                                {t('clearAll')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                    setSelectedIds(extensionItems.filter(it => it.isInstalled).map(it => it.id))
                                }
                                disabled={loadingItems || extensionItems.length === 0 || isProcessing}
                            >
                                {t('selectInstalled')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                    setSelectedIds(extensionItems.filter(it => !it.isInstalled).map(it => it.id))
                                }
                                disabled={loadingItems || extensionItems.length === 0 || isProcessing}
                            >
                                {t('selectNotInstalled')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                    setSelectedIdsInWSL(extensionItemsInWSL.map((it: MergedPackageItem) => it.id))
                                }
                                disabled={loadingItems || extensionItemsInWSL.length === 0}
                            >
                                {t('selectAll')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() => setSelectedIdsInWSL([])}
                                disabled={loadingItems || isProcessing}
                            >
                                {t('clearAll')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                    setSelectedIdsInWSL(
                                        extensionItemsInWSL.filter(it => it.isInstalled).map(it => it.id)
                                    )
                                }
                                disabled={loadingItems || extensionItemsInWSL.length === 0}
                            >
                                {t('selectInstalled')}
                            </Button>
                            <Button
                                size='small'
                                variant='outlined'
                                onClick={() =>
                                    setSelectedIdsInWSL(
                                        extensionItemsInWSL.filter(it => !it.isInstalled).map(it => it.id)
                                    )
                                }
                                disabled={loadingItems || extensionItemsInWSL.length === 0}
                            >
                                {t('selectNotInstalled')}
                            </Button>
                            <Button
                                size='small'
                                variant='contained'
                                disabled={selectedIdsInWSLNotInstalledCount === 0 || loadingItems || isProcessing}
                                onClick={onRestoreExecuteExtensionsInWSL}
                            >
                                {t('restore')} ({selectedIdsInWSLNotInstalledCount})
                            </Button>
                        </>
                    )}
                </Stack>

                {/* Extension list */}
                {loadingItems ? (
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ py: 4 }}>
                        <CircularProgress size={20} />
                        <Typography variant='body2'>{progressMessage || t('loading')}</Typography>
                    </Stack>
                ) : (
                    <List dense>
                        {!showWSLView
                            ? extensionItems.map((it: MergedPackageItem) => {
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
                                                  disabled={isProcessing}
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
                              })
                            : extensionItemsInWSL.map((it: MergedPackageItem) => {
                                  const checked = selectedIdsInWSL.includes(it.id);
                                  const statusText = it.isInstalled ? t('statusInstalled') : t('statusNotInstalled');
                                  const statusColor = it.isInstalled ? 'success.main' : 'warning.main';

                                  return (
                                      <ListItem key={`wsl-${it.id}`} disableGutters>
                                          <ListItemIcon>
                                              <Checkbox
                                                  edge='start'
                                                  onChange={() =>
                                                      setSelectedIdsInWSL(
                                                          selectedIdsInWSL.includes(it.id)
                                                              ? selectedIdsInWSL.filter(x => x !== it.id)
                                                              : [...selectedIdsInWSL, it.id]
                                                      )
                                                  }
                                                  checked={checked}
                                                  disabled={isProcessing}
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
