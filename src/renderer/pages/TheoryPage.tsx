import React, { useState, useEffect } from 'react';
import PersistentDrawerLeft from '@/features/theory/Drawer';
import ControlledAccordions, { accordionData as theorySections } from '@/features/theory/ControlledAccordions';
import TheoryMarkdownViewer from '@/features/theory/TheoryMarkdownViewer';
import { Box, Button, Stack, IconButton, Typography, Tooltip, Switch } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import { tourSteps, GLOBAL_TOUR_KEY } from '@/features/theory/tourSteps';
import useThemeStore from '@/store/themeStore';
import { styled } from '@mui/system';

const DRAWER_WIDTH = 250;

const defaultMarkdownContent = `
# Добро пожаловать в раздел теории! 🎉

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; alignItems: center; margin: 20px 0;">
  <div class="note">
    <strong>Привет!</strong> Это раздел теории, где ты можешь узнать всё о компьютерных сетях: от базовых понятий до сложных протоколов.
  </div>
</div>

## Что здесь можно найти?

<div style="display: flex; gap: 20px; margin: 20px 0;">
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Основы сетей</h3>
    <p>Узнай, как устроены сети, что такое IP и MAC-адреса, и как работает передача данных.</p>
  </div>
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Протоколы</h3>
    <p>Погрузись в детали работы ARP, DHCP, OSPF и других протоколов.</p>
  </div>
  <div style="flex: 1; border: 1px solid var(--detail-gray); border-radius: 0.5rem; padding: 15px;">
    <h3 style="margin-top: 0;">Практические примеры</h3>
    <p>Изучай реальные сценарии использования и сравнения технологий.</p>
  </div>
</div>

## Как начать?

- Выбери тему из списка слева, чтобы изучить теорию.
- Перейди к редактору топологий, чтобы применить знания на практике!

<div style="position: relative; display: flex; justify-content: center; flex-direction: column; align-items: center; margin: 20px 0;">
  <div class="note">
    <strong>Совет:</strong> Используй стрелки внизу страницы, чтобы переходить между разделами.
    <img src="./cat4.svg" style="position: absolute; bottom: 0; right: 0; translate: 50% 50%; transform: rotate(30deg); width: 120px;">
  </div>
</div>

<style>
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { padding: 12px 15px; border: 1px solid var(--detail-gray); text-align: left; }
  th { background-color: var(--element-gray); font-weight: bold; }
  tr:nth-child(even) { background-color: var(--element-gray); }
  .note { border-left: 4px solid var(--highlight-purple); background-color: var(--element-gray); width: 80%; min-height: 60px; border-radius: 0.5rem; padding: 15px; position: relative; margin-top: 15px; }
  .note.warning { border-left-color: var(--warning-orange); }
  @media (max-width: 768px) {
    .comparison-cards { flex-direction: column; }
    .illustration img, .note { width: 95%; }
  }
</style>
`;

const sectionList = theorySections.map(section => ({
    title: section.title,
    mdFile: section.mdFile,
}));

const MaterialUISwitch = styled(Switch)({
    width: 52,
    height: 32,
    padding: 7,
    '& .MuiSwitch-switchBase': {
        margin: 1,
        padding: 0,
        transform: 'translateX(6px)',
        '&.Mui-checked': {
            color: 'var(--contrast-white)',
            transform: 'translateX(22px)',
            '& .MuiSwitch-thumb:before': {
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 18 18"><path fill="${encodeURIComponent(
                    '#fff',
                )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
            },
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: 'var(--accent-purple)',
            },
        },
    },
    '& .MuiSwitch-thumb': {
        backgroundColor: 'var(--highlight-purple)',
        width: 24,
        height: 24,
        marginTop: '3px',
        '&::before': {
            content: "''",
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 18 18"><path fill="${encodeURIComponent(
                '#fff',
            )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
        },
    },
    '& .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: 'var(--detail-gray)',
        borderRadius: 20 / 2,
    },
});

const TheoryPage = () => {
    const [selected, setSelected] = useState<{ mdFile: string, anchor?: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [expandedAccordion, setExpandedAccordion] = useState<number | null>(0);
    const [runTour, setRunTour] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [firstTopicOpened, setFirstTopicOpened] = useState(false);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useThemeStore();

    useEffect(() => {
        const tourState = JSON.parse(localStorage.getItem(GLOBAL_TOUR_KEY) || '{}');
        if (tourState.completed) {
            setRunTour(false);
            setStepIndex(0);
        } else {
            setRunTour(true);
            setStepIndex(tourState.stepIndex || 0);
        }
    }, []);

    const startTour = () => {
        setRunTour(true);
        setStepIndex(0);
        setFirstTopicOpened(false);
        setSelected(null);
        setExpandedAccordion(0);
        localStorage.setItem(GLOBAL_TOUR_KEY, JSON.stringify({ stepIndex: 0, completed: false }));
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
            localStorage.setItem(GLOBAL_TOUR_KEY, JSON.stringify({ stepIndex: 0, completed: true }));
            return;
        }

        if (type === 'step:after' || type === 'error:target_not_found') {
            const newIndex = index + 1;
            setStepIndex(newIndex);
            localStorage.setItem(GLOBAL_TOUR_KEY, JSON.stringify({ stepIndex: newIndex, completed: false }));

            if (newIndex === 4) {
                navigate('/editor');
            }
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
                steps={tourSteps}
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
                <Box sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <Tooltip title="Начать туториал">
                        <IconButton
                            onClick={startTour}
                            sx={{
                                color: 'var(--detail-gray)',
                                width: '25px',
                                height: '25px'
                            }}
                        >
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <MaterialUISwitch
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                        aria-label="Переключить тему"
                    />
                </Box>
                <Link to="/editor">
                    <Button
                        id="mui-button-to-editor"
                        sx={{
                            backgroundColor: 'var(--accent-purple)',
                            color: 'var(--contrast-white)',
                            minWidth: '20px',
                            minHeight: '12px',
                            width: '120%',
                            height: '50px',
                            borderRadius: '0.5rem',
                            '&:hover': { bgcolor: 'var(--hover-purple)', border: '1px solid var(--highlight-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)' },
                            zIndex: 1000,
                            marginTop: '15px',
                            marginLeft: '-15px',
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
                <TheoryMarkdownViewer mdFile={selected?.mdFile || ''} anchor={selected?.anchor} defaultContent={defaultMarkdownContent} />
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