import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';

interface ScriptDialogProps {
    open: boolean;
    content: string;
    onClose: () => void;
    onCopy: () => void;
}

export const ScriptDialog: React.FC<ScriptDialogProps> = ({ open, content, onClose, onCopy }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle>
                {t('scriptTitle')}
                <IconButton
                    onClick={onCopy}
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
                    value={content}
                    InputProps={{
                        readOnly: true,
                        sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                    }}
                    minRows={10}
                    maxRows={20}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    );
};
