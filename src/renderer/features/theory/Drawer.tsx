import React, { useEffect } from 'react';
import { useTheme, Theme } from '@mui/material/styles';
import {
    Box,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    styled
} from "@mui/material";
import {
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon
} from "@mui/icons-material";


interface OverlayProps {
    open: boolean;
    theme?: Theme;
}

interface DrawerProps {
    elementsArray?: string[];
    children?: React.ReactNode;
    open: boolean;
    onToggle: () => void;
}

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    justifyContent: 'flex-end',
}));

const Overlay = styled('div')<OverlayProps>(({ open }) => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1099,
    opacity: open ? 1 : 0,
    visibility: open ? 'visible' : 'hidden',
    transition: 'opacity 0.3s, visibility 0.3s',
}));

const DRAWER_WIDTH = 250;

export default function PersistentDrawerLeft({ elementsArray, children, open, onToggle }: DrawerProps) {
    const theme = useTheme();

    useEffect(() => {
        const openDrawer = () => {
            if (!open) onToggle();
        };
        document.addEventListener('openDrawer', openDrawer);
        return () => document.removeEventListener('openDrawer', openDrawer);
    }, [open, onToggle]);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    return (
        <>
            <Overlay open={open} onClick={onToggle} />

            <Box
                sx={{
                    position: 'fixed',
                    left: 0,
                    top: '50%',
                    width: '20px',
                    height: '55px',
                    zIndex: 1201,
                    backgroundColor: 'var(--element-gray)',
                    '&:hover': {
                        backgroundColor: 'var(--detail-gray)',
                    },
                    transform: open ? `translateX(${DRAWER_WIDTH}px)` : 'none',
                    transition: theme.transitions.create('transform', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                    clipPath: 'polygon(0 0, 100% 25%, 100% 75%, 0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}
                onClick={onToggle}
                aria-label="toggle drawer"
            >
                {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </Box>

            <Drawer
                sx={{
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        position: 'fixed',
                        zIndex: 1200,
                        height: '100vh',
                        left: 0,
                        backgroundColor: 'var(--bg-dark-gray)',
                        transform: open ? 'translateX(0)' : 'translateX(-100%)',
                        transition: theme.transitions.create('transform', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    },
                }}
                variant="persistent"
                anchor="left"
                open={open}
            >
                <DrawerHeader />
                <Divider />
                {elementsArray !== undefined ?
                    <List>
                        {elementsArray.map((text, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton>
                                    <ListItemText primary={text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    :
                    ''}
                <Box
                    component="main"
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexGrow: 1,
                        p: '5px',
                        transition: theme.transitions.create('margin', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen,
                        }),
                    }}
                >
                    {children}
                </Box>
            </Drawer>
        </>
    );
}