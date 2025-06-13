import React, { useMemo, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpOutline, MailOutline } from '@mui/icons-material';
import { useNetworkStore } from '../store/network-store';

interface PacketEntityProps {
    packetId: string;
    isPlaying: boolean;
}

const PacketEntity = ({ packetId, isPlaying }: PacketEntityProps) => {
    const packet = useNetworkStore((state) => state.packets[packetId]);
    const devices = useNetworkStore((state) => state.devices);
    const canvasRef = useRef<HTMLElement | null>(null);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const packetRef = useRef<HTMLDivElement | null>(null);
    const [animationComplete, setAnimationComplete] = useState(true);

    useLayoutEffect(() => {
        const canvas = document.getElementById('network-canvas');
        const updateOffset = () => {
            if (canvas) {
                canvasRef.current = canvas;
                const newOffset = { x: canvas.offsetLeft, y: canvas.offsetTop };
                setCanvasOffset((prev) => {
                    if (prev.x !== newOffset.x || prev.y !== newOffset.y) return newOffset;
                    return prev;
                });
            } else {
                console.warn('Network canvas not found, cannot update offset');
            }
        };
        updateOffset();
        window.addEventListener('resize', updateOffset);
        return () => window.removeEventListener('resize', updateOffset);
    }, []);

    if (!packet) {
        console.warn(`Packet ${packetId} not found, skipping render`);
        return null;
    }

    const currentPosition = useMemo(() => {
        if (!packet.path || packet.path.length === 0) {
            return { x: (packet.x ?? 0) + 25, y: (packet.y ?? 0) + 25 };
        }

        let lastValid = { x: (packet.x ?? 0) + 25, y: (packet.y ?? 0) + 25 };
        const points = packet.path.map((hop) => {
            const device = devices[hop.deviceId];
            if (!device || device.x === undefined || device.y === undefined) {
                return lastValid;
            }
            lastValid = { x: device.x + 25, y: device.y + 25 };
            return lastValid;
        });

        if (packet.currentHop >= points.length) {
            return points.length > 0
                ? points[points.length - 1]
                : { x: (packet.x ?? 0) + 25, y: (packet.y ?? 0) + 25 };
        }
        return points[packet.currentHop];
    }, [devices, packet.path, packet.currentHop, packet.x, packet.y]);

    useEffect(() => {
        console.log(`Packet ${packetId} state:`, {
            currentHop: packet.currentHop,
            isFlooded: packet.isFlooded,
            isPlaying,
            animationComplete,
            path: packet.path?.map((hop) => hop.deviceId),
            type: packet.type,
            position: currentPosition,
            canvasOffset,
            initialPacketPosition: { x: packet.x, y: packet.y },
        });
    }, [packetId, packet.currentHop, packet.isFlooded, isPlaying, animationComplete, packet.path, packet.type, currentPosition, canvasOffset]);

    const { packetColor, packetIcon } = useMemo(() => {
        if (packet.type === 'ARP') {
            if (packet.isResponse) {
                return { packetColor: '#4caf50', packetIcon: <MailOutline fontSize="small" /> };
            } else {
                return { packetColor: '#ff9800', packetIcon: <HelpOutline fontSize="small" /> };
            }
        } else if (packet.isFlooded) {
            return { packetColor: 'pink', packetIcon: <MailOutline fontSize="small" /> };
        } else if (packet.isResponse) {
            return { packetColor: '#1976d2', packetIcon: <MailOutline fontSize="small" /> };
        } else {
            return { packetColor: '#2196f3', packetIcon: <MailOutline fontSize="small" /> };
        }
    }, [packet.type, packet.isResponse, packet.isFlooded]);

    if (!currentPosition || typeof currentPosition.x !== 'number' || typeof currentPosition.y !== 'number') {
        console.warn(`Invalid position for packet ${packetId}:`, currentPosition);
        return null;
    }

    const variants = {
        playing: {
            x: currentPosition.x,
            y: currentPosition.y,
            transition: { duration: 1.5, ease: 'linear' },
        },
        stopped: {
            x: currentPosition.x,
            y: currentPosition.y,
            opacity: 0.5,
            transition: { duration: 0.2 },
        },
    };

    return (
        <motion.div
            ref={packetRef}
            key={packet.id}
            initial={{
                x: currentPosition.x,
                y: currentPosition.y,
            }}
            variants={variants}
            animate={isPlaying ? 'playing' : 'stopped'}
            onAnimationStart={() => setAnimationComplete(false)}
            onAnimationComplete={() => setAnimationComplete(true)}
            style={{
                position: 'absolute',
                zIndex: 1000,
            }}
        >
            {React.cloneElement(packetIcon, {
                color: 'inherit',
                style: {
                    color: packetColor,
                    filter: packet.isFlooded ? 'drop-shadow(0 0 4px #fff)' : undefined,
                },
            })}
        </motion.div>
    );
};

export default PacketEntity;