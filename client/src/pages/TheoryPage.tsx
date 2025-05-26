import React, { useState } from 'react';
import PersistentDrawerLeft from '@/features/theory/Drawer';
import ControlledAccordions from '@/features/theory/ControlledAccordions';
import TheoryMarkdownViewer from '@/features/theory/TheoryMarkdownViewer';
import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const DRAWER_WIDTH = 250;

const TheoryPage = () => {
    // Используем единый state для mdFile и anchor
    const [selected, setSelected] = useState<{ mdFile: string, anchor?: string } | null>(null);
    // Управляем состоянием Drawer здесь
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <Box sx={{ display: 'flex' }}>
            <PersistentDrawerLeft
                open={drawerOpen}
                onToggle={() => setDrawerOpen((prev) => !prev)}
            >
                <Link to={"/editor"}><Button sx={{
                    backgroundColor: 'var(--accent-purple)',
                    color: 'var(--contrast-white)',
                    minWidth: '20px',
                    minHeight: '12px',
                    width: '100%',
                    height: '50px',
                    borderRadius: '0.5rem',
                    '&:hover': { bgcolor: 'var(--hover-purple)', border: '1px solid var(--highlight-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)' },
                    zIndex: 1000,
                    marginTop: '15px'
                }}>Перейти к редактору</Button></Link>
                <ControlledAccordions onTopicSelect={(mdFile, anchor) => setSelected({ mdFile, anchor })} />
            </PersistentDrawerLeft>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: 0,
                    minHeight: '100vh',
                    transition: (theme) =>
                        theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    marginLeft: drawerOpen ? `${DRAWER_WIDTH}px` : 0,
                    width: drawerOpen
                        ? { xs: '100%', sm: `calc(100% - ${DRAWER_WIDTH}px)` }
                        : '100%',
                }}
            >
                {selected ? (
                    <TheoryMarkdownViewer mdFile={selected.mdFile} anchor={selected.anchor} />
                ) : (
                    <Typography variant="h5" color="text.secondary">
                        Выберите тему в меню слева
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default TheoryPage;