import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import type { AppInfo, AppLanguage } from '@shared/types';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

type Props = {
    info: AppInfo | undefined;
    onToggleTheme: () => void;
    onChangeLanguage: (lang: AppLanguage) => void;
};

export default function TitleBar({ info, onToggleTheme, onChangeLanguage }: Props) {
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [langAnchor, setLangAnchor] = React.useState<HTMLElement | null>(null);
    const [isMax, setIsMax] = React.useState(false);

    React.useEffect(() => {
        window.abr.isMaximized().then(setIsMax);
    }, []);

    return (
        <Box
            sx={{
                WebkitAppRegion: 'drag',
                display: 'flex',
                alignItems: 'center',
                px: 2,
                height: 48,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                userSelect: 'none',
            }}
        >
            <Box sx={{ flexGrow: 1, ml: 0, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant='body1' sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                    App Backup Restore
                </Typography>
                {info?.version && (
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        v{info.version}
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
                {/* Theme toggle */}
                <IconButton size='medium' onClick={onToggleTheme} sx={{ color: 'text.primary' }}>
                    {info?.theme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                </IconButton>

                {/* Language dropdown */}
                <IconButton size='medium' onClick={e => setLangAnchor(e.currentTarget)} sx={{ color: 'text.primary' }}>
                    <LanguageIcon />
                </IconButton>
                <Menu
                    anchorEl={langAnchor}
                    open={Boolean(langAnchor)}
                    onClose={() => setLangAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem
                        onClick={() => {
                            onChangeLanguage('ja');
                            setLangAnchor(null);
                        }}
                    >
                        日本語
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            onChangeLanguage('en');
                            setLangAnchor(null);
                        }}
                    >
                        English
                    </MenuItem>
                </Menu>

                {/* Burger menu */}
                <IconButton size='medium' onClick={e => setMenuAnchor(e.currentTarget)} sx={{ color: 'text.primary' }}>
                    <MenuIcon />
                </IconButton>
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem
                        onClick={() => {
                            /* settings placeholder */ setMenuAnchor(null);
                        }}
                    >
                        <SettingsIcon fontSize='small' style={{ marginRight: 8 }} />
                        設定
                    </MenuItem>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            window.abr.close();
                        }}
                    >
                        <PowerSettingsNewIcon fontSize='small' style={{ marginRight: 8 }} />
                        終了
                    </MenuItem>
                </Menu>

                {/* Window controls */}
                <IconButton
                    size='medium'
                    onClick={() => window.abr.minimize()}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <MinimizeIcon />
                </IconButton>
                <IconButton
                    size='medium'
                    onClick={async () => {
                        const m = await window.abr.maximizeOrRestore();
                        setIsMax(m);
                    }}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <CropSquareIcon />
                </IconButton>
                <IconButton
                    size='medium'
                    onClick={() => window.abr.close()}
                    sx={{
                        borderRadius: 0,
                        width: 48,
                        height: 48,
                        color: 'text.primary',
                        '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        </Box>
    );
}
