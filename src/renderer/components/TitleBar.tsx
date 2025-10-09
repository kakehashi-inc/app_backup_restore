import React from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import type { AppInfo } from '@shared/types';
import MenuIcon from '@mui/icons-material/Menu';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

type Props = {
    info: AppInfo | undefined;
    onOpenSettings?: () => void;
};

export default function TitleBar({ info, onOpenSettings }: Props) {
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

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
                            setMenuAnchor(null);
                            onOpenSettings?.();
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
                        await window.abr.maximizeOrRestore();
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
