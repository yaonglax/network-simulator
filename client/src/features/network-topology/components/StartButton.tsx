import React, { useState } from 'react';
import { Button } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import { useNetworkStore } from '../store/network-store';

interface StartButtonProps {
    isPlaying: boolean;
    onToggle: () => void;
}

const StartButton = ({ isPlaying, onToggle }: StartButtonProps) => {
    const packets = useNetworkStore((state) => state.packets)
    return (
        <Button
            variant="contained"
            onClick={onToggle}
            disabled={Object.values(packets).length === 0}
            startIcon={isPlaying ? <Pause /> : <PlayArrow />}
            sx={{
                position: 'absolute', right: '60px', top: '90px', zIndex: 1000, backgroundColor: isPlaying ? 'var(--accent-purple)' : 'var(--element-gray)', color: 'var(--contrast-white)',
                '&:hover': { bgcolor: 'var(--hover-purple)', boxShadow: '0px 0px 1px var(--highlight-purple)', color: 'var(--text-gray)' },
            }}
        >
            {isPlaying ? 'Пауза' : 'Старт'}
        </Button>
    );
};

export default StartButton;