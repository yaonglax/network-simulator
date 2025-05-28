import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { HostIcon, SwitchIcon, RouterIcon } from '@/assets/entities/Icons';
import { SaveLoadControls } from '../SaveLoadControls/SaveLoadControls';

const DEVICES = [
  { type: 'Host', icon: <HostIcon />, label: 'Компьютер' },
  { type: 'Switch', icon: <SwitchIcon />, label: 'Коммутатор' }

]

export const DevicesPanel = () => {
  const handleDragStart = (e: React.DragEvent, deviceType: string) => {
    e.dataTransfer.setData('application/reactflow/device', deviceType);
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <Paper className='devices-panel-root' sx={{ paddingTop: 2, paddingLeft: 3, width: '100%', height: 130, position: 'absolute', bottom: 0, left: 0, backgroundColor: 'var(--element-gray)' }}>
      <Typography variant="h5" gutterBottom color='White' fontWeight={700} sx={{ color: 'var(--contrast-white)' }}>
        УСТРОЙСТВА
      </Typography>
      <Box display="flex" flexDirection="row" gap={2}>
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
              '&:hover': { bgcolor: 'var(--detail-gray)', color: 'var(--contrast-white)' },
              color: 'var(--text-gray)',
              fontSize: '16px',
              fontWeight: '800',
              borderRadius: '0.5rem'
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
