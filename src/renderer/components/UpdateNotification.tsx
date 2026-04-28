import React from 'react';
import { Snackbar, Alert, Button, LinearProgress, Stack, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { UpdateState } from '@shared/types';

export const UpdateNotification: React.FC = () => {
    const { t } = useTranslation();
    const [state, setState] = React.useState<UpdateState>({ status: 'idle' });
    const [dismissed, setDismissed] = React.useState(false);

    React.useEffect(() => {
        const updater = window.abr.updater;
        if (!updater) return;

        // Subscribe first, then fetch state to avoid missing transitions.
        const unsubscribe = updater.onStateChanged(next => {
            setState(next);
        });

        let cancelled = false;
        updater
            .getState()
            .then(initial => {
                if (!cancelled) setState(initial);
            })
            .catch(() => {
                /* no-op */
            });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    React.useEffect(() => {
        if (state.status === 'available') {
            setDismissed(false);
        }
    }, [state.status, state.version]);

    const handleUpdate = async () => {
        try {
            await window.abr.updater.download();
        } catch {
            /* errors are surfaced via state */
        }
    };

    const handleLater = () => {
        setDismissed(true);
    };

    if (state.status === 'idle' || state.status === 'checking' || state.status === 'not-available' || state.status === 'error') {
        return null;
    }

    if (state.status === 'available' && dismissed) {
        return null;
    }

    const renderContent = () => {
        if (state.status === 'available') {
            return (
                <Alert
                    severity='info'
                    sx={{ width: '100%' }}
                    action={
                        <Stack direction='row' spacing={1}>
                            <Button color='inherit' size='small' onClick={handleLater}>
                                {t('updater.later')}
                            </Button>
                            <Button color='inherit' size='small' variant='outlined' onClick={handleUpdate}>
                                {t('updater.update')}
                            </Button>
                        </Stack>
                    }
                >
                    {t('updater.confirm', { version: state.version ?? '' })}
                </Alert>
            );
        }

        if (state.status === 'downloading') {
            const progress = Math.max(0, Math.min(100, Math.round(state.progress ?? 0)));
            return (
                <Alert severity='info' icon={false} sx={{ width: '100%' }}>
                    <Box sx={{ minWidth: 280 }}>
                        <Typography variant='body2' sx={{ mb: 1 }}>
                            {t('updater.downloading', { progress })}
                        </Typography>
                        <LinearProgress variant='determinate' value={progress} />
                    </Box>
                </Alert>
            );
        }

        // downloaded
        return (
            <Alert severity='success' icon={false} sx={{ width: '100%' }}>
                <Box sx={{ minWidth: 280 }}>
                    <Typography variant='body2' sx={{ mb: 1 }}>
                        {t('updater.installing')}
                    </Typography>
                    <LinearProgress />
                </Box>
            </Alert>
        );
    };

    return (
        <Snackbar
            open
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={null}
        >
            {renderContent()}
        </Snackbar>
    );
};

export default UpdateNotification;
