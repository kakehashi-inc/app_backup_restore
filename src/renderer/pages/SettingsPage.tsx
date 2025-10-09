import React from 'react';
import {
    Container,
    Typography,
    Button,
    Stack,
    Divider,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useAppStore from '../store/useAppStore';

interface SettingsPageProps {
    onChooseBackupDirectory: () => Promise<void>;
    onValidateBackupDirectory: () => Promise<boolean>;
    onSetLanguage: (lang: 'ja' | 'en') => Promise<void>;
    onSetTheme: (theme: 'light' | 'dark') => Promise<void>;
    onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    onChooseBackupDirectory,
    onValidateBackupDirectory,
    onSetLanguage,
    onSetTheme,
    onClose,
}) => {
    const { t } = useTranslation();
    const { config, info } = useAppStore();

    const isFirstTimeSetup = !config.backupDirectory;

    return (
        <Container maxWidth='sm' sx={{ py: 4 }}>
            <Typography variant='h5' gutterBottom>
                {isFirstTimeSetup ? t('firstTimeSetup') : t('settings')}
            </Typography>
            {isFirstTimeSetup && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                    {t('firstTimeSetupMessage')}
                </Typography>
            )}

            {/* Language Setting */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('language')}</InputLabel>
                <Select
                    value={info?.language || 'en'}
                    label={t('language')}
                    onChange={async e => {
                        const lang = e.target.value as 'ja' | 'en';
                        await onSetLanguage(lang);
                    }}
                >
                    <MenuItem value='ja'>日本語</MenuItem>
                    <MenuItem value='en'>English</MenuItem>
                </Select>
            </FormControl>

            {/* Dark Mode Setting */}
            <FormControlLabel
                control={
                    <Switch
                        checked={info?.theme === 'dark'}
                        onChange={async () => {
                            const next = info?.theme === 'dark' ? 'light' : 'dark';
                            await onSetTheme(next);
                        }}
                    />
                }
                label={t('darkMode')}
                sx={{ mb: 3 }}
            />

            <Divider sx={{ mb: 3 }} />

            {/* Backup Directory Setting */}
            <Typography variant='h6' gutterBottom>
                {t('backupDir')}
            </Typography>
            <TextField
                fullWidth
                size='small'
                value={config.backupDirectory}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
            />
            <Button variant='contained' onClick={onChooseBackupDirectory} sx={{ mb: 4 }}>
                {t('chooseBackupDir')}
            </Button>

            {/* Action Buttons */}
            <Divider sx={{ mb: 3 }} />
            <Stack direction='row' spacing={2} justifyContent='flex-end'>
                <Button variant='text' onClick={onClose}>
                    {t('cancel')}
                </Button>
                <Button
                    variant='outlined'
                    onClick={async () => {
                        const valid = await onValidateBackupDirectory();
                        if (valid) {
                            // This will be handled by the parent component
                        }
                    }}
                    disabled={!config.backupDirectory}
                >
                    {t('save')}
                </Button>
            </Stack>
        </Container>
    );
};
