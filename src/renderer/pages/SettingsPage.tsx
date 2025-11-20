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

interface SettingsSaveRequest {
    language: 'ja' | 'en';
    theme: 'light' | 'dark';
}

interface SettingsPageProps {
    onChooseBackupDirectory: () => Promise<void>;
    onSaveSettings: (request: SettingsSaveRequest) => Promise<boolean>;
    onClose: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onChooseBackupDirectory, onSaveSettings, onClose }) => {
    const { t } = useTranslation();
    const { config, info } = useAppStore();
    const [language, setLanguage] = React.useState<'ja' | 'en'>(info?.language || 'en');
    const [theme, setTheme] = React.useState<'light' | 'dark'>((info?.theme as 'light' | 'dark') || 'light');
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        setLanguage(info?.language || 'en');
    }, [info?.language]);

    React.useEffect(() => {
        setTheme((info?.theme as 'light' | 'dark') || 'light');
    }, [info?.theme]);

    const handleSave = React.useCallback(async () => {
        if (saving) return;
        setSaving(true);
        try {
            const success = await onSaveSettings({ language, theme });
            if (success) {
                onClose();
            }
        } finally {
            setSaving(false);
        }
    }, [language, theme, onSaveSettings, onClose, saving]);

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
                    value={language}
                    label={t('language')}
                    onChange={e => {
                        const lang = e.target.value as 'ja' | 'en';
                        setLanguage(lang);
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
                        checked={theme === 'dark'}
                        onChange={() => {
                            setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
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
                <Button variant='outlined' onClick={handleSave} disabled={!config.backupDirectory || saving}>
                    {t('save')}
                </Button>
            </Stack>
        </Container>
    );
};
