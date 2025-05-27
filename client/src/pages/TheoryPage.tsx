import React, { useState, useRef } from 'react';
import PersistentDrawerLeft from '@/features/theory/Drawer';
import ControlledAccordions, { accordionData as theorySections } from '@/features/theory/ControlledAccordions';
import TheoryMarkdownViewer from '@/features/theory/TheoryMarkdownViewer';
import { Box, Button, Typography, Stack, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


const DRAWER_WIDTH = 250;

const sectionList = theorySections.map(section => ({
    title: section.title,
    mdFile: section.mdFile,
}));

const TheoryPage = () => {
    const [selected, setSelected] = useState<{ mdFile: string, anchor?: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(true);

    const accordionRef = useRef<HTMLDivElement>(null);

    const currentIndex = selected
        ? sectionList.findIndex(section => section.mdFile === selected.mdFile)
        : -1;

    const prevSection = currentIndex > 0 ? sectionList[currentIndex - 1] : null;
    const nextSection = currentIndex >= 0 && currentIndex < sectionList.length - 1 ? sectionList[currentIndex + 1] : null;

    return (
        <Box sx={{ display: 'flex', backgroundColor: 'var(--element-gray)', borderRadius: '1rem', color: 'var(--text-gray)', fontSize: '16px' }}>
            <PersistentDrawerLeft
                open={drawerOpen}
                onToggle={() => setDrawerOpen((prev) => !prev)}
            >
                <Link to={"/editor"}>
                    <Button sx={{
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
                    }}>Перейти к редактору</Button>
                </Link>
                <div id="theory-accordion" ref={accordionRef}>
                    <ControlledAccordions
                        onTopicSelect={(mdFile, anchor) => {
                            setSelected({ mdFile, anchor });

                        }}
                    />
                </div>
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
                    <>
                        <div id="theory-md-viewer">
                            <TheoryMarkdownViewer mdFile={selected.mdFile} anchor={selected.anchor} />
                        </div>
                        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" mt={2}>
                            <IconButton
                                onClick={() => setSelected(prevSection ? { mdFile: prevSection.mdFile } : selected)}
                                disabled={!prevSection}
                                aria-label="Предыдущий раздел"
                                sx={{ color: "var(--highlight-purple)" }}
                            >
                                <ArrowBackIosIcon fontSize='large' />
                            </IconButton>
                            <Typography sx={{ color: 'var(--text-gray)', fontSize: '24px', textTransform: 'uppercase' }}>
                                {sectionList[currentIndex]?.title}
                            </Typography>
                            <IconButton
                                onClick={() => setSelected(nextSection ? { mdFile: nextSection.mdFile } : selected)}
                                disabled={!nextSection}
                                aria-label="Следующий раздел"
                                sx={{ color: "var(--highlight-purple)" }}
                            >
                                <ArrowForwardIosIcon fontSize='large' />
                            </IconButton>
                        </Stack>
                    </>
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