import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { RestoreConflictItem } from '@shared/types';

export type RestoreConfirmResult = 'overwriteAll' | 'yes' | 'no' | 'skipAll' | 'cancel';

export interface RestoreConfirmDialogProps {
    open: boolean;
    conflict: RestoreConflictItem | null;
    currentIndex: number;
    totalCount: number;
    onResult: (result: RestoreConfirmResult) => void;
    labels: {
        title: string;
        message: string;
        backup: string;
        target: string;
        overwriteAll: string;
        yes: string;
        no: string;
        skipAll: string;
    };
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export const RestoreConfirmDialog: React.FC<RestoreConfirmDialogProps> = ({
    open,
    conflict,
    currentIndex,
    totalCount,
    onResult,
    labels,
}) => {
    if (!conflict) return null;

    return (
        <Dialog
            open={open}
            maxWidth='sm'
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    boxShadow: 3,
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='h6' component='div'>
                    {labels.title} ({currentIndex + 1}/{totalCount})
                </Typography>
                <IconButton size='small' onClick={() => onResult('cancel')} sx={{ ml: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1, fontFamily: 'monospace' }}>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                        {labels.backup}
                    </Typography>
                    <Typography variant='body1' sx={{ mb: 2, pl: 1 }}>
                        {conflict.filePath} ({formatFileSize(conflict.backupSize)}){' '}
                        {formatDateTime(conflict.backupMtime)}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                        {labels.target}
                    </Typography>
                    <Typography variant='body1' sx={{ pl: 1 }}>
                        {conflict.filePath} ({formatFileSize(conflict.targetSize)}){' '}
                        {formatDateTime(conflict.targetMtime)}
                    </Typography>
                    <Typography variant='body1' sx={{ mt: 2 }}>
                        {labels.message}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant='outlined' size='small' onClick={() => onResult('overwriteAll')}>
                    {labels.overwriteAll}
                </Button>
                <Button variant='contained' color='primary' size='small' onClick={() => onResult('yes')} autoFocus>
                    {labels.yes}
                </Button>
                <Button variant='outlined' size='small' onClick={() => onResult('no')}>
                    {labels.no}
                </Button>
                <Button variant='outlined' size='small' onClick={() => onResult('skipAll')}>
                    {labels.skipAll}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RestoreConfirmDialog;
