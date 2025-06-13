import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import NetworkCanvas from '@/features/network-topology/components/NetworkCanvas';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { tourSteps, GLOBAL_TOUR_KEY } from '@/features/theory/tourSteps';

const NetworkEditorPage = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [runTour, setRunTour] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

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

            <Box
                component="main"
                sx={{
                    height: '100vh',
                    width: '100%',
                    marginTop: '60px',
                }}
            >
                <NetworkCanvas />
            </Box>
        </Box>
    );
};

export default NetworkEditorPage;