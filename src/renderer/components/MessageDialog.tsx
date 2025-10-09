import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export type DialogType = 'ok' | 'yesno' | 'yesnocancel';

export interface MessageDialogProps {
    open: boolean;
    onClose: () => void;
    onResult?: (result: 'ok' | 'yes' | 'no' | 'cancel') => void;
    title?: string;
    message: string;
    type: DialogType;
    okText?: string;
    yesText?: string;
    noText?: string;
    cancelText?: string;
}

export const MessageDialog: React.FC<MessageDialogProps> = ({
    open,
    onClose,
    onResult,
    title,
    message,
    type,
    okText = 'OK',
    yesText = 'Yes',
    noText = 'No',
    cancelText = 'Cancel',
}) => {
    const handleResult = (result: 'ok' | 'yes' | 'no' | 'cancel') => {
        onResult?.(result);
        onClose();
    };

    const renderButtons = () => {
        switch (type) {
            case 'ok':
                return (
                    <Button variant='contained' color='primary' onClick={() => handleResult('ok')} autoFocus>
                        {okText}
                    </Button>
                );
            case 'yesno':
                return (
                    <>
                        <Button variant='outlined' onClick={() => handleResult('no')}>
                            {noText}
                        </Button>
                        <Button variant='contained' color='primary' onClick={() => handleResult('yes')} autoFocus>
                            {yesText}
                        </Button>
                    </>
                );
            case 'yesnocancel':
                return (
                    <>
                        <Button variant='outlined' onClick={() => handleResult('cancel')}>
                            {cancelText}
                        </Button>
                        <Button variant='outlined' onClick={() => handleResult('no')}>
                            {noText}
                        </Button>
                        <Button variant='contained' color='primary' onClick={() => handleResult('yes')} autoFocus>
                            {yesText}
                        </Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                    {title}
                </Typography>
                <IconButton size='small' onClick={onClose} sx={{ ml: 1 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
                        {message}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>{renderButtons()}</DialogActions>
        </Dialog>
    );
};

export default MessageDialog;
