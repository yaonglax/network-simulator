import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Device } from '../types';
import { HostIcon, RouterIcon, SwitchIcon } from '@/assets/entities/Icons';
import { useNetworkStore } from '../store/network-store';

const ICON_MAP = {
    host: <HostIcon />,
    switch: <SwitchIcon />,
    router: <RouterIcon />
}

interface DeviceEntityProps {
    device: Device,
    onContextMenu: () => void,
    handlePopoverOpen: (event: React.MouseEvent<HTMLElement>) => void,
    handlePopoverClose: () => void,
    onDoubleClick: (e: React.MouseEvent<HTMLElement>) => void,
    isDraggable?: boolean;
}

export const DeviceEntity: React.FC<DeviceEntityProps> = ({
    device,
    onContextMenu,
    handlePopoverOpen,
    handlePopoverClose,
    onDoubleClick,
    isDraggable
}) => {
    const updateDevice = useNetworkStore((state) => state.updateDevice);
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleDragStart = (e: React.DragEvent) => {
        if (!isDraggable) {
            e.preventDefault();
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.dataTransfer.setData('application/reactflow/device', 'move');
        setIsDragging(true);
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        onContextMenu();
        handlePopoverOpen(e);
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onDoubleClick(e);
    }
    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
        handlePopoverOpen(e);
    }

    const handleDragEnd = (e: React.DragEvent) => {
        const canvas = document.getElementById('network-canvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;

        let x = e.clientX - canvasRect.left - offset.x;
        let y = e.clientY - canvasRect.top - offset.y;

        const padding = 20;
        const minX = padding;
        const minY = padding;
        const maxX = canvasWidth - padding - 100;
        const maxY = canvasHeight - padding - 100;

        x = Math.max(minX, Math.min(x, maxX));
        y = Math.max(minY, Math.min(y, maxY));

        updateDevice(device.id, { x, y });
        setIsDragging(false);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        if (!isDraggable) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <Box
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
            onDragEnd={isDraggable ? handleDragEnd : undefined}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            sx={{
                position: 'absolute',
                left: device.x,
                top: device.y,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isDraggable ? 'move' : 'not-allowed',
                opacity: isDragging ? 0.7 : 1,
                zIndex: isDragging ? 1000 : 1,
            }}
        >
            {ICON_MAP[device.type]}
            <Typography variant="caption" sx={{ color: 'var(--contrast-white)' }}>{device.name}</Typography>
        </Box>
    )
}