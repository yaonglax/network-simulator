import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { NetworkCanvas } from '@/features/network-topology/components/NetworkCanvas/NetworkCanvas';
import PersistentDrawerLeft from '@/features/theory/Drawer';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

// Туторные шаги
const networkEditorSteps: Step[] = [
    {
        target: 'body',
        title: 'Добро пожаловать в редактор сети!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <span>Это визуальный редактор топологии сети. Давайте познакомимся с его возможностями!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '.devices-panel-root',
        title: 'Панель устройств',
        content: (
            <span>
                Здесь находятся все доступные устройства. Перетащите нужное устройство на рабочее поле для добавления в топологию.
            </span>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '#network-canvas',
        title: 'Рабочее поле',
        content: (
            <span>
                Это основное поле для построения вашей сети. Сюда можно перетаскивать устройства, соединять их и запускать симуляцию.
            </span>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '#start-simulation-btn',
        title: 'Кнопка запуска симуляции',
        content: (
            <span>
                После построения топологии нажмите эту кнопку, чтобы запустить симуляцию передачи пакетов.
            </span>
        ),
        placement: 'bottom',
        disableBeacon: true,
    },
    {
        target: '.save-load-controls-root',
        title: 'Сохранение и загрузка',
        content: (
            <span>
                Здесь вы можете сохранить текущую топологию или загрузить ранее сохранённую.
            </span>
        ),
        placement: 'top',
        disableBeacon: true,
    },
    {
        target: '#network-canvas',
        title: 'Соединение устройств и контекстное меню',
        content: (
            <div>
                <div style={{ marginBottom: 8 }}>
                    <b>Двойной клик</b> по устройству — активирует режим соединения устройств.
                </div>
                <div>
                    <b>Правая кнопка мыши</b> по устройству — открывает контекстное меню для управления портами и настройками.
                </div>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: 'body',
        title: 'Удачи!',
        content: (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/cat4.svg" alt="Маскот" style={{ width: '50px', marginRight: '15px' }} />
                <span>Желаем удачи в построении и исследовании компьютерных сетей!</span>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
];

const TOUR_KEY = 'networkEditorTourCompleted';

const NetworkEditorPage = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Joyride state
    const [runTour, setRunTour] = useState(false); // по умолчанию не запускать
    const [stepIndex, setStepIndex] = useState(0);

    // Проверяем localStorage при первом рендере
    useEffect(() => {
        const completed = localStorage.getItem(TOUR_KEY);
        if (!completed) {
            setRunTour(true);
        }
    }, []);

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

    return (
        <Box
            sx={{
                height: '100vh',
                backgroundColor: 'var(--bg-dark-gray)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <Joyride
                steps={networkEditorSteps}
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
                        minHeight: 48,
                        padding: '10px 32px',
                        margin: '0 0 0 12px',
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
            />
            <Box
                component="main"
                sx={{
                    height: '100vh',
                    width: '100%',
                }}
            >
                <NetworkCanvas />
            </Box>
        </Box>
    );
};

export default NetworkEditorPage;