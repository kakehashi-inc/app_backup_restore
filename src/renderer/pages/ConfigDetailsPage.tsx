import React from 'react';
import { Container, Paper, Typography, Button, Stack, Divider, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CONFIG_APP_DEFS } from '@shared/constants';
import useAppStore from '../store/useAppStore';

interface ConfigDetailsPageProps {
    onBackup: () => void;
    onRestore: () => void;
    onBack: () => void;
}

export const ConfigDetailsPage: React.FC<ConfigDetailsPageProps> = ({ onBackup, onRestore, onBack }) => {
    const { t } = useTranslation();
    const { selectedManager } = useAppStore();

    const configDef = CONFIG_APP_DEFS.find(c => c.id === selectedManager);

    return (
        <Container maxWidth={false} sx={{ py: 2 }}>
            <Paper sx={{ p: 2, mb: 4 }}>
                {/* Header with Back button */}
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 2 }}>
                    <Typography variant='h6' sx={{ fontWeight: 'bold' }}>
                        {configDef?.label || selectedManager}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button variant='text' onClick={onBack}>
                        {t('back')}
                    </Button>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {/* Action buttons */}
                <Stack direction='row' spacing={2} alignItems='center'>
                    <Button variant='contained' onClick={onBackup}>
                        {t('backup')}
                    </Button>
                    <Button variant='outlined' onClick={onRestore}>
                        {t('restore')}
                    </Button>
                </Stack>

                {/* Info text */}
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                    {t('configFileDescription')}
                </Typography>
            </Paper>
        </Container>
    );
};
