import React, { useState, useEffect } from 'react';
import PersistentDrawerLeft from '@/features/theory/Drawer';
import ControlledAccordions, { accordionData as theorySections } from '@/features/theory/ControlledAccordions';
import TheoryMarkdownViewer from '@/features/theory/TheoryMarkdownViewer';
import { Box, Button, Typography, Stack, IconButton } from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

const DRAWER_WIDTH = 250;
const TOUR_KEY = 'theoryTourCompleted';

const sectionList = theorySections.map(section => ({
    title: section.title,
    mdFile: section.mdFile,
}));

const joyrideSteps: Step[] = [
    {
        target: 'body',
        title: 'Добро пожаловать!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '140px', position: 'absolute', bottom: '75%', left: '-30%', rotate: '-15deg' }} />
                <span>Это обучающий тур по интерфейсу теории. Нажмите "Далее", чтобы начать!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#theory-accordion',
        title: 'Список тем',
        content: (
            <span>Здесь находится список с темами. Выберите интересующую тему для просмотра теории.</span>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '#theory-md-viewer',
        title: 'Просмотр теории',
        content: (
            <span>В этой области отображается выбранная теория. Мы открыли первую тему автоматически.</span>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '#mui-button-to-editor',
        title: 'Перейти к практике',
        content: (
            <span>Нажмите эту кнопку, чтобы перейти к редактору топологий и начать практиковаться!</span>
        ),
        placement: 'top',
        disableBeacon: true,
    },
];

const TheoryPage = () => {
    const [selected, setSelected] = useState<{ mdFile: string, anchor?: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [expandedAccordion, setExpandedAccordion] = useState<number | null>(0);
    const [runTour, setRunTour] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [firstTopicOpened, setFirstTopicOpened] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(TOUR_KEY);
        if (!completed) {
            setRunTour(true);
        }
    }, []);

    const startTour = () => {
        setRunTour(true);
        setStepIndex(0);
        setFirstTopicOpened(false);
        setSelected(null);
        setExpandedAccordion(0);
        localStorage.removeItem(TOUR_KEY);
    };

    useEffect(() => {
        if (runTour && stepIndex === 2 && !firstTopicOpened) {
            setSelected({ mdFile: sectionList[0].mdFile });
            setExpandedAccordion(0);
            setFirstTopicOpened(true);
        }
    }, [runTour, stepIndex, firstTopicOpened]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { index, status, type } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTour(false);
            localStorage.setItem(TOUR_KEY, '1');
            return;
        }
        if (type === 'step:after' || type === 'error:target_not_found') {
            setStepIndex(index + 1);
            return;
        }
    };

    const currentIndex = selected
        ? sectionList.findIndex(section => section.mdFile === selected.mdFile)
        : -1;

    const prevSection = currentIndex > 0 ? sectionList[currentIndex - 1] : null;
    const nextSection = currentIndex >= 0 && currentIndex < sectionList.length - 1 ? sectionList[currentIndex + 1] : null;

    return (
        <Box sx={{ display: 'flex', backgroundColor: 'var(--element-gray)', borderRadius: '1rem', color: 'var(--text-gray)', fontSize: '16px' }}>
            <Joyride
                steps={joyrideSteps}
                run={runTour}
                stepIndex={stepIndex}
                continuous
                locale={{
                    back: '',
                    close: '',
                    last: 'Готово',
                    next: 'Далее',
                    skip: '',
                }}
                styles={{
                    options: {
                        zIndex: 2000,
                        backgroundColor: 'var(--bg-dark-gray)',
                        color: 'var(--text-gray)',
                        borderRadius: 16,
                        boxShadow: '0 2px 16px 0 rgba(0,0,0,0.25)',
                        width: 420,
                        padding: 0,
                    },
                    tooltip: {
                        background: 'var(--bg-dark-gray)',
                        color: 'var(--text-gray)',
                        borderRadius: 16,
                        fontSize: 18,
                        padding: '28px 28px 24px 28px',
                        boxShadow: '0 2px 16px 0 rgba(0,0,0,0.25)',
                        minWidth: 320,
                        maxWidth: 440,
                    },
                    buttonNext: {
                        background: 'var(--highlight-purple)',
                        color: 'var(--text-gray)',
                        fontWeight: 700,
                        fontSize: 22,
                        borderRadius: 10,
                        minWidth: 120,
                        width: '100%',
                        minHeight: 48,
                        padding: '10px 32px',
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                    },
                    buttonBack: {
                        display: 'none',
                    },
                    buttonClose: {
                        display: 'none',
                    },
                    buttonSkip: {
                        display: 'none',
                    },
                    title: {
                        color: 'var(--text-gray)',
                        fontWeight: 700,
                        fontSize: 24,
                        marginBottom: 12,
                    },
                }}
                callback={handleJoyrideCallback}
                disableOverlayClose
            />
            <PersistentDrawerLeft
                open={drawerOpen}
                onToggle={() => setDrawerOpen((prev) => !prev)}
            >
                <Link to="/editor">
                    <Button
                        id="mui-button-to-editor"
                        sx={{
                            backgroundColor: 'var(--accent-purple)',
                            color: 'var(--contrast-white)',
                            minWidth: '20px',
                            minHeight: '12px',
                            width: '100%',
                            height: '50px',
                            borderRadius: '0.5rem',
                            '&:hover': { bgcolor: 'var(--hover-purple)', border: '1px solid var(--highlight-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)' },
                            zIndex: 1000,
                            marginTop: '15px',
                        }}
                    >
                        Перейти к редактору
                    </Button>
                </Link>
                <ControlledAccordions
                    expandedIndex={expandedAccordion}
                    onTopicSelect={(mdFile, anchor) => {
                        setSelected({ mdFile, anchor });
                        setExpandedAccordion(null);
                    }}
                />
            </PersistentDrawerLeft>
            <Box
                sx={{
                    backgroundColor: 'var(--bg-dark-gray)',
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
                <TheoryMarkdownViewer mdFile={selected?.mdFile || ''} anchor={selected?.anchor} />
                {selected && (
                    <Stack
                        className="navigation-arrows"
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                        mt={2}
                    >
                        <IconButton
                            onClick={() => setSelected(prevSection ? { mdFile: prevSection.mdFile } : selected)}
                            disabled={!prevSection}
                            aria-label="Предыдущий раздел"
                            sx={{ color: 'var(--highlight-purple)' }}
                        >
                            <ArrowBackIosIcon fontSize="large" />
                        </IconButton>
                        <Typography sx={{ color: 'var(--text-gray)', fontSize: '24px', textTransform: 'uppercase' }}>
                            {sectionList[currentIndex]?.title}
                        </Typography>
                        <IconButton
                            onClick={() => setSelected(nextSection ? { mdFile: nextSection.mdFile } : selected)}
                            disabled={!nextSection}
                            aria-label="Следующий раздел"
                            sx={{ color: 'var(--highlight-purple)' }}
                        >
                            <ArrowForwardIosIcon fontSize="large" />
                        </IconButton>
                    </Stack>
                )}
            </Box>
        </Box>
    );
};

export default TheoryPage;