import React, { useRef } from 'react';
import { Paper, Typography, IconButton } from '@mui/material';
import { Box } from '@mui/system';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import Draggable from 'react-draggable';
import { useNetworkStore } from '../store/network-store';

interface LogWindowProps {
    logs: string[];
    onClose: () => void;
}

const LogWindow = ({ logs, onClose }: LogWindowProps) => {
    const nodeRef = useRef(null);
    const { clearLogs } = useNetworkStore();

    const handleClearLogs = () => {
        clearLogs();
    };

    return (
        <Draggable handle=".log-window-handle" nodeRef={nodeRef}>
            <Paper
                ref={nodeRef}
                sx={{
                    position: 'absolute',
                    top: '50px',
                    left: '50px',
                    width: '400px',
                    height: '200px',
                    overflowY: 'auto',
                    padding: '10px',
                    backgroundColor: '#1e1e1e',
                    color: '#ffffff',
                    zIndex: 1000,
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                }}
            >
                <Box
                    className="log-window-handle"
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'move',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #444',
                    }}
                >
                    <Typography variant="h6" color="white">
                        Логи приложения
                    </Typography>
                    <Box>
                        <IconButton onClick={handleClearLogs} sx={{ color: 'white', marginRight: '8px' }}>
                            <DeleteIcon />
                        </IconButton>
                        <IconButton onClick={onClose} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
                <Box sx={{ marginTop: '10px' }}>
                    {logs.length === 0 ? (
                        <Typography color="gray">Нет логов</Typography>
                    ) : (
                        logs.map((log, index) => (
                            <Typography
                                key={index}
                                sx={{
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '14px',
                                }}
                            >
                                {log}
                            </Typography>
                        ))
                    )}
                </Box>
            </Paper>
        </Draggable>
    );
};

export default LogWindow;