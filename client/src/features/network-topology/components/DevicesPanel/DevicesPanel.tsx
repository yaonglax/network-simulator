import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { HostIcon } from '@/assets/entities/Icons';

const DEVICES = [
  { type: 'Host', icon: <HostIcon />, label: 'Компьютер' }
]

export const DevicesPanel = () => {
  const handleDragStart = (e: React.DragEvent, deviceType: string) => {
    e.dataTransfer.setData('application/reactflow/device', deviceType);
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <Paper sx={{ p: 2, width: 200 }}>
      <Typography variant="h6" gutterBottom>
        Устройства
      </Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        {DEVICES.map((device) => (
          <Box
            key={device.type}
            draggable
            onDragStart={(e) => handleDragStart(e, device.type)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              cursor: 'grab',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {device.icon}
            <Typography>{device.label}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
