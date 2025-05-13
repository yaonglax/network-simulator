import React from 'react';
import { Button } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';

interface StartButtonProps {
    isPlaying: boolean;
    onToggle: () => void;
}

const StartButton = ({ isPlaying, onToggle }: StartButtonProps) => {
    return (
        <Button
            variant="contained"
            onClick={onToggle}
            startIcon={isPlaying ? <Pause /> : <PlayArrow />}
            sx={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}
        >
            {isPlaying ? 'Пауза' : 'Старт'}
        </Button>
    );
};

export default StartButton;