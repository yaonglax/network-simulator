import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Device } from '@/features/network-topology/types';
import { HostIcon, RouterIcon, SwitchIcon } from '@/assets/entities/Icons';
import { useNetworkStore } from '../../store/network-store';

const ICON_MAP = {
    host: <HostIcon />,
    switch: <SwitchIcon />,
    router: <RouterIcon />
}

export const DeviceEntity = ({ device }: { device: Device }) => {
    const updateDevice = useNetworkStore((state) => state.updateDevice);
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleDragStart = (e: React.DragEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.dataTransfer.setData('application/reactflow/device', 'move');
        setIsDragging(true);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;

        // Рассчитываем новые координаты с учетом границ
        let x = e.clientX - canvasRect.left - offset.x;
        let y = e.clientY - canvasRect.top - offset.y;

        // Границы canvas (можно добавить отступы)
        const padding = 20;
        const minX = padding;
        const minY = padding;
        const maxX = canvasWidth - padding - 100; // 100 - примерная ширина устройства
        const maxY = canvasHeight - padding - 100; // 100 - примерная высота устройства

        // Ограничиваем координаты границами
        x = Math.max(minX, Math.min(x, maxX));
        y = Math.max(minY, Math.min(y, maxY));

        updateDevice(device.id, { x, y });
        setIsDragging(false);
    };

    return (
        <Box
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            sx={{
                position: 'absolute',
                left: device.x,
                top: device.y,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'move',
                opacity: isDragging ? 0.7 : 1,
                zIndex: isDragging ? 1000 : 1,
            }}
        >
            {ICON_MAP[device.type]}
            <Typography variant="caption">{device.name}</Typography>
        </Box>
    )
}